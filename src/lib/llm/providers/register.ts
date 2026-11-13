import { getProvider, registerProvider } from "./index";
import { OpenAICompatibleProvider } from "./openai-compatible";
import type { ProviderConfig } from "../types";

/**
 * Registro del proveedor por defecto desde variables de entorno.
 *
 * El proveedor es genérico (compatible con OpenAI). Por defecto apunta a
 * NVIDIA NIM, pero LLM_BASE_URL / LLM_MODEL lo redirigen a cualquier otro
 * endpoint compatible sin tocar código.
 *
 * Variables:
 * - LLM_API_KEY (o NVIDIA_API_KEY como respaldo)
 * - LLM_BASE_URL (default: https://integrate.api.nvidia.com/v1)
 * - LLM_MODEL (default: meta/llama-3.3-70b-instruct)
 * - LLM_PROVIDER_NAME (default: "NVIDIA NIM")
 */

export const DEFAULT_PROVIDER_ID = "openai-compatible";

export function registerDefaultProviders(): void {
  if (getProvider(DEFAULT_PROVIDER_ID)) return;

  registerProvider(
    new OpenAICompatibleProvider({
      id: DEFAULT_PROVIDER_ID,
      name: process.env.LLM_PROVIDER_NAME || "NVIDIA NIM",
      baseUrl: process.env.LLM_BASE_URL || "https://integrate.api.nvidia.com/v1",
      apiKey: process.env.LLM_API_KEY || process.env.NVIDIA_API_KEY || "",
      models: [process.env.LLM_MODEL || "meta/llama-3.3-70b-instruct"],
    })
  );
}

export function getDefaultProviderConfigs(): ProviderConfig[] {
  registerDefaultProviders();
  return [
    {
      id: DEFAULT_PROVIDER_ID,
      model: process.env.LLM_MODEL || "meta/llama-3.3-70b-instruct",
      priority: 1,
      enabled: true,
    },
  ];
}
