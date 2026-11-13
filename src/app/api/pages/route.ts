import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getManagedPages } from "@/lib/facebook";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "No autenticado. Conectá tu cuenta de Facebook." },
        { status: 401 }
      );
    }

    const pages = await getManagedPages(session.accessToken);

    // No devolvemos los access_token de las Páginas al cliente por seguridad.
    // Solo enviamos lo necesario para la UI.
    const safePages = pages.map((page) => ({
      id: page.id,
      name: page.name,
      category: page.category,
      tasks: page.tasks,
      pictureUrl: page.picture?.data?.url || null,
    }));

    return NextResponse.json({ pages: safePages, count: safePages.length });
  } catch (error) {
    console.error("[API /pages]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener las Páginas de Facebook",
      },
      { status: 500 }
    );
  }
}