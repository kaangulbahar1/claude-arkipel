import { NextResponse } from "next/server";
import { validateSubmission } from "@/lib/validate";
import { saveSubmission } from "@/lib/store";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Gönderilen veri okunamadı." }, { status: 400 });
  }

  const result = validateSubmission(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, fields: result.fields }, { status: 400 });
  }
  // Gizli alanı dolduran botlara başarılı görünüp hiçbir şey kaydetmiyoruz.
  if (result.data.website) return NextResponse.json({ ok: true });

  try {
    await saveSubmission(result.data);
  } catch (err) {
    console.error("Anket kaydedilemedi:", err);
    return NextResponse.json(
      { error: "Cevabın şu an kaydedilemedi. Birkaç dakika sonra tekrar dener misin?" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
