import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { runOrchestrator } from "@/lib/llm";
import { getDefaultProviderConfigs } from "@/lib/llm/providers/register";
import type { Message } from "@/lib/llm/types";

interface ChatBody {
  message?: string;
  history?: { role: "user" | "assistant"; content: string }[];
  selectedPages?: { id: string; name: string }[];
  activePageId?: string | null;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "No autenticado. Conectá tu cuenta de Facebook." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as ChatBody;
    const message = (body.message || "").trim();

    if (!message) {
      return NextResponse.json(
        { error: "El mensaje está vacío." },
        { status: 400 }
      );
    }

    const history: Message[] = (body.history || [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));

    const result = await runOrchestrator(
      message,
      {
        selectedPages: body.selectedPages || [],
        activePageId: body.activePageId ?? null,
        conversationHistory: history,
        accessToken: session.accessToken,
      },
      getDefaultProviderConfigs()
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API /chat]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error del Orquestador al procesar el mensaje",
      },
      { status: 500 }
    );
  }
}
