import { NextResponse } from "next/server";
import { startBrowser } from "@/lib/browser/session";

export async function POST() {
  try {
    const status = await startBrowser();
    return NextResponse.json(status);
  } catch (error) {
    console.error("[API /browser/start]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo abrir el navegador" },
      { status: 500 }
    );
  }
}
