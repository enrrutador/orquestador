import { NextResponse } from "next/server";
import { browserKey, isBrowserRunning } from "@/lib/browser/session";

const ALLOWED = ["Enter", "Backspace", "Tab", "Escape", "ArrowDown", "ArrowUp"];

export async function POST(req: Request) {
  if (!isBrowserRunning()) {
    return NextResponse.json({ error: "El navegador no está abierto" }, { status: 409 });
  }
  const body = await req.json().catch(() => null);
  const key = typeof body?.key === "string" ? body.key : "";
  if (!ALLOWED.includes(key)) {
    return NextResponse.json({ error: "Tecla no permitida" }, { status: 400 });
  }
  await browserKey(key);
  return NextResponse.json({ ok: true });
}
