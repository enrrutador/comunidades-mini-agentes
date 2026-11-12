"use client";

import { GitBranch } from "lucide-react";
import { MODULES } from "@/lib/data";
import type { Character } from "@/lib/types";

/**
 * Panel de estado del mesh — reemplaza la antigua escena decorativa
 * (chips superpuestos, partículas y tarjetas sin estado real).
 * Muestra SOLO datos reales: los personajes que vinieron del backend,
 * si hay un envío en curso, y el catálogo estructural de módulos.
 * Todo en flujo normal, sin posicionamiento absoluto.
 */
export function MeshGraph({
  characters,
  running,
  className = "",
}: {
  characters: Character[];
  running: boolean;
  className?: string;
}) {
  const activos = characters.filter((c) => c.estado === "activo").length;

  return (
    <section
      className={`flex shrink-0 flex-col overflow-hidden border-b border-[#1a1a2e] bg-[#05050a] xl:h-full xl:w-[300px] xl:border-b-0 xl:border-r 2xl:w-[330px] ${className}`}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 font-mono text-[9px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              running ? "animate-pulse bg-neon-cyan" : "bg-neon-green"
            }`}
          />
          mesh
        </span>
        <span className="text-slate-400">{activos} en línea</span>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
        <div>
          <div className="text-[22px] leading-tight font-semibold text-slate-50">
            {characters.length}{" "}
            {characters.length === 1 ? "personaje" : "personajes"}
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
            {characters.length === 0
              ? "Todavía no hay personajes en el backend. Creá el primero desde la columna de personajes del campo."
              : `${activos} activos según el backend. Las unidades del mesh son las tareas reales (fb_*) y aparecen en el campo de la derecha.`}
          </p>
          <p className="mt-2 font-mono text-[9px] text-slate-500">
            orquestador:{" "}
            <span className={running ? "text-neon-cyan" : "text-slate-400"}>
              {running ? "esperando respuesta del proveedor…" : "en espera"}
            </span>
          </p>
        </div>

        <div>
          <div className="mb-1.5 font-mono text-[8px] tracking-widest text-slate-500">
            MÓDULOS DEL SISTEMA
          </div>
          <ul className="divide-y divide-white/[0.04] rounded-lg border border-white/[0.05]">
            {MODULES.map((modulo) => (
              <li
                key={modulo.id}
                className="flex items-baseline justify-between gap-2 px-2.5 py-1.5"
              >
                <span className="truncate text-[11px] text-slate-300">
                  {modulo.name}
                </span>
                <span className="shrink-0 font-mono text-[8px] text-slate-600">
                  {modulo.tools}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/[0.04] px-3 py-2 font-mono text-[8px] text-slate-600">
        <span className="flex items-center gap-1">
          <GitBranch size={9} className="text-neon-purple" /> grafo de tareas
        </span>
        <span>datos del backend</span>
      </div>
    </section>
  );
}
