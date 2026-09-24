import { z } from "zod";
import { allQuestions, type Answers, type Question, SURVEY_VERSION } from "./survey";

export const OTHER = "diger";
const MAX_TEXT = 2000;

// Tek bir sorunun cevabını kontrol eder; hata varsa kullanıcıya gösterilecek mesajı döner.
export function checkAnswer(q: Question, value: unknown, other?: string): string | null {
  const empty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);
  if (empty) return q.optional ? null : "Bu soruyu cevaplaman gerekiyor.";

  switch (q.kind) {
    case "single": {
      if (typeof value !== "string") return "Geçersiz cevap.";
      const ok = q.options.some((o) => o.id === value) || (q.other && value === OTHER);
      if (!ok) return "Geçersiz cevap.";
      if (value === OTHER && !other?.trim()) return "Lütfen \"Diğer\" alanını doldur.";
      return null;
    }
    case "multi": {
      if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) return "Geçersiz cevap.";
      if (new Set(value).size !== value.length) return "Geçersiz cevap.";
      const valid = value.every((v) => q.options.some((o) => o.id === v) || (q.other && v === OTHER));
      if (!valid) return "Geçersiz cevap.";
      if (q.max && value.length > q.max) return `En fazla ${q.max} seçim yapabilirsin.`;
      if (value.includes(OTHER) && !other?.trim()) return "Lütfen \"Diğer\" alanını doldur.";
      return null;
    }
    case "scale":
      return Number.isInteger(value) && (value as number) >= q.min && (value as number) <= q.max
        ? null
        : "Geçersiz cevap.";
    case "text":
      if (typeof value !== "string") return "Geçersiz cevap.";
      return value.length > MAX_TEXT ? `En fazla ${MAX_TEXT} karakter yazabilirsin.` : null;
    case "matrix": {
      if (typeof value !== "object" || Array.isArray(value)) return "Geçersiz cevap.";
      const v = value as Record<string, unknown>;
      const missing = q.rows.filter((r) => !q.levels.some((l) => l.id === v[r.id]));
      return missing.length ? "Lütfen her satır için bir seçim yap." : null;
    }
  }
}

export function checkAll(answers: Answers, other: Record<string, string>, questions = allQuestions) {
  const errors: Record<string, string> = {};
  for (const q of questions) {
    const err = checkAnswer(q, answers[q.id], other[q.id]);
    if (err) errors[q.id] = err;
  }
  return errors;
}

export const submissionSchema = z.object({
  version: z.literal(SURVEY_VERSION),
  answers: z.record(z.string(), z.unknown()),
  other: z.record(z.string(), z.string().max(300)),
  contact: z.object({
    email: z.union([z.literal(""), z.email().max(200)]),
    beta: z.boolean(),
    interview: z.boolean(),
    consent: z.boolean(),
  }),
  meta: z.object({
    durationSec: z.number().int().min(0).max(24 * 3600),
    source: z.string().max(100).optional(),
  }),
  // Botları yakalamak için gizli alan; insanlar boş bırakır.
  website: z.string().max(0).optional(),
});

export type Submission = z.infer<typeof submissionSchema>;

export function validateSubmission(input: unknown):
  | { ok: true; data: Submission }
  | { ok: false; error: string; fields?: Record<string, string> } {
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Gönderilen veri okunamadı." };
  const data = parsed.data;

  const known = new Set(allQuestions.map((q) => q.id));
  if (Object.keys(data.answers).some((k) => !known.has(k))) {
    return { ok: false, error: "Bilinmeyen bir soru gönderildi." };
  }
  const fields = checkAll(data.answers, data.other);
  if (Object.keys(fields).length) return { ok: false, error: "Bazı cevaplar eksik.", fields };

  const c = data.contact;
  if (c.email && !c.consent) {
    return { ok: false, error: "E-postanı saklamamız için onay kutusunu işaretlemen gerekiyor." };
  }
  if ((c.beta || c.interview) && !c.email) {
    return { ok: false, error: "Sana ulaşabilmemiz için e-posta adresini yazman gerekiyor." };
  }
  return { ok: true, data };
}
