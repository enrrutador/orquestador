import { NextResponse } from "next/server";
import { browserScreenshot } from "@/lib/browser/session";

export async function GET() {
  const png = await browserScreenshot().catch(() => null);
  if (!png) {
    return NextResponse.json(
      { error: "El navegador no está abierto" },
      { status: 409 }
    );
  }
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "no-store",
    },
  });
}
