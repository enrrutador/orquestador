"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Compass, RefreshCw, X, CornerDownLeft } from "lucide-react";

interface BrowserStatus {
  state:
    | "conectado"
    | "login-requerido"
    | "checkpoint"
    | "sin-sesion"
    | "detenido"
    | "no-verificable";
  detail: string;
  browserAvailable: boolean;
  hasSavedSession: boolean;
  running: boolean;
  checkedAt: string;
}

const STATE_STYLE: Record<BrowserStatus["state"], { dot: string; label: string }> = {
  conectado: { dot: "bg-emerald-400", label: "Conectado" },
  "login-requerido": { dot: "bg-amber-400", label: "Pide iniciar sesión" },
  checkpoint: { dot: "bg-red-400", label: "Checkpoint de Facebook" },
  "sin-sesion": { dot: "bg-zinc-500", label: "Sin sesión guardada" },
  detenido: { dot: "bg-zinc-500", label: "Navegador cerrado" },
  "no-verificable": { dot: "bg-zinc-500", label: "No verificable acá" },
};

export default function BrowserCard() {
  const [status, setStatus] = useState<BrowserStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shotTick, setShotTick] = useState(0);
  const [text, setText] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/browser/status");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al consultar el navegador");
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const running = Boolean(status?.running);

  // Mientras el navegador está abierto: pantalla y estado se actualizan solos.
  useEffect(() => {
    if (!running) return;
    const shot = setInterval(() => setShotTick((t) => t + 1), 2500);
    const st = setInterval(fetchStatus, 6000);
    return () => {
      clearInterval(shot);
      clearInterval(st);
    };
  }, [running, fetchStatus]);

  const refreshShotSoon = () => {
    setTimeout(() => setShotTick((t) => t + 1), 400);
    setTimeout(() => setShotTick((t) => t + 1), 1200);
  };

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/browser/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo abrir el navegador");
      setStatus(data);
      setShotTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      await fetch("/api/browser/stop", { method: "POST" });
      await fetchStatus();
    } finally {
      setBusy(false);
    }
  };

  // Puntero completo sobre la pantalla: apretar, arrastrar y soltar.
  // Las comprobaciones de Facebook piden mantener o arrastrar; un clic
  // simple no alcanza.
  const pressingRef = useRef(false);
  const lastMoveRef = useRef(0);

  const fractionsFromEvent = (e: React.PointerEvent<HTMLImageElement>) => {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    return {
      fx: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      fy: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const sendPointer = (action: "down" | "move" | "up", fx: number, fy: number) =>
    fetch("/api/browser/pointer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, fx, fy }),
    }).catch(() => {});

  const onPointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    const f = fractionsFromEvent(e);
    if (!f) return;
    pressingRef.current = true;
    imgRef.current?.setPointerCapture(e.pointerId);
    sendPointer("down", f.fx, f.fy);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!pressingRef.current) return;
    const now = Date.now();
    if (now - lastMoveRef.current < 80) return;
    lastMoveRef.current = now;
    const f = fractionsFromEvent(e);
    if (f) sendPointer("move", f.fx, f.fy);
  };

  const onPointerUp = async (e: React.PointerEvent<HTMLImageElement>) => {
    pressingRef.current = false;
    const f = fractionsFromEvent(e);
    if (f) await sendPointer("up", f.fx, f.fy);
    refreshShotSoon();
    setTimeout(fetchStatus, 1200);
  };

  const sendText = async () => {
    if (!text) return;
    const value = text;
    setText("");
    await fetch("/api/browser/type", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: value }),
    }).catch(() => {});
    refreshShotSoon();
  };

  const sendKey = async (key: string) => {
    await fetch("/api/browser/key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    }).catch(() => {});
    refreshShotSoon();
    fetchStatus();
  };

  const style = status ? STATE_STYLE[status.state] : null;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
          <Compass className="w-4 h-4 text-blue-400" />
        </div>
        <h2 className="text-lg font-bold text-zinc-50 leading-tight">Navegador</h2>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-4">
        {error && <p className="text-sm text-red-300 mb-2">{error}</p>}

        {!status && !error && (
          <p className="text-sm text-zinc-500">Consultando el navegador...</p>
        )}

        {status && style && (
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium text-zinc-100">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${style.dot}`} />
              {style.label}
            </p>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 active:bg-zinc-800 disabled:opacity-50 transition-colors flex-shrink-0"
              aria-label="Actualizar estado del navegador"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        )}

        {status && status.state === "checkpoint" && (
          <p className="text-sm text-red-200/90 mt-1.5 leading-relaxed">{status.detail}</p>
        )}

        {status && !running && (
          <button
            onClick={start}
            disabled={busy || !status.browserAvailable}
            className="mt-3 w-full bg-[#1877F2] active:bg-[#166FE5] disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl transition-colors text-sm"
          >
            {busy ? "Abriendo..." : "Abrir navegador"}
          </button>
        )}
        {status && !running && !status.browserAvailable && (
          <p className="text-sm text-zinc-500 mt-2">No se encontró Chromium en este dispositivo.</p>
        )}

        {running && (
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={`/api/browser/screenshot?t=${shotTick}`}
              alt="Pantalla del navegador"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onError={fetchStatus}
              className="w-full max-w-[412px] mx-auto rounded-xl border border-zinc-800 cursor-pointer select-none touch-none"
              draggable={false}
            />
            <p className="text-xs text-zinc-500 mt-2 text-center">
              Tocá, mantené apretado o arrastrá sobre la pantalla.
            </p>

            <div className="flex gap-2 mt-3">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendText();
                }}
                placeholder="Texto para escribir en la pantalla..."
                className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
              />
              <button
                onClick={sendText}
                disabled={!text}
                className="bg-zinc-800 active:bg-zinc-700 disabled:opacity-50 text-zinc-100 text-sm font-medium px-4 rounded-xl"
              >
                Escribir
              </button>
              <button
                onClick={() => sendKey("Enter")}
                className="flex items-center justify-center w-11 rounded-xl bg-zinc-800 active:bg-zinc-700 text-zinc-100"
                aria-label="Enter"
              >
                <CornerDownLeft className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={stop}
              disabled={busy}
              className="mt-3 flex items-center gap-1.5 text-sm text-zinc-400 active:text-zinc-200 px-2.5 py-1.5 rounded-lg active:bg-zinc-800 disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Cerrar navegador
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
