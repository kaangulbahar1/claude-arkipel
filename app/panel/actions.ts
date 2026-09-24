"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PANEL_COOKIE, panelToken, safeEqual } from "@/lib/panel-auth";

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const password = process.env.PANEL_PASSWORD;
  if (!password) return "Panel şifresi tanımlı değil (PANEL_PASSWORD).";

  const given = String(formData.get("password") ?? "");
  // Kaba kuvvet denemelerini yavaşlatmak için her denemede kısa bir bekleme.
  await new Promise((r) => setTimeout(r, 600));
  if (!safeEqual(panelToken(given), panelToken(password))) return "Şifre yanlış.";

  (await cookies()).set(PANEL_COOKIE, panelToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/panel",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/panel");
}

export async function logout() {
  (await cookies()).delete({ name: PANEL_COOKIE, path: "/panel" });
  redirect("/panel");
}
