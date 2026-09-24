// Anket cevaplarından yapılandırılmış bir rapor üretir.
// scripts/analyze.ts bunu Markdown'a, /panel sayfası HTML'e çevirir.

import { allQuestions, featureLevels, features, type Question, scenarios, SURVEY_VERSION } from "./survey";
import type { StoredResponse } from "./store";
import { OTHER } from "./validate";

export type Row = Pick<StoredResponse, "id" | "created_at" | "version" | "answers" | "other" | "duration_sec" | "source">;

export type ScaleStat = { mean: number; n: number; dist: number[] };
export type Segment = {
  name: string;
  n: number;
  share: number;
  kaybolma: number;
  izlenim: number;
  odeme4plus: number;
  telefon: number;
};
export type FeatureStat = { id: string; label: string; n: number; sart: number; gereksiz: number; score: number };
export type Distribution = { id: string; title: string; rows: { label: string; n: number; share: number }[] };
export type OpenAnswer = {
  id: string;
  created_at: string;
  tag: string;
  core: boolean;
  scenarios: string[];
  texts: { title: string; text: string }[];
};

export type HypothesisStatus = "tutuyor" | "tutmuyor" | "veri-az";
export type Hypothesis = { id: string; claim: string; measure: string; target: string; value: string; status: HypothesisStatus };

export type Report = {
  n: number;
  currentVersion: string;
  versions: { version: string; n: number }[];
  firstAt: string | null;
  lastAt: string | null;
  medianMinutes: number;
  daily: { date: string; n: number }[];
  kaybolma: ScaleStat;
  izlenim: ScaleStat;
  core: { n: number; share: number };
  segments: { core: Segment[]; scenarios: Segment[]; roles: Segment[] };
  features: { all: FeatureStat[]; core: FeatureStat[] };
  distributions: Distribution[];
  sources: { label: string; n: number }[];
  hypotheses: Hypothesis[];
};

// Hipotez eşikleri docs/arastirma-plani.md ile aynı tutulmalı.
export const MIN_TOTAL = 30;
export const MIN_CORE = 10;

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const ratio = (n: number, d: number) => (d ? n / d : NaN);
const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export const question = (id: string) => allQuestions.find((x) => x.id === id);

export function labelOf(q: Question | undefined, id: string) {
  if (id === OTHER) return "Diğer";
  if (q && (q.kind === "single" || q.kind === "multi")) return q.options.find((o) => o.id === id)?.label ?? id;
  return id;
}

export const values = (r: Row, id: string): string[] => {
  const v = r.answers[id];
  return Array.isArray(v) ? (v as string[]) : typeof v === "string" && v ? [v] : [];
};
export const num = (r: Row, id: string) => (typeof r.answers[id] === "number" ? (r.answers[id] as number) : NaN);
const nums = (rows: Row[], id: string) => rows.map((r) => num(r, id)).filter((x) => !Number.isNaN(x));

// Çekirdek hedef kitle hipotezi: derin notları olan ve sık kaybolanlar.
export const isCore = (r: Row) => num(r, "kaybolma") >= 4 && ["3-4", "5+"].includes(values(r, "derinlik")[0]);

function scale(rows: Row[], id: string): ScaleStat {
  const xs = nums(rows, id);
  return { mean: avg(xs), n: xs.length, dist: [1, 2, 3, 4, 5].map((k) => xs.filter((x) => x === k).length) };
}

function segment(name: string, rows: Row[], total: number): Segment {
  return {
    name,
    n: rows.length,
    share: ratio(rows.length, total),
    kaybolma: avg(nums(rows, "kaybolma")),
    izlenim: avg(nums(rows, "ilk-izlenim")),
    odeme4plus: ratio(rows.filter((r) => ["4-7", "8+"].includes(values(r, "odeme")[0])).length, rows.length),
    telefon: ratio(rows.filter((r) => values(r, "cihazlar").includes("telefon")).length, rows.length),
  };
}

function featureStats(rows: Row[]): FeatureStat[] {
  const weight: Record<string, number> = { sart: 2, iyi: 1, gereksiz: 0 };
  return features
    .map((f) => {
      const picks = rows
        .map((r) => (r.answers.ozellikler as Record<string, string> | undefined)?.[f.id])
        .filter((p): p is string => featureLevels.some((l) => l.id === p));
      return {
        id: f.id,
        label: f.label,
        n: picks.length,
        sart: ratio(picks.filter((p) => p === "sart").length, picks.length),
        gereksiz: ratio(picks.filter((p) => p === "gereksiz").length, picks.length),
        score: avg(picks.map((p) => weight[p])),
      };
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

function distribution(rows: Row[], q: Question): Distribution {
  const counts = new Map<string, number>();
  for (const r of rows) for (const v of values(r, q.id)) counts.set(v, (counts.get(v) ?? 0) + 1);
  return {
    id: q.id,
    title: q.title,
    rows: [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => ({ label: labelOf(q, k), n, share: ratio(n, rows.length) })),
  };
}

function countBy<T>(xs: T[], key: (x: T) => string) {
  const m = new Map<string, number>();
  for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + 1);
  return m;
}

export function buildReport(rows: Row[]): Report {
  const total = rows.length;
  const core = rows.filter(isCore);
  const rolQ = question("rol");
  const roles = rolQ?.kind === "single" ? [...rolQ.options, { id: OTHER, label: "Diğer" }] : [];

  // Günlük cevap sayısı, boş günler dahil.
  const byDay = countBy(rows, (r) => r.created_at.slice(0, 10));
  const daily: { date: string; n: number }[] = [];
  if (total) {
    const start = new Date(rows[0].created_at.slice(0, 10) + "T00:00:00Z");
    const end = new Date(rows[total - 1].created_at.slice(0, 10) + "T00:00:00Z");
    for (let d = start; d <= end; d = new Date(d.getTime() + 86400_000)) {
      const key = d.toISOString().slice(0, 10);
      daily.push({ date: key, n: byDay.get(key) ?? 0 });
    }
  }

  return {
    n: total,
    currentVersion: SURVEY_VERSION,
    versions: [...countBy(rows, (r) => r.version ?? "?").entries()].map(([version, n]) => ({ version, n })),
    firstAt: rows[0]?.created_at ?? null,
    lastAt: rows[total - 1]?.created_at ?? null,
    medianMinutes: median(rows.map((r) => r.duration_sec).filter((x) => typeof x === "number")) / 60,
    daily,
    kaybolma: scale(rows, "kaybolma"),
    izlenim: scale(rows, "ilk-izlenim"),
    core: { n: core.length, share: ratio(core.length, total) },
    segments: {
      core: [
        segment("Çekirdek (derin + kayboluyor)", core, total),
        segment("Diğerleri", rows.filter((r) => !isCore(r)), total),
        segment("Tümü", rows, total),
      ],
      scenarios: scenarios.map((s) => segment(s.label, rows.filter((r) => values(r, "senaryolar").includes(s.id)), total)),
      roles: roles
        .map((o) => segment(o.label, rows.filter((r) => values(r, "rol")[0] === o.id), total))
        .filter((s) => s.n > 0),
    },
    features: { all: featureStats(rows), core: featureStats(core) },
    distributions: allQuestions
      .filter((q) => q.kind === "single" || q.kind === "multi")
      .map((q) => distribution(rows, q)),
    sources: [...countBy(rows, (r) => r.source ?? "(yok)").entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, n]) => ({ label, n })),
    hypotheses: hypotheses(rows, core),
  };
}

function hypotheses(rows: Row[], core: Row[]): Hypothesis[] {
  const f2 = (x: number) => (Number.isNaN(x) ? "–" : x.toFixed(2));
  const p = (x: number) => (Number.isNaN(x) ? "–" : `%${Math.round(x * 100)}`);
  const judge = (enough: boolean, pass: boolean): HypothesisStatus => (!enough ? "veri-az" : pass ? "tutuyor" : "tutmuyor");
  const enough = rows.length >= MIN_TOTAL;
  const coreEnough = enough && core.length >= MIN_CORE;

  const deep = rows.filter((r) => ["3-4", "5+"].includes(values(r, "derinlik")[0]));
  const shallow = rows.filter((r) => ["1", "2"].includes(values(r, "derinlik")[0]));
  const gap = avg(nums(deep, "kaybolma")) - avg(nums(shallow, "kaybolma"));
  const others = rows.filter((r) => !isCore(r));
  const coreImp = avg(nums(core, "ilk-izlenim"));
  const otherImp = avg(nums(others, "ilk-izlenim"));
  const corePay = ratio(core.filter((r) => ["4-7", "8+"].includes(values(r, "odeme")[0])).length, core.length);
  const coreShare = ratio(core.length, rows.length);

  return [
    {
      id: "H1",
      claim: "Derin not yapısı olanlar daha sık kayboluyor",
      measure: "Kaybolma ortalaması farkı (3+ seviye eksi 1–2 seviye)",
      target: "≥ 0.80",
      value: `${f2(gap)} (${deep.length} / ${shallow.length} kişi)`,
      status: judge(enough && deep.length >= MIN_CORE && shallow.length >= MIN_CORE, gap >= 0.8),
    },
    {
      id: "H2",
      claim: "Yeterince büyük bir çekirdek kitle var",
      measure: "Çekirdek segmentin payı",
      target: "≥ %25",
      value: `${p(coreShare)} (${core.length} kişi)`,
      status: judge(enough, coreShare >= 0.25),
    },
    {
      id: "H3",
      claim: "Çekirdek kitle harita fikrini seviyor",
      measure: "Çekirdekte ilk izlenim ortalaması",
      target: "≥ 3.80 ve diğerlerinden yüksek",
      value: `${f2(coreImp)} (diğerleri ${f2(otherImp)})`,
      status: judge(coreEnough, coreImp >= 3.8 && coreImp > otherImp),
    },
    {
      id: "H7",
      claim: "Çekirdek kitle ödemeye istekli",
      measure: "Çekirdekte ayda 4 $ ve üstü diyenler",
      target: "≥ %30",
      value: p(corePay),
      status: judge(coreEnough, corePay >= 0.3),
    },
  ];
}

// Açık uçlu cevaplar ve "Diğer" açıklamaları, en yeniden eskiye.
export function openAnswers(rows: Row[]): OpenAnswer[] {
  const textQs = allQuestions.filter((q) => q.kind === "text");
  return rows
    .map((r) => {
      const texts = textQs
        .map((q) => ({ title: q.title, text: String(r.answers[q.id] ?? "").trim() }))
        .filter((t) => t.text);
      for (const [qid, t] of Object.entries(r.other ?? {})) {
        if (t.trim()) texts.push({ title: `Diğer: ${question(qid)?.title ?? qid}`, text: t.trim() });
      }
      return {
        id: r.id,
        created_at: r.created_at,
        core: isCore(r),
        scenarios: values(r, "senaryolar"),
        tag: `${labelOf(question("rol"), values(r, "rol")[0] ?? "?")} · kaybolma ${num(r, "kaybolma")} · izlenim ${num(r, "ilk-izlenim")}`,
        texts,
      };
    })
    .filter((a) => a.texts.length)
    .reverse();
}
