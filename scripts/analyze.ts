// Anket cevaplarını analiz eder ve rapor/ klasörüne yazar.
//
//   npm run analiz                 # Supabase'den (SUPABASE_* tanımlıysa) ya da data/responses.jsonl'den
//   npm run analiz -- dosya.jsonl  # belirli bir JSONL dosyasından
//
// Çıktılar:
//   rapor/rapor.md       özet tablolar, özellik sıralaması, segmentler
//   rapor/cevaplar.csv   her satır bir katılımcı (tablolama programları için)
//   rapor/acik-uclu.md   açık uçlu cevaplar, senaryoya göre gruplu (nitel kodlama için)
// E-posta adresleri hiçbir çıktıya yazılmaz.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { allQuestions, featureLevels, features, type Question, scenarios, sections } from "../lib/survey";
import { OTHER } from "../lib/validate";
import { LOCAL_FILE, type StoredResponse } from "../lib/store";

type Row = Pick<StoredResponse, "id" | "created_at" | "answers" | "other" | "duration_sec" | "source">;

const OUT = path.join(process.cwd(), "rapor");

async function load(): Promise<Row[]> {
  const file = process.argv[2];
  if (!file && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const rows: Row[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db
        .from("survey_responses")
        .select("id, created_at, answers, other, duration_sec, source")
        .order("created_at")
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      rows.push(...(data as Row[]));
      if (!data || data.length < 1000) break;
    }
    return rows;
  }
  const text = await readFile(file ?? LOCAL_FILE, "utf8");
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Row);
}

// Yardımcılar
const pct = (n: number, d: number) => (d ? `%${Math.round((n / d) * 100)}` : "–");
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const fmt = (x: number) => (Number.isNaN(x) ? "–" : x.toFixed(2));
const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const table = (head: string[], rows: (string | number)[][]) =>
  [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");

const q = (id: string) => allQuestions.find((x) => x.id === id)!;
const labelOf = (question: Question, id: string) => {
  if (id === OTHER) return "Diğer";
  if (question.kind === "single" || question.kind === "multi") return question.options.find((o) => o.id === id)?.label ?? id;
  return id;
};
const values = (r: Row, id: string): string[] => {
  const v = r.answers[id];
  return Array.isArray(v) ? (v as string[]) : typeof v === "string" && v ? [v] : [];
};
const num = (r: Row, id: string) => (typeof r.answers[id] === "number" ? (r.answers[id] as number) : NaN);

// Çekirdek hedef kitle hipotezi: derin notları olan ve sık kaybolanlar.
const isCore = (r: Row) => num(r, "kaybolma") >= 4 && ["3-4", "5+"].includes(values(r, "derinlik")[0]);

function distribution(rows: Row[], id: string) {
  const question = q(id);
  const counts = new Map<string, number>();
  for (const r of rows) for (const v of values(r, id)) counts.set(v, (counts.get(v) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return table(["Seçenek", "Kişi", "Oran"], sorted.map(([k, n]) => [labelOf(question, k), n, pct(n, rows.length)]));
}

function scaleSummary(rows: Row[], id: string) {
  const xs = rows.map((r) => num(r, id)).filter((x) => !Number.isNaN(x));
  const dist = [1, 2, 3, 4, 5].map((n) => xs.filter((x) => x === n).length);
  return `Ortalama **${fmt(mean(xs))}** (n=${xs.length}) · dağılım 1→5: ${dist.join(" / ")}`;
}

function featureRanking(rows: Row[]) {
  const score = { sart: 2, iyi: 1, gereksiz: 0 } as Record<string, number>;
  const ranked = features
    .map((f) => {
      const picks = rows.map((r) => (r.answers.ozellikler as Record<string, string> | undefined)?.[f.id]).filter(Boolean) as string[];
      const count = (lvl: string) => picks.filter((p) => p === lvl).length;
      return {
        f,
        n: picks.length,
        sart: count("sart"),
        gereksiz: count("gereksiz"),
        skor: mean(picks.map((p) => score[p] ?? 0)),
      };
    })
    .sort((a, b) => b.skor - a.skor);
  return table(
    ["Özellik", featureLevels[0].label, featureLevels[2].label, "Skor (0–2)"],
    ranked.map((x) => [x.f.label, pct(x.sart, x.n), pct(x.gereksiz, x.n), fmt(x.skor)]),
  );
}

function segmentTable(rows: Row[], groups: { name: string; rows: Row[] }[]) {
  return table(
    ["Segment", "Kişi", "Kaybolma", "İlk izlenim", "4 $ ve üstü öderim", "Telefonda not"],
    groups.map((g) => [
      g.name,
      `${g.rows.length} (${pct(g.rows.length, rows.length)})`,
      fmt(mean(g.rows.map((r) => num(r, "kaybolma")).filter((x) => !Number.isNaN(x)))),
      fmt(mean(g.rows.map((r) => num(r, "ilk-izlenim")).filter((x) => !Number.isNaN(x)))),
      pct(g.rows.filter((r) => ["4-7", "8+"].includes(values(r, "odeme")[0])).length, g.rows.length),
      pct(g.rows.filter((r) => values(r, "cihazlar").includes("telefon")).length, g.rows.length),
    ]),
  );
}

function report(rows: Row[]) {
  const core = rows.filter(isCore);
  const rest = rows.filter((r) => !isCore(r));
  const durations = rows.map((r) => r.duration_sec).filter((x): x is number => typeof x === "number");
  const sources = new Map<string, number>();
  for (const r of rows) sources.set(r.source ?? "(yok)", (sources.get(r.source ?? "(yok)") ?? 0) + 1);

  const out: string[] = [];
  out.push(`# Arkipel anket raporu`, ``);
  out.push(`Oluşturulma: ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · **${rows.length} cevap**`);
  if (rows.length) {
    out.push(`İlk cevap ${rows[0].created_at.slice(0, 10)}, son cevap ${rows[rows.length - 1].created_at.slice(0, 10)} · medyan süre ${Math.round(median(durations) / 60)} dk`);
  }
  if (rows.length < 30) out.push(``, `> Uyarı: ${rows.length} cevap az. Oranları yön gösterici oku, kesin sonuç çıkarma.`);

  out.push(``, `## Öne çıkanlar`, ``);
  out.push(`- Kaybolma: ${scaleSummary(rows, "kaybolma")}`);
  out.push(`- İlk izlenim: ${scaleSummary(rows, "ilk-izlenim")}`);
  out.push(`- Çekirdek hedef kitle (3+ seviye derinlik ve kaybolma 4–5): **${core.length} kişi, ${pct(core.length, rows.length)}**`);

  out.push(``, `## Segmentler`, ``);
  out.push(segmentTable(rows, [
    { name: "Çekirdek (derin + kayboluyor)", rows: core },
    { name: "Diğerleri", rows: rest },
    { name: "Tümü", rows },
  ]));
  out.push(``, `### Senaryolara göre`, ``);
  out.push(segmentTable(rows, scenarios.map((s) => ({ name: s.label, rows: rows.filter((r) => values(r, "senaryolar").includes(s.id)) }))));
  out.push(``, `### Rollere göre`, ``);
  const rol = q("rol");
  const roles = rol.kind === "single" ? [...rol.options, { id: OTHER, label: "Diğer" }] : [];
  out.push(segmentTable(rows, roles.map((o) => ({ name: o.label, rows: rows.filter((r) => values(r, "rol")[0] === o.id) })).filter((g) => g.rows.length)));

  out.push(``, `## Özellik öncelikleri`, ``, `Tüm katılımcılar:`, ``, featureRanking(rows));
  if (core.length) out.push(``, `Çekirdek hedef kitle:`, ``, featureRanking(core));

  out.push(``, `## Soru bazında dağılımlar`);
  for (const s of sections) {
    for (const question of s.questions) {
      if (question.kind !== "single" && question.kind !== "multi") continue;
      out.push(``, `### ${question.title}`, ``, distribution(rows, question.id));
    }
  }

  out.push(``, `## Kaynaklar`, ``);
  out.push(table(["?kaynak=", "Kişi"], [...sources.entries()].sort((a, b) => b[1] - a[1])));
  return out.join("\n") + "\n";
}

function openEnded(rows: Row[]) {
  const textQs = allQuestions.filter((x) => x.kind === "text");
  const out: string[] = [`# Açık uçlu cevaplar`, ``, `Senaryoya göre gruplu. Bir kişi 2 senaryo seçtiyse iki grupta da görünür.`];
  const groups = [...scenarios, { id: "", label: "Senaryo seçmeyenler" }];
  for (const g of groups) {
    const members = rows.filter((r) => (g.id ? values(r, "senaryolar").includes(g.id) : values(r, "senaryolar").length === 0));
    if (!members.length) continue;
    out.push(``, `## ${g.label} (${members.length} kişi)`);
    for (const r of members) {
      const texts = textQs
        .map((tq) => [tq.title, (r.answers[tq.id] as string | undefined)?.trim()] as const)
        .filter(([, t]) => t);
      const others = Object.entries(r.other ?? {}).filter(([, t]) => t.trim());
      if (!texts.length && !others.length) continue;
      const tag = `${labelOf(q("rol"), values(r, "rol")[0] ?? "?")} · kaybolma ${num(r, "kaybolma")} · izlenim ${num(r, "ilk-izlenim")}${isCore(r) ? " · ÇEKİRDEK" : ""}`;
      out.push(``, `### ${r.id.slice(0, 8)} — ${tag}`);
      for (const [title, t] of texts) out.push(``, `**${title}**`, ``, `> ${t!.replace(/\n+/g, "\n> ")}`);
      for (const [qid, t] of others) out.push(``, `*Diğer (${q(qid)?.title ?? qid}):* ${t}`);
    }
  }
  return out.join("\n") + "\n";
}

function csv(rows: Row[]) {
  const cols: { head: string; get: (r: Row) => string }[] = [
    { head: "id", get: (r) => r.id },
    { head: "tarih", get: (r) => r.created_at },
    { head: "sure_sn", get: (r) => String(r.duration_sec ?? "") },
    { head: "kaynak", get: (r) => r.source ?? "" },
    { head: "cekirdek", get: (r) => (isCore(r) ? "1" : "0") },
  ];
  for (const question of allQuestions) {
    if (question.kind === "matrix") {
      for (const row of question.rows) {
        cols.push({ head: `${question.id}.${row.id}`, get: (r) => (r.answers[question.id] as Record<string, string> | undefined)?.[row.id] ?? "" });
      }
    } else if (question.kind === "multi") {
      for (const o of [...question.options, ...(question.other ? [{ id: OTHER }] : [])]) {
        cols.push({ head: `${question.id}.${o.id}`, get: (r) => (values(r, question.id).includes(o.id) ? "1" : "0") });
      }
    } else {
      cols.push({ head: question.id, get: (r) => String(r.answers[question.id] ?? "") });
    }
    if ("other" in question && question.other) cols.push({ head: `${question.id}.diger_metin`, get: (r) => r.other?.[question.id] ?? "" });
  }
  const esc = (s: string) => (/[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  return [cols.map((c) => c.head).join(","), ...rows.map((r) => cols.map((c) => esc(c.get(r))).join(","))].join("\n") + "\n";
}

async function main() {
  const rows = await load();
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, "rapor.md"), report(rows));
  await writeFile(path.join(OUT, "acik-uclu.md"), openEnded(rows));
  await writeFile(path.join(OUT, "cevaplar.csv"), "﻿" + csv(rows));
  console.log(`${rows.length} cevap analiz edildi → ${path.relative(process.cwd(), OUT)}/`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
