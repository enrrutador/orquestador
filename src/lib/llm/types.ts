/**
 * Tipos del sistema de Orquestador LLM
 */

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface Message {
  role: MessageRole;
  content: string | null;
  toolCallId?: string;
  name?: string; // nombre de la tool cuando role = "tool"
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface LLMResponse {
  content: string | null;
  toolCalls?: ToolCall[];
  finishReason?: "stop" | "tool_calls" | "length" | "error";
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ChatParams {
  messages: Message[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * Interfaz que debe implementar cualquier proveedor de IA
 */
export interface LLMProvider {
  id: string;
  name: string;
  models: string[];

  chat(params: ChatParams, model?: string): Promise<LLMResponse>;
}

export interface ProviderConfig {
  id: string;
  model: string;
  priority: number;
  enabled: boolean;
}