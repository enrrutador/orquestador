import type { ChatParams, LLMProvider, LLMResponse } from "../types";

/**
 * Clase base abstracta para todos los providers.
 * Facilita agregar nuevos proveedores sin romper el orquestador.
 */
export abstract class BaseProvider implements LLMProvider {
  abstract id: string;
  abstract name: string;
  abstract models: string[];

  abstract chat(params: ChatParams, model?: string): Promise<LLMResponse>;

  /**
   * Helper para manejar errores de forma uniforme
   */
  protected handleError(error: unknown, providerName: string): never {
    const message =
      error instanceof Error ? error.message : "Error desconocido del provider";
    console.error(`[LLM:${providerName}]`, message);
    throw new Error(`${providerName}: ${message}`);
  }
}