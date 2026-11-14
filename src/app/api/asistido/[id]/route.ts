import { NextResponse } from "next/server";
import { setEstadoAccion, type EstadoAccion } from "@/lib/asistido/store";

const ESTADOS: EstadoAccion[] = ["pendiente", "hecha", "descartada"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (!ESTADOS.includes(body.estado)) {
      return NextResponse.json(
        { error: "Estado no válido." },
        { status: 400 }
      );
    }
    const accion = setEstadoAccion(id, body.estado);
    if (!accion) {
      return NextResponse.json(
        { error: "La acción no existe." },
        { status: 404 }
      );
    }
    return NextResponse.json({ accion });
  } catch {
    return NextResponse.json(
      { error: "No se pudo actualizar la acción." },
      { status: 400 }
    );
  }
}
