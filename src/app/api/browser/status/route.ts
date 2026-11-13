import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getBrowserStatus } from "@/lib/browser/session";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "No autenticado. Conectá tu cuenta de Facebook." },
        { status: 401 }
      );
    }

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
