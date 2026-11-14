import { NextResponse } from "next/server";
import { browserType, isBrowserRunning } from "@/lib/browser/session";

export async function POST(req: Request) {
  if (!isBrowserRunning()) {
    return NextResponse.json({ error: "El navegador no está abierto" }, { status: 409 });
  }
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text : "";
  if (!text || text.length > 2000) {
    return NextResponse.json({ error: "Texto inválido" }, { status: 400 });
  }
  await browserType(text);
  return NextResponse.json({ ok: true });
}
