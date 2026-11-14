import { NextResponse } from "next/server";
import {
  createAccion,
  listAcciones,
  type TipoAccion,
} from "@/lib/asistido/store";

const TIPOS: TipoAccion[] = ["comentario", "respuesta", "publicacion"];

export async function GET() {
  return NextResponse.json({ acciones: listAcciones() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pagina = typeof body.pagina === "string" ? body.pagina : "";
    const texto = typeof body.texto === "string" ? body.texto : "";
    const tipo = TIPOS.includes(body.tipo) ? body.tipo : "comentario";
    const destinoUrl =
      typeof body.destinoUrl === "string" && body.destinoUrl.startsWith("http")
        ? body.destinoUrl
        : undefined;

    if (!pagina.trim() || !texto.trim()) {
      return NextResponse.json(
        { error: "La acción necesita la Página y el texto." },
        { status: 400 }
      );
    }

    const accion = createAccion({ pagina, tipo, destinoUrl, texto });
    return NextResponse.json({ accion }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "No se pudo crear la acción." },
      { status: 400 }
    );
  }
}
