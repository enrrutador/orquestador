"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Wrench } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  tools?: string[];
}

interface ChatProps {
  selectedPages: { id: string; name: string }[];
  activePageId: string | null;
}

export default function Chat({ selectedPages, activePageId }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          selectedPages,
          activePageId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error del Orquestador");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          tools: (data.toolCallsMade || []).map(
            (t: { name: string }) => t.name
          ),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-50 leading-tight">
            Orquestador
          </h2>
          <p className="text-zinc-500 text-xs">
            {selectedPages.length > 0
              ? `Trabaja sobre ${selectedPages.length} Página${selectedPages.length !== 1 ? "s" : ""} seleccionada${selectedPages.length !== 1 ? "s" : ""}`
              : "Sin Páginas seleccionadas: seleccionalas arriba para darles contexto"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="max-h-[420px] overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-zinc-500 leading-relaxed">
              Pedile algo al Orquestador: por ejemplo, que liste tus Páginas
              reales o que consulte el estado del navegador.
            </p>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-zinc-800 text-zinc-100 rounded-bl-md"
                }`}
              >
                {m.content}
                {m.tools && m.tools.length > 0 && (
                  <span className="mt-1.5 flex items-center gap-1 text-[11px] text-zinc-400">
                    <Wrench className="w-3 h-3" />
                    {m.tools.join(", ")}
                  </span>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="mx-3 mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="border-t border-zinc-800 p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Escribí una instrucción..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-600 text-white active:bg-blue-500 disabled:opacity-40 transition-colors flex-shrink-0"
            aria-label="Enviar"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
