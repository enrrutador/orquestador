"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePagesStore } from "@/store/pages-store";
import PageCard from "./PageCard";
import { LogIn, LogOut, RefreshCw, Layers } from "lucide-react";

interface SafePage {
  id: string;
  name: string;
  category?: string;
  pictureUrl?: string | null;
  tasks?: string[];
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const {
    selectedPageIds,
    activePageId,
    togglePage,
    setActivePage,
    clearSelection,
  } = usePagesStore();

  const [pages, setPages] = useState<SafePage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pages");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar Páginas");
      setPages(data.pages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchPages();
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Cargando...</div>
      </div>
    );
  }

  // Pantalla de login
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30">
              <Layers className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
              Orquestador
            </h1>
            <p className="text-zinc-400 text-lg">
              Administrá todas tus Páginas de Facebook desde un solo lugar
            </p>
          </div>

          <button
            onClick={() => signIn("facebook")}
            className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium py-3.5 px-6 rounded-xl transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Conectar con Facebook
          </button>

          <p className="text-xs text-zinc-600">
            Solo se solicita el permiso para listar las Páginas que administrás.
            <br />
            No se almacenan contraseñas.
          </p>
        </div>
      </div>
    );
  }

  // Dashboard principal
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <span className="font-semibold text-zinc-100">Orquestador</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400 hidden sm:block">
              {session.user?.name}
            </span>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Título y acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-zinc-50">Tus Páginas</h2>
            <p className="text-zinc-400 mt-1">
              {pages.length > 0
                ? `${pages.length} Página${pages.length !== 1 ? "s" : ""} encontrada${pages.length !== 1 ? "s" : ""}`
                : "Conectá tu cuenta para ver las Páginas que administrás"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedPageIds.length > 0 && (
              <button
                onClick={clearSelection}
                className="text-sm text-zinc-400 hover:text-zinc-200 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Limpiar selección ({selectedPageIds.length})
              </button>
            )}
            <button
              onClick={fetchPages}
              disabled={loading}
              className="flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && pages.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Grid de Páginas */}
        {!loading && pages.length === 0 && !error && (
          <div className="text-center py-16 text-zinc-500">
            <p>No se encontraron Páginas administradas por esta cuenta.</p>
            <p className="text-sm mt-2">
              Asegurate de que el permiso <code className="text-zinc-400">pages_show_list</code> esté habilitado.
            </p>
          </div>
        )}

        {pages.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages.map((page) => (
              <PageCard
                key={page.id}
                id={page.id}
                name={page.name}
                category={page.category}
                pictureUrl={page.pictureUrl}
                selected={selectedPageIds.includes(page.id)}
                active={activePageId === page.id}
                onToggle={() => togglePage(page.id)}
                onSetActive={() => setActivePage(page.id)}
              />
            ))}
          </div>
        )}

        {/* Resumen de selección */}
        {selectedPageIds.length > 0 && (
          <div className="mt-10 p-5 rounded-xl border border-zinc-800 bg-zinc-900/40">
            <h3 className="font-medium text-zinc-200 mb-2">
              Selección actual
            </h3>
            <p className="text-sm text-zinc-400">
              {selectedPageIds.length} Página{selectedPageIds.length !== 1 ? "s" : ""} seleccionada{selectedPageIds.length !== 1 ? "s" : ""}
              {activePageId && (
                <>
                  {" · "}Página activa:{" "}
                  <span className="text-blue-400">
                    {pages.find((p) => p.id === activePageId)?.name || activePageId}
                  </span>
                </>
              )}
            </p>
            <p className="text-xs text-zinc-600 mt-3">
              En las próximas etapas, el orquestador de IA usará estas Páginas seleccionadas para ejecutar las instrucciones.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}