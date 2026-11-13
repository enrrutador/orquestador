import { NextResponse } from "next/server";
import { getBrowserStatus } from "@/lib/browser/session";

export async function GET() {
  try {
    // Sin requisito de sesión: es una app local de un solo usuario y el
    // estado del navegador del dispositivo no depende del login OAuth.
    const status = await getBrowserStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("[API /browser/status]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al consultar el estado del navegador",
      },
      { status: 500 }
    );
  }
}
