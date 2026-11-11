"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, RotateCcw, TriangleAlert, X } from "lucide-react";
import {
  listMemoria,
  listTareas,
  reintentarTarea,
  type MemoryEntry as ApiMemoryEntry,
  type Tarea,
} from "@/lib/api";
import { bgSoft, colorForName, line, text } from "@/lib/theme";
import type { Character, Color, RunState } from "@/lib/types";

const ROW_H = 34;
const FIELD_W = 840;
const MAX_NODES = 130;

const TIPO_LABEL: Record<string, string> = {
  fb_publicar: "post",
  fb_comentar: "comment",
  fb_responder: "reply",
  fb_reaccionar: "react",
  fb_leer_comentarios: "read·c",
  fb_leer_posts: "read·p",
};

const ESTADO_HEX: Record<string, string> = {
  completada: "#00ff9d",
  fallida: "#ff3355",
  en_ejecucion: "#ffee00",
  programada: "#00f0ff",
  pendiente: "#94a3b8",
  en_espera: "#94a3b8",
  cancelada: "#475569",
};

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface Nodo {
  id: string;
  label: string;
  estado: string;
  verificado: boolean;
  color: Color;
  anchorY: number;
  x: number;
  y: number;
  path: string;
}

export function MeshField({
  characters,
  run,
  onConfigureCharacter,
  className = "",
}: {
  characters: Character[];
  run: RunState;
  onConfigureCharacter: (character: Character) => void;
  className?: string;
}) {
  const [tareas, setTareas] = useState<Tarea[] | null>(null);
  const [memoria, setMemoria] = useState<ApiMemoryEntry[]>([]);
  const [backendOk, setBackendOk] = useState(true);
  const [overlayOpen, setOverlayOpen] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [t, m] = await Promise.all([listTareas(), listMemoria()]);
      setTareas(t);
      setMemoria(m);
      setBackendOk(true);
    } catch {
      setBackendOk(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 4000);
    return () => clearInterval(id);
  }, [refresh]);

  const ordered = useMemo(() => {
    const score = (c: Character) =>
      (c.estado === "activo" ? 0 : c.estado === "en_preparacion" ? 1 : 2) * 100 -
      (c.actividad ?? 5);
    return [...characters].sort((a, b) => score(a) - score(b));
  }, [characters]);

  const anchorIndex = useMemo(() => {
    const map = new Map<string, number>();
    ordered.forEach((c, i) => map.set(c.id, i));
    return map;
  }, [ordered]);

  const fbTareas = useMemo(
    () => (tareas ?? []).filter((t) => t.tipo.startsWith("fb_")),
    [tareas],
  );

  const stats = useMemo(() => {
    const completadas = fbTareas.filter((t) => t.estado === "completada");
    return {
      unidades: fbTareas.length,
      completadas: completadas.length,
      verificadas: completadas.filter(
        (t) => (t.resultado as Record<string, unknown> | null)?.verificado === true,
      ).length,
      fallidas: fbTareas.filter((t) => t.estado === "fallida").length,
      enCola: fbTareas.filter((t) =>
        ["pendiente", "programada", "en_espera"].includes(t.estado),
      ).length,
      comentarios: completadas.filter((t) => t.tipo === "fb_comentar").length,
      ejecutando: fbTareas.some((t) => t.estado === "en_ejecucion"),
    };
  }, [fbTareas]);

  const ultimaFallida = useMemo(() => {
    const f = fbTareas.filter((t) => t.estado === "fallida");
    f.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
    return f[0] ?? null;
  }, [fbTareas]);

  const memoria24h = useMemo(() => {
    const desde = Date.now() - 24 * 3600 * 1000;
    return memoria.filter((m) => new Date(m.created_at).getTime() >= desde).length;
  }, [memoria]);

  const barras = useMemo(() => {
    const dias: number[] = Array(7).fill(0);
    for (const t of fbTareas) {
      const d = Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000);
      if (d >= 0 && d < 7) dias[6 - d] += 1;
    }
    const max = Math.max(1, ...dias);
    return dias.map((n) => Math.max(8, Math.round((n / max) * 100)));
  }, [fbTareas]);

  const H = Math.max(470, ordered.length * ROW_H + 10);

  const nodos: Nodo[] = useMemo(() => {
    const out: Nodo[] = [];
    if (tareas === null || !backendOk) {
      // Sin backend: el campo muestra las unidades de la corrida local.
      run.units.forEach((unit, i) => {
        const character = ordered.length
          ? ordered[i % ordered.length]
          : undefined;
        const color = character?.color ?? "cyan";
        const anchorY = character
          ? (anchorIndex.get(character.id) ?? 0) * ROW_H + ROW_H / 2
          : 14;
        const x = 110 + (hash(unit.id + unit.label) % 620);
        const y = 24 + (hash(unit.label + unit.id) % Math.max(60, H - 60));
        out.push({
          id: unit.id,
          label: unit.label,
          estado:
            unit.status === "verified"
              ? "completada"
              : unit.status === "rejected"
                ? "fallida"
                : "en_ejecucion",
          verificado: unit.status === "verified",
          color,
          anchorY,
          x,
          y,
          path: `M0 ${anchorY} C ${x * 0.35} ${anchorY}, ${x * 0.62} ${y}, ${x} ${y}`,
        });
      });
      return out.slice(0, MAX_NODES);
    }

    const sorted = [...fbTareas].sort((a, b) =>
      (a.created_at ?? "").localeCompare(b.created_at ?? ""),
    );
    for (const t of sorted.slice(-MAX_NODES)) {
      const idx = t.personaje_id ? anchorIndex.get(t.personaje_id) : undefined;
      const character = idx !== undefined ? ordered[idx] : undefined;
      const color = character?.color ?? (t.personaje_id ? colorForName(t.personaje_id) : "blue");
      const anchorY = idx !== undefined ? idx * ROW_H + ROW_H / 2 : 14;
      const x = 104 + (hash(t.id) % 630);
      const y = 22 + (hash(t.id + t.tipo) % Math.max(60, H - 56));
      out.push({
        id: t.id,
        label: `${TIPO_LABEL[t.tipo] ?? t.tipo}·${t.id.slice(-4)}`,
        estado: t.estado,
        verificado:
          (t.resultado as Record<string, unknown> | null)?.verificado === true,
        color,
        anchorY,
        x,
        y,
        path: `M0 ${anchorY} C ${x * 0.35} ${anchorY}, ${x * 0.62} ${y}, ${x} ${y}`,
      });
    }
    return out;
  }, [tareas, backendOk, fbTareas, run.units, ordered, anchorIndex, H]);

  async function handleRetry() {
    if (!ultimaFallida || retrying) return;
    setRetrying(true);
    try {
      await reintentarTarea(ultimaFallida.id);
      await refresh();
    } catch {
      // el próximo sondeo refleja el estado real
    } finally {
      setRetrying(false);
    }
  }

  const enLinea = ordered.filter((c) => c.estado === "activo").length;

  return (
    <section
      className={`relative flex min-w-0 flex-col overflow-hidden bg-[#04040a] ${className}`}
    >
      {/* Tira de estadísticas, como la referencia */}
      <div className="flex items-end justify-between gap-3 border-b border-white/[0.04] px-3 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-mono text-[9px] text-slate-500">
            <span
              className={`h-1.5 w-1.5 animate-pulse rounded-full ${backendOk ? "bg-neon-red" : "bg-neon-yellow"}`}
            />
            {backendOk ? "EN VIVO" : "SIN BACKEND · corrida local"}
          </div>
          <div className="truncate text-[13px] text-slate-300">
            global <span className="text-slate-600">/</span>{" "}
            <span className="font-medium text-slate-100">pulse-os</span>
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-4 font-mono sm:gap-6">
          {[
            { n: enLinea, label: "personajes en línea", cls: "text-slate-100" },
            { n: stats.unidades, label: "unidades", cls: "text-slate-100" },
            { n: stats.verificadas, label: "verificadas", cls: "text-neon-green" },
            { n: stats.fallidas, label: "fallidas", cls: "text-neon-red" },
          ].map((s) => (
            <div key={s.label} className="text-right">
              <div className={`text-lg leading-none font-semibold ${s.cls}`}>
                {s.n}
              </div>
              <div className="mt-0.5 text-[8px] tracking-wide text-slate-500">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Columna de personajes (los «bots» del mesh) */}
        <div className="no-scrollbar order-1 flex shrink-0 gap-1 overflow-x-auto border-b border-white/[0.04] px-1.5 py-1.5 lg:w-[218px] lg:flex-col lg:gap-0 lg:overflow-x-hidden lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-0 lg:py-0">
          {ordered.map((character) => (
            <button
              key={character.id}
              type="button"
              onClick={() => onConfigureCharacter(character)}
              className="group flex h-[34px] w-[168px] shrink-0 items-center gap-2 border-l-2 px-2 text-left transition hover:bg-white/[0.03] lg:w-full"
              style={{ borderColor: line[character.color] }}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[9px] font-bold ${bgSoft[character.color]} ${text[character.color]}`}
              >
                {character.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] leading-tight text-slate-200">
                  {character.name}
                </span>
                <span className="flex items-center gap-1 font-mono text-[8px] leading-tight text-slate-500">
                  <span
                    className={`h-1 w-1 rounded-full ${
                      character.estado === "activo"
                        ? "bg-neon-green"
                        : character.estado === "en_preparacion"
                          ? "bg-neon-yellow"
                          : "bg-slate-600"
                    }`}
                  />
                  {character.estado === "activo"
                    ? "activo"
                    : character.estado === "en_preparacion"
                      ? "en preparación"
                      : "inactivo"}
                  {` · act ${character.actividad ?? 5}`}
                </span>
              </span>
              <ChevronRight
                size={12}
                className="shrink-0 text-slate-700 transition group-hover:text-slate-400"
              />
            </button>
          ))}
          {ordered.length === 0 ? (
            <div className="px-3 py-4 font-mono text-[9px] text-slate-600">
              todavía no hay personajes
            </div>
          ) : null}
        </div>

        {/* Campo mesh */}
        <div className="relative order-2 min-h-[380px] min-w-0 flex-1 lg:min-h-0">
          <div className="mesh-grid absolute inset-0 opacity-[0.13]" />
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${FIELD_W} ${H}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            {nodos.map((nodo) => (
              <path
                key={`p-${nodo.id}`}
                d={nodo.path}
                fill="none"
                stroke={line[nodo.color]}
                strokeWidth={nodo.estado === "en_ejecucion" ? 1.4 : 1}
                strokeOpacity={
                  nodo.estado === "cancelada"
                    ? 0.1
                    : nodo.estado === "en_ejecucion"
                      ? 0.9
                      : nodo.estado === "programada" || nodo.estado === "pendiente"
                        ? 0.28
                        : 0.5
                }
                className={nodo.estado === "en_ejecucion" ? "mesh-flow" : undefined}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {nodos
              .filter((n) => n.estado === "en_ejecucion")
              .slice(0, 10)
              .map((nodo) => (
                <circle
                  key={`d-${nodo.id}`}
                  r="2"
                  fill={line[nodo.color]}
                  opacity="0.95"
                >
                  <animateMotion
                    dur={`${2 + (hash(nodo.id) % 14) / 10}s`}
                    repeatCount="indefinite"
                    path={nodo.path}
                  />
                </circle>
              ))}
            {nodos.map((nodo) => (
              <g key={`n-${nodo.id}`} opacity={nodo.estado === "cancelada" ? 0.35 : 1}>
                <rect
                  x={nodo.x}
                  y={nodo.y - 8}
                  width={86}
                  height={16}
                  rx={4}
                  fill="#0a0a14"
                  stroke={ESTADO_HEX[nodo.estado] ?? "#475569"}
                  strokeOpacity={0.75}
                  strokeWidth={0.8}
                />
                <circle
                  cx={nodo.x + 7}
                  cy={nodo.y}
                  r={2.2}
                  fill={ESTADO_HEX[nodo.estado] ?? "#475569"}
                />
                <text
                  x={nodo.x + 13}
                  y={nodo.y + 3}
                  fontSize={8.5}
                  fill={nodo.verificado ? "#a7f3d0" : "#cbd5e1"}
                  fontFamily="monospace"
                >
                  {nodo.label}
                </text>
              </g>
            ))}
          </svg>

          {nodos.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <p className="max-w-[300px] font-mono text-[10px] leading-relaxed text-slate-600">
                sin unidades todavía.
                <br />
                cuando el ejecutor publique, comente o reaccione, cada tarea
                aparece acá como una unidad del mesh.
              </p>
            </div>
          ) : null}

          {/* Panel de salida verificada (el cierre de la referencia) */}
          {stats.completadas > 0 ? (
            overlayOpen ? (
              <div className="absolute right-3 bottom-3 z-20 w-[332px] max-w-[calc(100%-24px)] rounded-xl border border-neon-green/25 bg-[#060a08]/95 p-3 shadow-[0_0_32px_rgba(0,255,157,0.12)] backdrop-blur">
                <button
                  type="button"
                  onClick={() => setOverlayOpen(false)}
                  className="absolute top-2 right-2 text-slate-500 transition hover:text-slate-300"
                  aria-label="Ocultar panel"
                >
                  <X size={13} />
                </button>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neon-green/60 bg-neon-green/10 text-neon-green shadow-[0_0_16px_rgba(0,255,157,0.35)]">
                    <Check size={22} />
                  </span>
                  <div>
                    <div className="text-[11px] font-semibold tracking-[0.14em] text-neon-green">
                      SALIDA VERIFICADA
                    </div>
                    <div className="font-mono text-[9px] text-slate-400">
                      {stats.verificadas} / {stats.completadas} comprobadas en
                      Facebook
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 font-mono text-[8px] tracking-widest text-slate-500">
                  CIERRE DE MESH · pulse-os
                </div>
                <div className="text-[22px] leading-tight font-semibold text-slate-50">
                  {stats.unidades} unidades
                </div>
                <div className="font-mono text-[9px] text-slate-400">
                  {enLinea} personajes · {stats.fallidas} fallidas ·{" "}
                  {stats.enCola} en cola
                </div>

                <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
                    <div className="flex items-center justify-between font-mono text-[8px] text-slate-500">
                      <span>comentarios</span>
                      <Check size={9} className="text-neon-green" />
                    </div>
                    <div className="mt-0.5 text-[13px] font-medium text-slate-100">
                      {stats.comentarios}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
                    <div className="font-mono text-[8px] text-slate-500">
                      en cola · 7 días
                    </div>
                    <div className="mt-1 flex h-[18px] items-end gap-[3px]">
                      {barras.map((h, i) => (
                        <span
                          key={i}
                          className="w-[5px] rounded-sm bg-neon-cyan/70"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                      <span className="ml-1 text-[11px] font-medium text-slate-100">
                        {stats.enCola}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
                    <div className="font-mono text-[8px] text-slate-500">
                      MEMORIA · 24 h
                    </div>
                    <div className="mt-0.5 text-[13px] font-medium text-slate-100">
                      +{memoria24h}
                    </div>
                  </div>
                </div>

                {ultimaFallida ? (
                  <div className="mt-2 rounded-lg border border-neon-yellow/40 bg-neon-yellow/[0.06] px-2.5 py-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-neon-yellow">
                      <TriangleAlert size={11} />
                      {stats.fallidas}{" "}
                      {stats.fallidas === 1
                        ? "tarea necesita"
                        : "tareas necesitan"}{" "}
                      tu decisión
                    </div>
                    <p className="mt-0.5 line-clamp-2 font-mono text-[8.5px] leading-snug text-slate-400">
                      {ultimaFallida.tipo} ·{" "}
                      {ultimaFallida.error ?? "error sin detalle"}
                    </p>
                    <div className="mt-1.5 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleRetry()}
                        disabled={retrying}
                        className="flex items-center gap-1 rounded-md bg-neon-yellow px-2 py-1 font-mono text-[9px] font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
                      >
                        <RotateCcw size={10} />
                        {retrying ? "reintentando…" : "reintentar"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setOverlayOpen(true)}
                className="absolute right-3 bottom-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-neon-green/50 bg-[#060a08]/95 text-neon-green shadow-[0_0_16px_rgba(0,255,157,0.3)]"
                aria-label="Mostrar salida verificada"
              >
                <Check size={18} />
              </button>
            )
          ) : null}
        </div>
      </div>
    </section>
  );
}
