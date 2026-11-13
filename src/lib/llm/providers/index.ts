import type { LLMProvider, ProviderConfig } from "../types";

/**
 * Registry de providers.
 * Aquí se registrarán Grok, OpenAI, Anthropic, etc.
 *
 * Por ahora está vacío. Se irá completando a medida que
 * implementemos cada provider.
 */

const providers = new Map<string, LLMProvider>();

export function registerProvider(provider: LLMProvider) {
  providers.set(provider.id, provider);
}

export function getProvider(id: string): LLMProvider | undefined {
  return providers.get(id);
}

export function listProviders(): LLMProvider[] {
  return Array.from(providers.values());
}

/**
 * Intenta los providers en orden de prioridad.
 * Si uno falla, prueba el siguiente (fallback).
 */
export async function chatWithFallback(
  configs: ProviderConfig[],
  params: Parameters<LLMProvider["chat"]>[0]
) {
  const ordered = configs
    .filter((c) => c.enabled)
    .sort((a, b) => a.priority - b.priority);

  const errors: string[] = [];

  for (const config of ordered) {
    const provider = getProvider(config.id);
    if (!provider) {
      errors.push(`Provider "${config.id}" no registrado`);
      continue;
    }

    try {
      return await provider.chat(params, config.model);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      errors.push(`${config.id}: ${msg}`);
      console.warn(`[Fallback] ${config.id} falló, probando siguiente...`);
    }
  }

  throw new Error(
    `Todos los providers fallaron:\n${errors.map((e) => `- ${e}`).join("\n")}`
  );
}