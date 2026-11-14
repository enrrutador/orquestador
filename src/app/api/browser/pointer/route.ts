import { NextResponse } from "next/server";
import { browserPointer, isBrowserRunning } from "@/lib/browser/session";

const ACTIONS = ["down", "move", "up"] as const;

export async function POST(req: Request) {
  if (!isBrowserRunning()) {
    return NextResponse.json({ error: "El navegador no está abierto" }, { status: 409 });
  }
  const body = await req.json().catch(() => null);
  const action = body?.action as string;
  const fx = Number(body?.fx);
  const fy = Number(body?.fy);
  if (!ACTIONS.includes(action as (typeof ACTIONS)[number])) {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }
  if (!Number.isFinite(fx) || !Number.isFinite(fy) || fx < 0 || fx > 1 || fy < 0 || fy > 1) {
    return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });
  }
  await browserPointer(action as (typeof ACTIONS)[number], fx, fy);
  return NextResponse.json({ ok: true });
}
