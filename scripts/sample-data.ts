// Analiz scriptini denemek için rastgele, SAHTE cevaplar üretir.
// Gerçek veriyle karışmasın diye ayrı bir dosyaya yazar: data/ornek.jsonl
//   npx tsx scripts/sample-data.ts 80 && npm run analiz -- data/ornek.jsonl

import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { allQuestions, SURVEY_VERSION } from "../lib/survey";

const n = Number(process.argv[2] ?? 60);
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

const rows = Array.from({ length: n }, (_, i) => {
  const answers: Record<string, unknown> = {};
  for (const q of allQuestions) {
    if (q.kind === "single") answers[q.id] = pick(q.options).id;
    if (q.kind === "multi") {
      const k = 1 + Math.floor(Math.random() * (q.max ?? 3));
      answers[q.id] = [...q.options].sort(() => Math.random() - 0.5).slice(0, k).map((o) => o.id);
    }
    if (q.kind === "scale") answers[q.id] = 1 + Math.floor(Math.random() * 5);
    if (q.kind === "matrix") answers[q.id] = Object.fromEntries(q.rows.map((r) => [r.id, pick(q.levels).id]));
    if (q.kind === "text" && Math.random() < 0.4) answers[q.id] = `Örnek cevap ${i + 1}`;
  }
  return {
    id: randomUUID(),
    created_at: new Date(Date.now() - (n - i) * 3600_000).toISOString(),
    version: SURVEY_VERSION,
    answers,
    other: {},
    duration_sec: 180 + Math.floor(Math.random() * 400),
    source: pick(["twitter", "linkedin", "eksi", null]),
  };
});

mkdir("data", { recursive: true })
  .then(() => writeFile("data/ornek.jsonl", rows.map((r) => JSON.stringify(r)).join("\n") + "\n"))
  .then(() => console.log(`${n} sahte cevap → data/ornek.jsonl`));
