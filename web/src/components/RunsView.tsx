"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Trash2, XCircle } from "lucide-react";
import { Chip, Modal, StatusDot } from "./ui";
import { shortDate } from "@/lib/theme";
import type { RunRecord } from "@/lib/types";

export function RunsView({
  runs,
  onClear,
}: {
  runs: RunRecord[];
  onClear: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "complete" | "error">("all");
  const [selected, setSelected] = useState<RunRecord | null>(null);

  const filtered = useMemo(
    () =>
      runs.filter((run) => (filter === "all" ? true : run.status === filter)),
    [runs, filter],
  );

  const completed = runs.filter((run) => run.status === "complete").length;
  const failed = runs.filter((run) => run.status === "error").length;
  const totalUnits = runs.reduce((sum, run) => sum + run.units, 0);

  return (
    <section className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-slate-100">Runs / Tareas</h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Ejecuciones del orquestador, modelo usado y resultado de
            verificación.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] text-slate-500">
          <span>
            <span className="text-neon-green">{completed}</span> completadas
          </span>
          <span>
            <span className="text-neon-red">{failed}</span> con error
          </span>
          <span>
            <span className="text-neon-cyan">{totalUnits}</span> units totales
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          {(
            [
              ["all", `Todas ${runs.length}`],
              ["complete", `Completadas ${completed}`],
              ["error", `Con error ${failed}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-md border px-2 py-1 font-mono text-[9px] transition ${
                filter === id
                  ? "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan"
                  : "border-white/5 bg-white/[0.02] text-slate-500 hover:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={runs.length === 0}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-white/5 px-2 py-1 font-mono text-[9px] text-slate-500 transition hover:text-neon-red disabled:opacity-30"
        >
          <Trash2 size={10} /> limpiar historial
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {filtered.map((run) => (
          <button
            key={run.id}
            type="button"
            onClick={() => setSelected(run)}
            className={`neon-card w-full px-3 py-3 text-left transition hover:bg-white/[0.015] sm:px-4 ${
              run.status === "complete" ? "glow-green" : "glow-red"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 shrink-0">
                  {run.status === "complete" ? (
                    <CheckCircle2 size={14} className="text-neon-green" />
                  ) : (
                    <XCircle size={14} className="text-neon-red" />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-slate-200">
                    {run.prompt}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] text-slate-500">
                    <Clock size={9} />
                    <span>{shortDate(run.startedAt)}</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-neon-cyan/80">{run.model}</span>
                    <span className="text-slate-700">·</span>
                    <span>{(run.durationMs / 1000).toFixed(1)}s</span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 font-mono text-[9px]">
                <StatusDot color="green" />
                <span className="text-slate-400">{run.verified} ok</span>
                <StatusDot color="red" />
                <span className="text-slate-400">{run.rejected} rej</span>
                <span className="ml-1 rounded bg-white/5 px-1.5 py-0.5 text-slate-400">
                  {run.units} unidades
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-white/10 px-4 py-10 text-center font-mono text-[10px] text-slate-600">
          no hay corridas en este filtro
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-1.5 font-mono text-[9px] text-slate-600">
        <Chip>modelo por corrida</Chip>
        <Chip>unidades verificadas</Chip>
        <Chip>rechazos auditables</Chip>
        <Chip>cola real · Fase 2</Chip>
      </div>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Detalle de la corrida"
        subtitle={selected ? shortDate(selected.startedAt) : undefined}
        size="lg"
      >
        {selected ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-200">
              {selected.prompt}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["unidades", selected.units, "text-neon-cyan"],
                ["verificadas", selected.verified, "text-neon-green"],
                ["rechazadas", selected.rejected, "text-neon-red"],
                ["modelo", selected.model, "text-neon-purple"],
              ].map(([label, value, color]) => (
                <div
                  key={label}
                  className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5"
                >
                  <div className="font-mono text-[8px] uppercase tracking-wider text-slate-500">
                    {label}
                  </div>
                  <div className={`mt-0.5 truncate text-sm ${color}`}>{value}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-slate-500">
                log de la corrida
              </div>
              {selected.logs.length > 0 ? (
                <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-lg border border-white/5 bg-[#050509] p-2 font-mono text-[9px]">
                  {selected.logs.map((entry) => (
                    <div key={entry.id} className="flex gap-2">
                      <span className="shrink-0 text-slate-600">{entry.time}</span>
                      <span className="w-14 shrink-0 text-slate-500">
                        {entry.source}
                      </span>
                      <span className="text-slate-400">{entry.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center font-mono text-[9px] text-slate-600">
                  sin log detallado para esta corrida semilla
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
