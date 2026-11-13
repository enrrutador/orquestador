import { NextResponse } from "next/server";
import { isOAuthConfigured } from "@/lib/auth";

/**
 * Configuración pública mínima para la interfaz: solo dice si el login
 * OAuth está disponible en este dispositivo. No expone ningún secreto.
 */
export async function GET() {
  return NextResponse.json({ oauthConfigured: isOAuthConfigured() });
}
