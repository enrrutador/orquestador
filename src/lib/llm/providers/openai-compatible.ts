import { BaseProvider } from "./base";
import type { ChatParams, LLMResponse, Message, ToolCall } from "../types";

/**
 * Proveedor genérico compatible con la API de OpenAI.
 *
 * Sirve para cualquier endpoint que hable ese formato:
 * NVIDIA NIM (https://integrate.api.nvidia.com/v1), OpenAI, xAI (Grok),
 * o un servidor local. Se configura por variables de entorno.
 */

export interface OpenAICompatibleConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
}

interface OpenAIMessage {
  role: string;
  content: string | null;
  tool_call_id?: string;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
}

function toOpenAIMessages(messages: Message[]): OpenAIMessage[] {
  return messages.map((m) => {
    const out: OpenAIMessage = { role: m.role, content: m.content };
    if (m.toolCallId) out.tool_call_id = m.toolCallId;
    if (m.toolCalls && m.toolCalls.length > 0) {
      out.tool_calls = m.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
      }));
    }
    return out;
  });
}

export class OpenAICompatibleProvider extends BaseProvider {
  id: string;
  name: string;
  models: string[];
  private baseUrl: string;
  private apiKey: string;

  constructor(config: OpenAICompatibleConfig) {
    super();
    this.id = config.id;
    this.name = config.name;
    this.models = config.models;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  async chat(params: ChatParams, model?: string): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error(
        `${this.name}: falta la clave de API (variable LLM_API_KEY o NVIDIA_API_KEY en el servidor).`
      );
    }

    const usedModel = model || this.models[0];
    if (!usedModel) {
      throw new Error(`${this.name}: no hay modelo configurado (variable LLM_MODEL).`);
    }

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: usedModel,
          messages: toOpenAIMessages(params.messages),
          temperature: params.temperature ?? 0.3,
          max_tokens: params.maxTokens,
          tools: params.tools?.map((t) => ({
            type: "function",
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            },
          })),
        }),
      });
    } catch (err) {
      this.handleError(err, this.name);
    }

    if (!res!.ok) {
      const body = await res!.text().catch(() => "");
      throw new Error(
        `${this.name}: HTTP ${res!.status} ${body.slice(0, 300)}`.trim()
      );
    }

    const data = await res!.json();
    const choice = data.choices?.[0];
    const msg = choice?.message || {};

    const toolCalls: ToolCall[] = (msg.tool_calls || []).map(
      (tc: {
        id: string;
        function: { name: string; arguments: string };
      }) => {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          args = {};
        }
        return { id: tc.id, name: tc.function.name, arguments: args };
      }
    );

    return {
      content: msg.content ?? null,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason:
        choice?.finish_reason === "tool_calls"
          ? "tool_calls"
          : choice?.finish_reason === "length"
            ? "length"
            : "stop",
      usage: data.usage
        ? {
            inputTokens: data.usage.prompt_tokens,
            outputTokens: data.usage.completion_tokens,
          }
        : undefined,
    };
  }
}
