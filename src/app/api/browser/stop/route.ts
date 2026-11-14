import { NextResponse } from "next/server";
import { stopBrowser } from "@/lib/browser/session";

export async function POST() {
  try {
    await stopBrowser();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API /browser/stop]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cerrar el navegador" },
      { status: 500 }
    );
  }
}
