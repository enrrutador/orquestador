import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Cola de acciones preparadas — MODO ASISTIDO.
 *
 * El Orquestador (la IA) o el propio usuario preparan acciones
 * (comentarios, respuestas, publicaciones) y quedan en esta cola,
 * guardada en un archivo local de la app (.data/acciones.json).
 * El usuario las ejecuta desde su navegador de siempre, con su sesión
 * de Facebook: abre el destino, pega el texto y marca la acción hecha.
 */

export type TipoAccion = "comentario" | "respuesta" | "publicacion";
export type EstadoAccion = "pendiente" | "hecha" | "descartada";

export interface AccionPreparada {
  id: string;
  /** Nombre de la Página o personaje que firma la acción. */
  pagina: string;
  tipo: TipoAccion;
  /** Enlace al post, comentario o perfil donde va la acción. */
  destinoUrl?: string;
  /** El texto listo para pegar. */
  texto: string;
  estado: EstadoAccion;
  creadaEn: string;
  hechaEn?: string;
}

const DATA_DIR = join(process.cwd(), ".data");
const FILE = join(DATA_DIR, "acciones.json");

function readAll(): AccionPreparada[] {
  try {
    if (!existsSync(FILE)) return [];
    const parsed = JSON.parse(readFileSync(FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: AccionPreparada[]): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(list, null, 2), "utf8");
}

/** Pendientes primero (más nuevas arriba); después las hechas. */
export function listAcciones(): AccionPreparada[] {
  const all = readAll().filter((a) => a.estado !== "descartada");
  const orden = (a: AccionPreparada, b: AccionPreparada) =>
    b.creadaEn.localeCompare(a.creadaEn);
  return [
    ...all.filter((a) => a.estado === "pendiente").sort(orden),
    ...all.filter((a) => a.estado === "hecha").sort(orden),
  ];
}

export function createAccion(input: {
  pagina: string;
  tipo: TipoAccion;
  destinoUrl?: string;
  texto: string;
}): AccionPreparada {
  const accion: AccionPreparada = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    pagina: input.pagina.trim(),
    tipo: input.tipo,
    destinoUrl: input.destinoUrl?.trim() || undefined,
    texto: input.texto.trim(),
    estado: "pendiente",
    creadaEn: new Date().toISOString(),
  };
  const all = readAll();
  all.push(accion);
  writeAll(all);
  return accion;
}

export function setEstadoAccion(
  id: string,
  estado: EstadoAccion
): AccionPreparada | null {
  const all = readAll();
  const accion = all.find((a) => a.id === id);
  if (!accion) return null;
  accion.estado = estado;
  accion.hechaEn = estado === "hecha" ? new Date().toISOString() : undefined;
  writeAll(all);
  return accion;
}
