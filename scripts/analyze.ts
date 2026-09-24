// Anket cevaplarını analiz eder ve rapor/ klasörüne yazar.
//
//   npm run analiz                          # Supabase'den (SUPABASE_* tanımlıysa) ya da data/responses.jsonl'den
//   npm run analiz -- dosya.jsonl           # belirli bir JSONL dosyasından
//   npm run analiz -- --surum=2026-09-v1    # sadece bir anket sürümünün cevapları
//
// Çıktılar:
//   rapor/rapor.md       özet tablolar, özellik sıralaması, segmentler
//   rapor/cevaplar.csv   her satır bir katılımcı (tablolama programları için)
//   rapor/acik-uclu.md   açık uçlu cevaplar, senaryoya göre gruplu (nitel kodlama için)
// E-posta adresleri hiçbir çıktıya yazılmaz.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildReport, type FeatureStat, isCore, openAnswers, type Report, type Row, type Segment, values,
} from "../lib/analysis";
import { allQuestions, featureLevels, scenarios } from "../lib/survey";
import { OTHER } from "../lib/validate";
import { loadResponses } from "../lib/store";

const OUT = path.join(process.cwd(), "rapor");

const pct = (x: number) => (Number.isNaN(x) ? "–" : `%${Math.round(x * 100)}`);
const fmt = (x: number) => (Number.isNaN(x) ? "–" : x.toFixed(2));
const table = (head: string[], rows: (string | number)[][]) =>
  [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");

const segmentTable = (segs: Segment[]) =>
  table(
    ["Segment", "Kişi", "Kaybolma", "İlk izlenim", "4 $ ve üstü öderim", "Telefonda not"],
    segs.map((s) => [s.name, `${s.n} (${pct(s.share)})`, fmt(s.kaybolma), fmt(s.izlenim), pct(s.odeme4plus), pct(s.telefon)]),
  );

const featureTable = (fs: FeatureStat[]) =>
  table(
    ["Özellik", featureLevels[0].label, featureLevels[2].label, "Skor (0–2)"],
    fs.map((f) => [f.label, pct(f.sart), pct(f.gereksiz), fmt(f.score)]),
  );

function markdown(r: Report, filter: string | null) {
  const out: string[] = [`# Arkipel anket raporu`, ``];
  out.push(`Oluşturulma: ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · **${r.n} cevap**`);
  out.push(`Sürümler: ${r.versions.map((v) => `${v.version} (${v.n})`).join(", ") || "–"}${filter ? ` · filtre: ${filter}` : ""}`);
  if (r.firstAt && r.lastAt) {
    out.push(`İlk cevap ${r.firstAt.slice(0, 10)}, son cevap ${r.lastAt.slice(0, 10)} · medyan süre ${Math.round(r.medianMinutes)} dk`);
  }
  if (r.n < 30) out.push(``, `> Uyarı: ${r.n} cevap az. Oranları yön gösterici oku, kesin sonuç çıkarma.`);

  out.push(``, `## Öne çıkanlar`, ``);
  out.push(`- Kaybolma: ortalama **${fmt(r.kaybolma.mean)}** (n=${r.kaybolma.n}) · dağılım 1→5: ${r.kaybolma.dist.join(" / ")}`);
  out.push(`- İlk izlenim: ortalama **${fmt(r.izlenim.mean)}** (n=${r.izlenim.n}) · dağılım 1→5: ${r.izlenim.dist.join(" / ")}`);
  out.push(`- Çekirdek hedef kitle (3+ seviye derinlik ve kaybolma 4–5): **${r.core.n} kişi, ${pct(r.core.share)}**`);

  const statusText = { tutuyor: "Tutuyor", tutmuyor: "Tutmuyor", "veri-az": "Veri az" } as const;
  out.push(``, `## Hipotezler`, ``);
  out.push(table(["", "Hipotez", "Ölçüm", "Hedef", "Değer", "Durum"],
    r.hypotheses.map((h) => [h.id, h.claim, h.measure, h.target, h.value, statusText[h.status]])));

  out.push(``, `## Segmentler`, ``, segmentTable(r.segments.core));
  out.push(``, `### Senaryolara göre`, ``, segmentTable(r.segments.scenarios));
  out.push(``, `### Rollere göre`, ``, segmentTable(r.segments.roles));

  out.push(``, `## Özellik öncelikleri`, ``, `Tüm katılımcılar:`, ``, featureTable(r.features.all));
  if (r.core.n) out.push(``, `Çekirdek hedef kitle:`, ``, featureTable(r.features.core));

  out.push(``, `## Soru bazında dağılımlar`);
  for (const d of r.distributions) {
    out.push(``, `### ${d.title}`, ``, table(["Seçenek", "Kişi", "Oran"], d.rows.map((x) => [x.label, x.n, pct(x.share)])));
  }
  out.push(``, `## Kaynaklar`, ``, table(["?kaynak=", "Kişi"], r.sources.map((s) => [s.label, s.n])));
  return out.join("\n") + "\n";
}

function openEndedMarkdown(rows: Row[]) {
  const answers = openAnswers(rows).reverse();
  const out: string[] = [`# Açık uçlu cevaplar`, ``, `Senaryoya göre gruplu. Bir kişi 2 senaryo seçtiyse iki grupta da görünür.`];
  const groups = [...scenarios, { id: "", label: "Senaryo seçmeyenler" }];
  for (const g of groups) {
    const members = answers.filter((a) => (g.id ? a.scenarios.includes(g.id) : a.scenarios.length === 0));
    if (!members.length) continue;
    out.push(``, `## ${g.label} (${members.length} kişi)`);
    for (const a of members) {
      out.push(``, `### ${a.id.slice(0, 8)} — ${a.tag}${a.core ? " · ÇEKİRDEK" : ""}`);
      for (const t of a.texts) out.push(``, `**${t.title}**`, ``, `> ${t.text.replace(/\n+/g, "\n> ")}`);
    }
  }
  return out.join("\n") + "\n";
}

function csv(rows: Row[]) {
  const cols: { head: string; get: (r: Row) => string }[] = [
    { head: "id", get: (r) => r.id },
    { head: "tarih", get: (r) => r.created_at },
    { head: "surum", get: (r) => r.version ?? "" },
    { head: "sure_sn", get: (r) => String(r.duration_sec ?? "") },
    { head: "kaynak", get: (r) => r.source ?? "" },
    { head: "cekirdek", get: (r) => (isCore(r) ? "1" : "0") },
  ];
  for (const q of allQuestions) {
    if (q.kind === "matrix") {
      for (const row of q.rows) {
        cols.push({ head: `${q.id}.${row.id}`, get: (r) => (r.answers[q.id] as Record<string, string> | undefined)?.[row.id] ?? "" });
      }
    } else if (q.kind === "multi") {
      for (const o of [...q.options, ...(q.other ? [{ id: OTHER }] : [])]) {
        cols.push({ head: `${q.id}.${o.id}`, get: (r) => (values(r, q.id).includes(o.id) ? "1" : "0") });
      }
    } else {
      cols.push({ head: q.id, get: (r) => String(r.answers[q.id] ?? "") });
    }
    if ("other" in q && q.other) cols.push({ head: `${q.id}.diger_metin`, get: (r) => r.other?.[q.id] ?? "" });
  }
  const esc = (s: string) => (/[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  return [cols.map((c) => c.head).join(","), ...rows.map((r) => cols.map((c) => esc(c.get(r))).join(","))].join("\n") + "\n";
}

async function main() {
  const args = process.argv.slice(2);
  const version = args.find((a) => a.startsWith("--surum="))?.slice("--surum=".length) ?? null;
  const file = args.find((a) => !a.startsWith("--"));

  let rows: Row[] = await loadResponses(file);
  if (version) rows = rows.filter((r) => r.version === version);

  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, "rapor.md"), markdown(buildReport(rows), version));
  await writeFile(path.join(OUT, "acik-uclu.md"), openEndedMarkdown(rows));
  await writeFile(path.join(OUT, "cevaplar.csv"), "﻿" + csv(rows));
  console.log(`${rows.length} cevap analiz edildi → ${path.relative(process.cwd(), OUT)}/`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
