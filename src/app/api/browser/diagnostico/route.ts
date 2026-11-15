import { existsSync, readFileSync } from "fs";
import path from "path";
import { getDiagPath } from "@/lib/browser/session";

function ultimas(lineas: string[], cantidad: number): string {
  return lineas.slice(-cantidad).join("\n");
}

function leer(ruta: string): string {
  if (!existsSync(ruta)) return "";
  return readFileSync(ruta, "utf8").trimEnd();
}

/**
 * Bitácora del navegador: eventos propios (.data/diagnostico.log) y la
 * salida del servidor (.data/inicio.log), donde con BROWSER_DEBUG=1
 * Playwright deja la línea clave al morir Chromium:
 * «process did exit: exitCode=…, signal=…». SIGKILL = Android lo mató;
 * SIGSEGV/SIGTRAP/SIGABRT = caída nativa del motor.
 * Sin requisito de sesión: app local de un solo usuario.
 */
export async function GET() {
  const diagPath = getDiagPath();
  const inicioPath = path.join(process.cwd(), ".data", "inicio.log");

  const diag = leer(diagPath);
  const inicio = leer(inicioPath);

  if (!diag && !inicio) {
    return new Response("Sin bitácora todavía.", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const partes: string[] = [];
  if (diag) {
    partes.push(
      "=== diagnostico.log (últimos eventos) ===\n" +
        ultimas(diag.split("\n"), 200)
    );
  }
  if (inicio) {
    partes.push(
      "=== inicio.log (salida del servidor / Playwright) ===\n" +
        ultimas(inicio.split("\n"), 120)
    );
  }

  return new Response(partes.join("\n\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
