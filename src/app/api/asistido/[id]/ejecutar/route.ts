import { NextResponse } from "next/server";
import { listAcciones, setEstadoAccion } from "@/lib/asistido/store";
import { comentarComoPagina } from "@/lib/browser/ejecutor";

/**
 * Ejecuta una acción preparada: la app comenta en Facebook como la
 * Página indicada, con su navegador propio, y solo la marca hecha si
 * el comentario quedó verificado en el post.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const accion = listAcciones().find((a) => a.id === id);
  if (!accion) {
    return NextResponse.json(
      { error: "La acción no existe." },
      { status: 404 }
    );
  }
  if (!accion.destinoUrl) {
    return NextResponse.json(
      {
        error:
          "La acción no tiene enlace de destino: sin el post, la app no sabe dónde comentar.",
      },
      { status: 400 }
    );
  }

  const resultado = await comentarComoPagina({
    postUrl: accion.destinoUrl,
    pagina: accion.pagina,
    texto: accion.texto,
  });

  if (resultado.ok) {
    setEstadoAccion(id, "hecha");
  }
  return NextResponse.json({ resultado });
}
