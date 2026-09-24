import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";

export const PANEL_COOKIE = "arkipel_panel";

// Çerezde şifrenin kendisi değil, ondan türetilen bir imza tutulur.
export function panelToken(password: string) {
  return createHmac("sha256", password).update("arkipel-panel-v1").digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export type PanelAccess = "ok" | "login" | "disabled";

export async function panelAccess(): Promise<PanelAccess> {
  // Şifre ortam değişkeni derlemeden sonra eklenebilir; sayfa hiçbir zaman önceden oluşturulmamalı.
  await connection();
  const password = process.env.PANEL_PASSWORD;
  if (!password) return process.env.NODE_ENV === "production" ? "disabled" : "ok";
  const cookie = (await cookies()).get(PANEL_COOKIE)?.value;
  return cookie && safeEqual(cookie, panelToken(password)) ? "ok" : "login";
}
