"use client";

import Image from "next/image";
import { Check } from "lucide-react";

interface PageCardProps {
  id: string;
  name: string;
  category?: string;
  pictureUrl?: string | null;
  selected: boolean;
  active: boolean;
  onToggle: () => void;
  onSetActive: () => void;
}

export default function PageCard({
  name,
  category,
  pictureUrl,
  selected,
  active,
  onToggle,
  onSetActive,
}: PageCardProps) {
  return (
    <div
      className={`
        relative group rounded-xl border transition-all duration-200 cursor-pointer
        ${selected
          ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-900"
        }
        ${active ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-zinc-950" : ""}
      `}
      onClick={onToggle}
    >
      <div className="p-4 flex items-start gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {pictureUrl ? (
            <Image
              src={pictureUrl}
              alt={name}
              width={56}
              height={56}
              className="rounded-full object-cover border border-zinc-700"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-400">
              {name.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Check de selección */}
          {selected && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-zinc-100 truncate">{name}</h3>
          {category && (
            <p className="text-sm text-zinc-500 mt-0.5 truncate">{category}</p>
          )}

          {active && (
            <span className="inline-block mt-2 text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
              Página activa
            </span>
          )}
        </div>
      </div>

      {/* Botón para marcar como activa (solo si está seleccionada) */}
      {selected && !active && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetActive();
          }}
          className="absolute bottom-3 right-3 text-xs text-zinc-400 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          Usar como activa
        </button>
      )}
    </div>
  );
}