import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Submission } from "./validate";

export type StoredResponse = {
  id: string;
  created_at: string;
  version: string;
  answers: Submission["answers"];
  other: Submission["other"];
  duration_sec: number;
  source: string | null;
};

export const LOCAL_FILE = path.join(process.cwd(), "data", "responses.jsonl");

// Aynı IP'den bir saatte kabul edilen en fazla gönderim.
export const HOURLY_LIMIT = 5;

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// IP adresini saklamıyoruz; tuzlanmış hash'i sadece gönderim sınırı için kullanılıyor.
export function hashIp(ip: string | null): string | null {
  const salt = process.env.IP_HASH_SALT;
  if (!ip || !salt) return null;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export async function isRateLimited(ipHash: string | null): Promise<boolean> {
  const db = supabase();
  if (!db || !ipHash) return false;
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count, error } = await db
    .from("survey_responses")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (error) {
    console.error("Gönderim sınırı kontrol edilemedi:", error.message);
    return false;
  }
  return (count ?? 0) >= HOURLY_LIMIT;
}

// Supabase ayarlıysa oraya, değilse (sadece geliştirmede) data/responses.jsonl dosyasına yazar.
export async function saveSubmission(s: Submission, ipHash: string | null = null): Promise<void> {
  const row: StoredResponse = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    version: s.version,
    answers: s.answers,
    other: s.other,
    duration_sec: s.meta.durationSec,
    source: s.meta.source ?? null,
  };
  const contact = s.contact.email
    ? {
        response_id: row.id,
        email: s.contact.email.trim().toLowerCase(),
        beta: s.contact.beta,
        interview: s.contact.interview,
        consent_at: row.created_at,
      }
    : null;

  const db = supabase();
  if (db) {
    const { error } = await db.from("survey_responses").insert({ ...row, ip_hash: ipHash });
    if (error) throw new Error(`survey_responses: ${error.message}`);
    if (contact) {
      const { error: e2 } = await db.from("survey_contacts").insert(contact);
      if (e2) throw new Error(`survey_contacts: ${e2.message}`);
    }
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanımlı değil.");
  }
  await mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await appendFile(LOCAL_FILE, JSON.stringify({ ...row, contact }) + "\n", "utf8");
}

// Bütün cevapları (e-postalar hariç) eskiden yeniye okur.
export async function loadResponses(file?: string): Promise<StoredResponse[]> {
  const db = file ? null : supabase();
  if (db) {
    const rows: StoredResponse[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db
        .from("survey_responses")
        .select("id, created_at, version, answers, other, duration_sec, source")
        .order("created_at")
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      rows.push(...(data as StoredResponse[]));
      if (!data || data.length < 1000) break;
    }
    return rows;
  }
  let text: string;
  try {
    // Dosyadan okuma sadece geliştirmede ve analiz scriptinde kullanılır.
    text = await readFile(/*turbopackIgnore: true*/ file ?? LOCAL_FILE, "utf8");
  } catch (err) {
    if (!file && (err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => {
      const { contact: _contact, ...row } = JSON.parse(l);
      return row as StoredResponse;
    });
}
