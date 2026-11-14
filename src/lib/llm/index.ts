import type { Message, ProviderConfig } from "./types";
import { chatWithFallback } from "./providers";
import { executeTool, listToolDefinitions } from "./tools";

/**
 * Orquestador principal
 *
 * Recibe una instrucción del usuario + el contexto de Páginas seleccionadas
 * y coordina el LLM + las herramientas, en un loop de tool calling:
 * el modelo pide herramientas, el ejecutor las corre de verdad y el
 * resultado vuelve al modelo, hasta que responde con texto.
 */

export interface OrchestratorContext {
  selectedPages: { id: string; name: string }[];
  activePageId: string | null;
  conversationHistory?: Message[];
  /** Token de usuario de Facebook (solo servidor, para las herramientas). */
  accessToken?: string;
}

export interface OrchestratorResult {
  reply: string;
  toolCallsMade: { name: string; arguments: Record<string, unknown> }[];
  providerUsed?: string;
}

const SYSTEM_PROMPT = `Sos el Orquestador de una plataforma llamada "Orquestador".
Tu trabajo es ayudar al usuario a administrar múltiples Páginas de Facebook.

Modalidad de la plataforma: MODO ASISTIDO. Vos preparás las acciones
(comentarios, respuestas, publicaciones) con la herramienta preparar_accion
y quedan en la cola del panel. El usuario las ejecuta desde su propio
navegador de siempre, con su sesión de Facebook: abre el destino, pega el
texto y marca la acción como hecha. Vos no manejás ningún navegador ni
publicás nada por tu cuenta.
La API de Meta solo se usa para el login y para listar las Páginas del usuario.

Reglas importantes:
- Solo usás las herramientas que tenés disponibles.
- Cuando el usuario pide un comentario, una respuesta o un post, lo
  redactás con la voz de la Página indicada y lo dejás preparado con
  preparar_accion; le confirmás que quedó en la cola, listo para ejecutar.
- Nunca inventás resultados ni acciones que no se hayan ejecutado.
  Una acción preparada NO está publicada: está esperando al usuario.
- Si una herramienta devuelve un error o un freno (por ejemplo un checkpoint de Facebook), lo decís claramente, sin reintentar por tu cuenta.
- Siempre trabajás solo con las Páginas que el usuario tiene seleccionadas.
- Respondés en español, de forma clara y directa.
`;

const MAX_TOOL_ROUNDS = 5;

export async function runOrchestrator(
  userMessage: string,
  context: OrchestratorContext,
  providers: ProviderConfig[]
): Promise<OrchestratorResult> {
  const pagesContext =
    context.selectedPages.length === 0
      ? "El usuario no tiene ninguna Página seleccionada."
      : `Páginas seleccionadas:\n${context.selectedPages
          .map(
            (p) =>
              `- ${p.name} (id: ${p.id})${
                p.id === context.activePageId ? " ← ACTIVA" : ""
              }`
          )
          .join("\n")}`;

  const messages: Message[] = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\n${pagesContext}`,
    },
    ...(context.conversationHistory || []),
    {
      role: "user",
      content: userMessage,
    },
  ];

  const tools = listToolDefinitions();
  const toolCallsMade: OrchestratorResult["toolCallsMade"] = [];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const response = await chatWithFallback(providers, {
      messages,
      tools,
      temperature: 0.3,
    });

    if (!response.toolCalls || response.toolCalls.length === 0) {
      return {
        reply: response.content || "No pude generar una respuesta.",
        toolCallsMade,
      };
    }

    // El modelo pidió herramientas: se ejecutan de verdad y el resultado
    // vuelve a la conversación.
    messages.push({
      role: "assistant",
      content: response.content,
      toolCalls: response.toolCalls,
    });

    for (const call of response.toolCalls) {
      toolCallsMade.push({ name: call.name, arguments: call.arguments });
      const result = await executeTool(call.name, call.arguments, {
        accessToken: context.accessToken,
      });
      messages.push({
        role: "tool",
        content: result,
        toolCallId: call.id,
        name: call.name,
      });
    }
  }

  return {
    reply:
      "La tarea quedó a mitad de camino: se alcanzó el límite de pasos con herramientas. Probá de nuevo con una instrucción más puntual.",
    toolCallsMade,
  };
}
