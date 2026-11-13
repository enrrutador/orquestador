import type { ToolDefinition } from "../types";
import { getManagedPages } from "@/lib/facebook";
import { getBrowserStatus } from "@/lib/browser/session";

/**
 * Registro de herramientas del Orquestador.
 *
 * Cada herramienta tiene su definición (para el LLM) y su ejecutor real.
 * El LLM nunca toca nada directamente: decide, y el ejecutor actúa.
 */

export interface ToolContext {
  /** Token de usuario de Facebook de la sesión (solo servidor). */
  accessToken?: string;
}

export interface RegisteredTool {
  definition: ToolDefinition;
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<string>;
}

const tools = new Map<string, RegisteredTool>();

export function registerTool(tool: RegisteredTool) {
  tools.set(tool.definition.name, tool);
}

export function listToolDefinitions(): ToolDefinition[] {
  return Array.from(tools.values()).map((t) => t.definition);
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> {
  const tool = tools.get(name);
  if (!tool) return `Error: la herramienta "${name}" no existe.`;
  try {
    return await tool.execute(args, ctx);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return `Error al ejecutar ${name}: ${msg}`;
  }
}

// ---------------------------------------------------------------------------
// Herramienta: listar Páginas (dato real, vía servidor)
// ---------------------------------------------------------------------------

registerTool({
  definition: {
    name: "list_pages",
    description:
      "Lista las Páginas de Facebook que administra el usuario, con su categoría y los permisos (tasks) de cada una. Usala cuando el usuario pregunte por sus Páginas o necesites el dato real y actualizado.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  execute: async (_args, ctx) => {
    if (!ctx.accessToken) {
      return "No hay sesión de Facebook activa en el servidor.";
    }
    const pages = await getManagedPages(ctx.accessToken);
    if (pages.length === 0) return "El usuario no administra ninguna Página.";
    return pages
      .map(
        (p) =>
          `- ${p.name} (id: ${p.id})${p.category ? ` · ${p.category}` : ""}${
            p.tasks ? ` · permisos: ${p.tasks.join(", ")}` : ""
          }`
      )
      .join("\n");
  },
});

// ---------------------------------------------------------------------------
// Herramienta: estado del navegador (modalidad 100% navegador)
// ---------------------------------------------------------------------------

registerTool({
  definition: {
    name: "browser_status",
    description:
      "Consulta el estado del navegador de la plataforma: si hay una sesión de Facebook guardada, si está conectada, si Facebook pide iniciar sesión o si hay un checkpoint de seguridad pendiente. Usala cuando el usuario pregunte por el navegador o por la conexión.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  execute: async () => {
    const status = await getBrowserStatus();
    return `Estado del navegador: ${status.state}. ${status.detail}`;
  },
});
