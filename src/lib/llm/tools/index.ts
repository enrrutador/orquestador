import type { ToolDefinition } from "../types";
import { getManagedPages } from "@/lib/facebook";
import {
  createAccion,
  listAcciones,
  type TipoAccion,
} from "@/lib/asistido/store";
import { comentarComoPagina } from "@/lib/browser/ejecutor";

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
// Herramientas del MODO ASISTIDO: preparar acciones para la cola
// ---------------------------------------------------------------------------

const TIPO_LABEL: Record<TipoAccion, string> = {
  comentario: "Comentario",
  respuesta: "Respuesta",
  publicacion: "Publicación",
};

registerTool({
  definition: {
    name: "preparar_accion",
    description:
      "Prepara una acción (un comentario, una respuesta o una publicación) y la deja en la cola del panel, lista para que el usuario la ejecute desde su propio navegador: abre el destino en Facebook, pega el texto y la marca hecha. Usala SIEMPRE que el usuario pida comentar, responder o publicar algo: vos redactás el texto con la voz de la Página indicada y lo dejás preparado; nunca digas que lo publicaste vos.",
    parameters: {
      type: "object",
      properties: {
        pagina: {
          type: "string",
          description: "Nombre de la Página o personaje que firma la acción.",
        },
        tipo: {
          type: "string",
          enum: ["comentario", "respuesta", "publicacion"],
          description: "Qué clase de acción es.",
        },
        destino_url: {
          type: "string",
          description:
            "Enlace de Facebook al post, comentario o perfil donde va la acción (si el usuario lo dio).",
        },
        texto: {
          type: "string",
          description: "El texto exacto, listo para pegar.",
        },
      },
      required: ["pagina", "tipo", "texto"],
    },
  },
  execute: async (args) => {
    const pagina = String(args.pagina || "").trim();
    const texto = String(args.texto || "").trim();
    const tipo = (["comentario", "respuesta", "publicacion"].includes(
      String(args.tipo)
    )
      ? args.tipo
      : "comentario") as TipoAccion;
    const destinoUrl =
      typeof args.destino_url === "string" &&
      args.destino_url.startsWith("http")
        ? args.destino_url
        : undefined;
    if (!pagina || !texto) {
      return "Error: la acción necesita la Página y el texto.";
    }
    const accion = createAccion({ pagina, tipo, destinoUrl, texto });
    return `Acción preparada y en la cola del panel: ${TIPO_LABEL[accion.tipo]} de «${accion.pagina}» — «${accion.texto}»${accion.destinoUrl ? ` (destino: ${accion.destinoUrl})` : ""}. El usuario la ejecuta desde su navegador.`;
  },
});

registerTool({
  definition: {
    name: "comentar_como_pagina",
    description:
      "EJECUTA un comentario en Facebook como la Página indicada, usando el navegador de la app: abre el post, cambia la identidad a esa Página, escribe el texto, lo envía y verifica que el comentario haya quedado con la Página como autora. Si algo falla (sesión no iniciada, identidad no confirmada, comentario no verificado), devuelve el paso exacto que falló y NO se publica nada a medias. Usala cuando el usuario pida que una o varias Páginas comenten un post concreto: una llamada por cada Página, cada una con un texto distinto y la voz de esa Página. La sesión de Facebook debe estar iniciada en el navegador de la app (el usuario la abre a mano); si la herramienta reporta ese freno, avisale que inicie sesión en la tarjeta del navegador.",
    parameters: {
      type: "object",
      properties: {
        post_url: {
          type: "string",
          description: "Enlace de Facebook al post que se va a comentar.",
        },
        pagina: {
          type: "string",
          description: "Nombre exacto de la Página que firma el comentario.",
        },
        texto: {
          type: "string",
          description:
            "El comentario, redactado con la voz de esa Página. Nunca repitas el mismo texto entre Páginas.",
        },
      },
      required: ["post_url", "pagina", "texto"],
    },
  },
  execute: async (args) => {
    const postUrl = String(args.post_url || "");
    const pagina = String(args.pagina || "").trim();
    const texto = String(args.texto || "").trim();
    if (!postUrl.startsWith("http") || !pagina || !texto) {
      return "Error: para comentar necesito el enlace del post, la Página y el texto.";
    }
    const r = await comentarComoPagina({ postUrl, pagina, texto });
    return r.ok
      ? r.detalle
      : `No se pudo comentar como «${pagina}» (paso: ${r.paso}). ${r.detalle}`;
  },
});

registerTool({
  definition: {
    name: "ver_acciones",
    description:
      "Muestra la cola de acciones preparadas: cuáles están pendientes de ejecutar y cuáles ya se hicieron. Usala cuando el usuario pregunte qué falta hacer o qué quedó preparado.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  execute: async () => {
    const acciones = listAcciones();
    if (acciones.length === 0) {
      return "La cola está vacía: no hay acciones preparadas.";
    }
    return acciones
      .map(
        (a) =>
          `- [${a.estado}] ${TIPO_LABEL[a.tipo]} de «${a.pagina}»: «${a.texto}»`
      )
      .join("\n");
  },
});
