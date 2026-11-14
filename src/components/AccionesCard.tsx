"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ClipboardList,
  Copy,
  ExternalLink,
  Plus,
  Undo2,
  X,
} from "lucide-react";

interface Accion {
  id: string;
  pagina: string;
  tipo: "comentario" | "respuesta" | "publicacion";
  destinoUrl?: string;
  texto: string;
  estado: "pendiente" | "hecha";
  creadaEn: string;
}

const TIPO_LABEL = {
  comentario: "Comentario",
  respuesta: "Respuesta",
  publicacion: "Publicación",
} as const;

async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }
}

export default function AccionesCard() {
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  // Formulario de nueva acción
  const [pagina, setPagina] = useState("");
  const [tipo, setTipo] = useState<Accion["tipo"]>("comentario");
  const [destinoUrl, setDestinoUrl] = useState("");
  const [texto, setTexto] = useState("");
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/asistido");
      const data = await res.json();
      setAcciones(data.acciones || []);
    } catch {
      /* la cola se reintenta en la próxima carga */
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 15000);
    return () => clearInterval(t);
  }, [cargar]);

  const cambiarEstado = async (id: string, estado: string) => {
    await fetch(`/api/asistido/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    }).catch(() => {});
    cargar();
  };

  const copiar = async (accion: Accion) => {
    if (await copiarTexto(accion.texto)) {
      setCopiadoId(accion.id);
      setTimeout(() => setCopiadoId(null), 1600);
    }
  };

  const crear = async () => {
    if (!pagina.trim() || !texto.trim()) return;
    setCreando(true);
    await fetch("/api/asistido", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pagina,
        tipo,
        destinoUrl: destinoUrl.trim() || undefined,
        texto,
      }),
    }).catch(() => {});
    setCreando(false);
    setPagina("");
    setDestinoUrl("");
    setTexto("");
    setTipo("comentario");
    setMostrarForm(false);
    cargar();
  };

  const pendientes = acciones.filter((a) => a.estado === "pendiente");
  const hechas = acciones.filter((a) => a.estado === "hecha");

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-zinc-100">Acciones preparadas</h3>
          {pendientes.length > 0 && (
            <span className="text-xs font-medium bg-blue-600/20 text-blue-300 px-2 py-0.5 rounded-full">
              {pendientes.length} pendiente{pendientes.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="flex items-center gap-1 text-sm text-zinc-300 bg-zinc-800 active:bg-zinc-700 px-3 py-1.5 rounded-lg"
        >
          <Plus className="w-4 h-4" /> Nueva
        </button>
      </div>

      <p className="text-xs text-zinc-500 mb-4">
        El Orquestador las prepara acá. Vos las ejecutás: abrís el destino en
        tu Facebook, pegás el texto y marcás «Hecha».
      </p>

      {mostrarForm && (
        <div className="mb-4 space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <input
            value={pagina}
            onChange={(e) => setPagina(e.target.value)}
            placeholder="Página o personaje (ej.: Luna rescata gatos)"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
          <div className="flex gap-2">
            {(Object.keys(TIPO_LABEL) as Accion["tipo"][]).map((t) => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className={`flex-1 text-sm py-2 rounded-lg border ${
                  tipo === t
                    ? "bg-blue-600/20 border-blue-500/40 text-blue-200"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400"
                }`}
              >
                {TIPO_LABEL[t]}
              </button>
            ))}
          </div>
          <input
            value={destinoUrl}
            onChange={(e) => setDestinoUrl(e.target.value)}
            placeholder="Enlace del post o perfil en Facebook (opcional)"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="El texto, listo para pegar"
            rows={3}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
          />
          <button
            onClick={crear}
            disabled={creando || !pagina.trim() || !texto.trim()}
            className="w-full bg-blue-600 active:bg-blue-500 disabled:opacity-40 text-white font-medium py-2.5 rounded-lg text-sm"
          >
            Preparar acción
          </button>
        </div>
      )}

      {pendientes.length === 0 && !mostrarForm && (
        <p className="text-sm text-zinc-500 py-2">
          No hay acciones esperando. Pedile una al Orquestador en el chat, o
          creala con «Nueva».
        </p>
      )}

      <div className="space-y-3">
        {pendientes.map((a) => (
          <article
            key={a.id}
            className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="font-medium text-zinc-100 text-sm">
                  {a.pagina}
                </span>
                <span className="ml-2 text-[11px] uppercase tracking-wide text-zinc-500">
                  {TIPO_LABEL[a.tipo]}
                </span>
              </div>
              <button
                onClick={() => cambiarEstado(a.id, "descartada")}
                aria-label="Descartar"
                className="text-zinc-600 active:text-zinc-400 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-zinc-200 mt-1.5 whitespace-pre-wrap break-words">
              {a.texto}
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              {a.destinoUrl && (
                <a
                  href={a.destinoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 bg-[#1877F2] active:bg-[#166FE5] text-white text-sm font-medium px-3.5 py-2 rounded-lg"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir en Facebook
                </a>
              )}
              <button
                onClick={() => copiar(a)}
                className="flex items-center gap-1.5 bg-zinc-800 active:bg-zinc-700 text-zinc-100 text-sm px-3.5 py-2 rounded-lg"
              >
                {copiadoId === a.id ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" /> ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copiar texto
                  </>
                )}
              </button>
              <button
                onClick={() => cambiarEstado(a.id, "hecha")}
                className="flex items-center gap-1.5 bg-emerald-600/20 border border-emerald-500/30 active:bg-emerald-600/30 text-emerald-300 text-sm px-3.5 py-2 rounded-lg"
              >
                <Check className="w-4 h-4" /> Hecha
              </button>
            </div>
          </article>
        ))}
      </div>

      {hechas.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-zinc-600 mb-2">
            Hechas ({hechas.length})
          </p>
          <div className="space-y-1.5">
            {hechas.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 text-sm text-zinc-500 rounded-lg border border-zinc-800/60 px-3 py-2"
              >
                <span className="truncate">
                  <span className="text-zinc-400">{a.pagina}</span> ·{" "}
                  {a.texto}
                </span>
                <button
                  onClick={() => cambiarEstado(a.id, "pendiente")}
                  className="flex items-center gap-1 text-xs text-zinc-400 active:text-zinc-200 flex-shrink-0"
                >
                  <Undo2 className="w-3.5 h-3.5" /> Deshacer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
