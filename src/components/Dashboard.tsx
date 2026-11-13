"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { usePagesStore } from "@/store/pages-store";
import PageCard from "./PageCard";
import {
  LogIn,
  LogOut,
  RefreshCw,
  Layers,
  Search,
  X,
  CheckSquare,
} from "lucide-react";

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
  const [search, setSearch] = useState("");

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

  // Filtro de búsqueda
  const filteredPages = useMemo(() => {
    if (!search.trim()) return pages;
    const q = search.toLowerCase();
    return pages.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [pages, search]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-500 text-sm">Cargando...</span>
        </div>
      </div>
    );
  }

  // ========== PANTALLA DE LOGIN ==========
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 bg-zinc-950">
        <div className="max-w-sm w-full text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600/15 border border-blue-500/25">
              <Layers className="w-10 h-10 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
                Orquestador
              </h1>
              <p className="text-zinc-400 mt-2 text-base leading-relaxed">
                Administrá todas tus Páginas de Facebook desde un solo lugar con IA
              </p>
            </div>
          </div>

          <button
            onClick={() => signIn("facebook")}
            className="w-full flex items-center justify-center gap-3 bg-[#1877F2] active:bg-[#166FE5] text-white font-medium py-4 px-6 rounded-2xl transition-colors text-base"
          >
            <LogIn className="w-5 h-5" />
            Conectar con Facebook
          </button>

          <p className="text-xs text-zinc-600 leading-relaxed">
            Solo se solicita el permiso para listar las Páginas que administrás.
            <br />
            No se almacenan contraseñas.
          </p>
        </div>
      </div>
    );
  }

  // ========== DASHBOARD ==========
  return (
    <div className="min-h-screen bg-zinc-950 pb-28">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <span className="font-semibold text-zinc-100 text-[15px]">Orquestador</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500 hidden sm:inline max-w-[140px] truncate">
              {session.user?.name}
            </span>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 text-sm text-zinc-400 active:text-zinc-200 transition-colors px-2.5 py-1.5 rounded-lg active:bg-zinc-800"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Título */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-zinc-50">Tus Páginas</h2>
          <p className="text-zinc-500 text-sm mt-0.5">
            {pages.length > 0
              ? `${pages.length} Página${pages.length !== 1 ? "s" : ""} encontrada${pages.length !== 1 ? "s" : ""}`
              : "Cargando Páginas..."}
          </p>
        </div>

        {/* Buscador + Actualizar */}
        <div className="flex gap-2 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar Página..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 active:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={fetchPages}
            disabled={loading}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 active:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && pages.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-[88px] rounded-xl bg-zinc-900/60 border border-zinc-800/60 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && pages.length === 0 && !error && (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-base">No se encontraron Páginas</p>
            <p className="text-sm mt-2 text-zinc-600">
              Verificá que el permiso <code className="text-zinc-400">pages_show_list</code> esté activo en tu App de Meta.
            </p>
          </div>
        )}

        {/* Sin resultados de búsqueda */}
        {!loading && pages.length > 0 && filteredPages.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <p>No hay Páginas que coincidan con “{search}”</p>
            <button
              onClick={() => setSearch("")}
              className="mt-3 text-sm text-blue-400 active:text-blue-300"
            >
              Limpiar búsqueda
            </button>
          </div>
        )}

        {/* Grid de Páginas */}
        {filteredPages.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPages.map((page) => (
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
      </main>

      {/* Barra inferior de selección (fija, pensada para móvil) */}
      {selectedPageIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                <CheckSquare className="w-4 h-4 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-100">
                  {selectedPageIds.length} seleccionada{selectedPageIds.length !== 1 ? "s" : ""}
                </p>
                {activePageId && (
                  <p className="text-xs text-zinc-500 truncate">
                    Activa: {pages.find((p) => p.id === activePageId)?.name}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={clearSelection}
              className="text-sm text-zinc-400 active:text-zinc-200 px-3 py-1.5 rounded-lg active:bg-zinc-800 flex-shrink-0"
            >
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}