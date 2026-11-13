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
        relative rounded-xl border transition-all duration-150 active:scale-[0.98]
        ${selected
          ? "border-blue-500/70 bg-blue-500/10"
          : "border-zinc-800 bg-zinc-900/40 active:bg-zinc-900"
        }
        ${active ? "ring-2 ring-blue-400/80 ring-offset-1 ring-offset-zinc-950" : ""}
      `}
      onClick={onToggle}
    >
      <div className="p-3.5 flex items-center gap-3.5">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {pictureUrl ? (
            <Image
              src={pictureUrl}
              alt={name}
              width={48}
              height={48}
              className="rounded-full object-cover border border-zinc-700/80"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-semibold text-zinc-400">
              {name.charAt(0).toUpperCase()}
            </div>
          )}

          {selected && (
            <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-zinc-950">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-zinc-100 text-[15px] leading-tight truncate">
            {name}
          </h3>
          {category && (
            <p className="text-xs text-zinc-500 mt-0.5 truncate">{category}</p>
          )}
          {active && (
            <span className="inline-block mt-1.5 text-[11px] font-medium text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-full">
              Página activa
            </span>
          )}
        </div>
      </div>

      {/* Acción secundaria: marcar como activa */}
      {selected && !active && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetActive();
          }}
          className="w-full text-center text-xs text-blue-400/90 active:text-blue-300 py-2 border-t border-zinc-800/80"
        >
          Usar como activa
        </button>
      )}
    </div>
  );
}