import type { Message, ToolDefinition, ProviderConfig } from "./types";
import { chatWithFallback } from "./providers";

/**
 * Orquestador principal
 *
 * Recibe una instrucción del usuario + el contexto de Páginas seleccionadas
 * y coordina el LLM + las herramientas.
 *
 * Esta es la versión inicial (esqueleto). Se irá completando.
 */

export interface OrchestratorContext {
  selectedPages: { id: string; name: string }[];
  activePageId: string | null;
  conversationHistory?: Message[];
}

export interface OrchestratorResult {
  reply: string;
  toolCallsMade: { name: string; arguments: Record<string, unknown> }[];
  providerUsed?: string;
}

const SYSTEM_PROMPT = `Sos el Orquestador de una plataforma llamada "Orquestador".
Tu trabajo es ayudar al usuario a administrar múltiples Páginas de Facebook.

Reglas importantes:
- Solo usás las herramientas que tenés disponibles.
- Nunca inventás resultados ni acciones que no se hayan ejecutado.
- Si una acción no es posible por limitaciones de la API de Meta, lo decís claramente.
- Siempre trabajás solo con las Páginas que el usuario tiene seleccionadas.
- Respondés en español, de forma clara y directa.
`;

export async function runOrchestrator(
  userMessage: string,
  context: OrchestratorContext,
  providers: ProviderConfig[],
  tools: ToolDefinition[] = []
): Promise<OrchestratorResult> {
  // Construimos el contexto de Páginas
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

  // Por ahora solo hacemos una llamada al LLM.
  // Más adelante implementaremos el loop de tool calling.
  const response = await chatWithFallback(providers, {
    messages,
    tools,
    temperature: 0.3,
  });

  return {
    reply: response.content || "No pude generar una respuesta.",
    toolCallsMade: (response.toolCalls || []).map((tc) => ({
      name: tc.name,
      arguments: tc.arguments,
    })),
  };
}