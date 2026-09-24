import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
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

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Supabase ayarlıysa oraya, değilse (sadece geliştirmede) data/responses.jsonl dosyasına yazar.
export async function saveSubmission(s: Submission): Promise<void> {
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
    const { error } = await db.from("survey_responses").insert(row);
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
