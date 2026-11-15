import { NextResponse } from "next/server";
import { browserGoto } from "@/lib/browser/session";

const HOSTS = ["facebook.com", "www.facebook.com", "m.facebook.com", "mbasic.facebook.com"];

export async function POST(request: Request) {
  let url: string;
  try {
    const body = await request.json();
    url = String(body.url || "");
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  if (
    parsed.protocol !== "https:" ||
    !HOSTS.includes(parsed.hostname.toLowerCase())
  ) {
    return NextResponse.json(
      { error: "Solo se permite navegar a Facebook" },
      { status: 400 }
    );
  }

  const ok = await browserGoto(parsed.toString());
  if (!ok) {
    return NextResponse.json(
      { error: "El navegador no está abierto o la página se está recuperando" },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true, url: parsed.toString() });
}
