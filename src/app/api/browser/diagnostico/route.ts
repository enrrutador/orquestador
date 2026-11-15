import { existsSync, readFileSync } from "fs";
import { getDiagPath } from "@/lib/browser/session";

/**
 * Últimas líneas de la bitácora de diagnóstico del navegador
 * (.data/diagnostico.log), como texto plano para copiar y pegar.
 * Sin requisito de sesión: app local de un solo usuario.
 */
export async function GET() {
  const path = getDiagPath();
  if (!existsSync(path)) {
    return new Response("Sin bitácora todavía.", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const lines = readFileSync(path, "utf8").trimEnd().split("\n");
  return new Response(lines.slice(-200).join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
