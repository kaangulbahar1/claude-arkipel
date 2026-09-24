import { NextResponse } from "next/server";
import { validateSubmission } from "@/lib/validate";
import { hashIp, isRateLimited, saveSubmission } from "@/lib/store";

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Gönderilen veri okunamadı." }, { status: 400 });
  }

  const result = validateSubmission(body);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, stale: result.stale, fields: result.fields },
      { status: result.stale ? 409 : 400 },
    );
  }
  // Gizli alanı dolduran botlara başarılı görünüp hiçbir şey kaydetmiyoruz.
  if (result.data.website) return NextResponse.json({ ok: true });

  const ipHash = hashIp(clientIp(req));
  if (await isRateLimited(ipHash)) {
    return NextResponse.json(
      { error: "Bu bağlantıdan kısa sürede çok fazla cevap geldi. Bir saat sonra tekrar deneyebilirsin." },
      { status: 429 },
    );
  }

  try {
    await saveSubmission(result.data, ipHash);
  } catch (err) {
    console.error("Anket kaydedilemedi:", err);
    return NextResponse.json(
      { error: "Cevabın şu an kaydedilemedi. Birkaç dakika sonra tekrar dener misin?" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
