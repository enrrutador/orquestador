"use client";

import { useCallback, useEffect, useState } from "react";
import { Compass, RefreshCw } from "lucide-react";

interface BrowserStatus {
  state: "conectado" | "login-requerido" | "checkpoint" | "sin-sesion" | "no-verificable";
  detail: string;
  browserAvailable: boolean;
  hasSavedSession: boolean;
  checkedAt: string;
}

const STATE_STYLE: Record<BrowserStatus["state"], { dot: string; label: string }> = {
  conectado: { dot: "bg-emerald-400", label: "Conectado" },
  "login-requerido": { dot: "bg-amber-400", label: "Pide iniciar sesión" },
  checkpoint: { dot: "bg-red-400", label: "Checkpoint de Facebook" },
  "sin-sesion": { dot: "bg-zinc-500", label: "Sin sesión guardada" },
  "no-verificable": { dot: "bg-zinc-500", label: "No verificable acá" },
};

export default function BrowserCard() {
  const [status, setStatus] = useState<BrowserStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/browser/status");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al consultar el navegador");
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const style = status ? STATE_STYLE[status.state] : null;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
          <Compass className="w-4 h-4 text-blue-400" />
        </div>
        <h2 className="text-lg font-bold text-zinc-50 leading-tight">
          Navegador
        </h2>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-4">
        {error && (
          <p className="text-sm text-red-300">{error}</p>
        )}

        {!error && loading && !status && (
          <p className="text-sm text-zinc-500">Consultando el navegador...</p>
        )}

        {status && style && (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${style.dot}`} />
                {style.label}
              </p>
              <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">
                {status.detail}
              </p>
            </div>
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
      </div>
    </section>
  );
}
