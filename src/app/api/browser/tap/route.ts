import { NextResponse } from "next/server";
import { browserTap, isBrowserRunning } from "@/lib/browser/session";

export async function POST(req: Request) {
  if (!isBrowserRunning()) {
    return NextResponse.json({ error: "El navegador no está abierto" }, { status: 409 });
  }
  const body = await req.json().catch(() => null);
  const fx = Number(body?.fx);
  const fy = Number(body?.fy);
  if (!Number.isFinite(fx) || !Number.isFinite(fy) || fx < 0 || fx > 1 || fy < 0 || fy > 1) {
    return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });
  }
  await browserTap(fx, fy);
  return NextResponse.json({ ok: true });
}
