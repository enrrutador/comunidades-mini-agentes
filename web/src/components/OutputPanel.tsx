"use client";

import {
  AlertCircle,
  Check,
  Loader2,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { Chip } from "./ui";
import type { Bot, RunStatus, Unit } from "@/lib/types";

function Bars({ color }: { color: string }) {
  const heights = [22, 38, 30, 52, 44, 66, 58, 80, 70, 92];
  return (
    <div className="mt-1 flex h-6 items-end gap-[2px]">
      {heights.map((height, index) => (
        <span
          key={index}
          className={`animate-bar flex-1 rounded-sm ${color}`}
          style={{ height: `${height}%`, animationDelay: `${index * 45}ms` }}
        />
      ))}
    </div>
  );
}

function ReportCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-white/[0.07] bg-white/[0.02] p-2">
      <div className="mb-1 font-mono text-[8px] text-slate-500">{title}</div>
      {children}
    </div>
  );
}

function ListLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1 font-mono text-[8px]">
      {ok ? (
        <Check size={8} className="shrink-0 text-neon-green" />
      ) : (
        <X size={8} className="shrink-0 text-neon-red" />
      )}
      <span className="min-w-0 truncate text-slate-500">{label}</span>
    </div>
  );
}

export function OutputPanel({
  status,
  units,
  expected,
  workspaceName,
  model,
  llmReply,
  llmError,
  bots,
  autoPay,
  configured,
  onOpenSettings,
  className = "",
}: {
  status: RunStatus;
  units: Unit[];
  expected: number;
  workspaceName: string;
  model: string;
  llmReply: string;
  llmError: string;
  bots: Bot[];
  autoPay: boolean;
  configured: boolean;
  onOpenSettings: () => void;
  className?: string;
}) {
  const verified = units.filter((unit) => unit.status === "verified").length;
  const rejected = units.filter((unit) => unit.status === "rejected").length;
  const running = status === "running";
  const complete = status === "complete";
  const progress = expected > 0 ? Math.round((units.length / expected) * 100) : 0;
  const online = bots.filter((bot) => bot.enabled).length;
  const activeUnit = units.find((unit) => unit.status === "running");

  return (
    <aside
      className={`flex w-full flex-col border-t border-[#1a1a2e] bg-[#05050a] xl:w-[310px] xl:border-t-0 xl:border-l 2xl:w-[340px] ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#1a1a2e] px-3 py-2 font-mono text-[9px]">
        <span className="text-slate-500">SALIDA</span>
        <span
          className={
            running
              ? "text-neon-cyan"
              : complete
              ? "text-neon-green"
              : "text-slate-600"
          }
        >
          {running ? "ejecutando" : complete ? "verificado" : "inactivo"}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {complete ? (
          <div className="animate-rise space-y-2.5">
            <div className="flex flex-col items-center py-2">
              <div className="animate-check-burst flex h-14 w-14 items-center justify-center rounded-full border border-neon-green/60 bg-neon-green/10 text-neon-green">
                <Check size={26} strokeWidth={2.5} />
              </div>
              <div className="mt-2 font-mono text-[9px] tracking-widest text-neon-green">
                SALIDA VERIFICADA
              </div>
              <div className="font-mono text-[9px] text-slate-500">
                {verified + rejected} / {expected} verificadas
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="font-mono text-[8px] text-neon-green">
                ● RUN COMPLETO · {workspaceName}
              </div>
              <div className="mt-0.5 text-3xl font-semibold tracking-tight text-slate-50">
                {units.length} unidades
              </div>
              <div className="mt-1 flex flex-wrap gap-x-2 font-mono text-[8px] text-slate-500">
                <span>{online} bots</span>
                <span className="text-neon-red">{rejected} rechazadas</span>
                <span className="text-neon-yellow">3 reglas</span>
                <span className="text-neon-green">0 rotas</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <ReportCard title="Bandeja · cero">
                <div className="space-y-0.5">
                  <ListLine ok label="respuestas ordenadas" />
                  <ListLine ok label="alertas despejadas" />
                  <ListLine ok={false} label="2 escalaron a humano" />
                </div>
              </ReportCard>
              <ReportCard title={`posts · ${verified} en cola`}>
                <Bars color="bg-neon-green/45" />
              </ReportCard>
              <ReportCard title="MEMORY.md · +3">
                <div className="space-y-0.5 font-mono text-[8px] text-slate-500">
                  <span className="block">responder con mi tono</span>
                  <span className="block">alertas bajo $1.200</span>
                  <span className="block">recortar 25% en facturas</span>
                </div>
              </ReportCard>
              <ReportCard title="pago · necesita tu ok">
                <div className="font-mono text-[8px] leading-snug text-slate-400">
                  transferencia $1.840 · contratista aprobada por vos
                </div>
                <div className="mt-1.5 flex gap-1">
                  <span className="rounded border border-neon-green/40 bg-neon-green/10 px-1.5 py-0.5 font-mono text-[8px] text-neon-green">
                    {autoPay ? "aprobado" : "aprobar"}
                  </span>
                  <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[8px] text-slate-400">
                    devolver
                  </span>
                </div>
              </ReportCard>
            </div>
          </div>
        ) : running ? (
          <div className="neon-card glow-cyan p-3">
            <div className="flex items-center justify-between gap-2 font-mono text-[8px] text-slate-500">
              <span>EJECUTANDO · {workspaceName}</span>
              <Loader2 size={11} className="animate-spin text-neon-cyan" />
            </div>
            <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-50">
              {units.length}
              <span className="ml-1 text-xs font-normal text-slate-500">
                / {expected} unidades
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple transition-all duration-300"
                style={{ width: `${Math.max(4, progress)}%` }}
              />
            </div>
            {activeUnit ? (
              <div className="mt-2 flex items-center gap-1.5 font-mono text-[9px]">
                <span className="h-1 w-1 animate-pulse rounded-full bg-neon-cyan" />
                <span className="text-neon-cyan">{activeUnit.label}</span>
                <span className="text-slate-600">ejecutando</span>
              </div>
            ) : null}
          </div>
        ) : status === "error" ? (
          <div className="rounded-lg border border-neon-red/30 bg-neon-red/[0.04] p-3">
            <div className="flex items-center gap-1.5 font-mono text-[9px] text-neon-red">
              <AlertCircle size={11} /> RUN DETENIDO
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
              La corrida se interrumpió. Podés revisar el log y volver a
              ejecutar.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.01] p-3">
            <div className="font-mono text-[9px] text-slate-500">
              SIN EJECUCIONES TODAVÍA
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
              Escribí una tarea abajo y el orquestador va a repartir unidades
              entre los bots conectados.
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Chip>prepará mi semana</Chip>
              <Chip>revisá la bandeja</Chip>
              <Chip>planificá contenido</Chip>
            </div>
            {!configured ? (
              <button
                type="button"
                onClick={onOpenSettings}
                className="mt-2 flex items-center gap-1 font-mono text-[9px] text-neon-cyan hover:underline"
              >
                <Settings2 size={10} /> Configurar proveedor LLM
              </button>
            ) : null}
          </div>
        )}

        {(() => {
          const generated = units.filter((unit) => unit.output);
          if (generated.length === 0) return null;
          return (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono text-[8px] text-slate-500">
                <span>CONTENIDO GENERADO</span>
                <span>{generated.length}</span>
              </div>
              {generated
                .slice()
                .reverse()
                .slice(0, 8)
                .map((unit) => {
                  const bot = bots.find((item) => item.id === unit.botId);
                  return (
                    <div
                      key={unit.id}
                      className="animate-chip-in rounded-md border border-white/[0.06] bg-white/[0.02] p-2"
                    >
                      <div className="flex items-center justify-between gap-1 font-mono text-[8px]">
                        <span className="truncate text-slate-300">
                          {unit.label}
                          {bot ? ` · ${bot.name}` : ""}
                        </span>
                        <span
                          className={
                            unit.status === "verified"
                              ? "text-neon-green"
                              : unit.status === "rejected"
                              ? "text-neon-red"
                              : "text-neon-cyan"
                          }
                        >
                          {unit.status === "verified"
                            ? "ok"
                            : unit.status === "rejected"
                            ? "rej"
                            : "···"}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] leading-snug text-slate-400">
                        {unit.output}
                      </p>
                    </div>
                  );
                })}
            </div>
          );
        })()}

        {llmReply ? (
          <div className="neon-card glow-cyan p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-mono text-[9px] text-neon-cyan">
                <Sparkles size={10} /> ORQUESTADOR
              </span>
              <span className="font-mono text-[8px] text-slate-500">{model}</span>
            </div>
            <p className="mt-1.5 max-h-40 overflow-y-auto whitespace-pre-wrap text-[10px] leading-relaxed text-slate-300 xl:max-h-56">
              {llmReply}
            </p>
          </div>
        ) : null}

        {llmError ? (
          <div className="rounded-lg border border-neon-red/30 bg-neon-red/[0.04] p-2.5">
            <div className="flex items-center gap-1.5 font-mono text-[9px] text-neon-red">
              <AlertCircle size={10} /> LLM
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
              {llmError}
            </p>
            <button
              type="button"
              onClick={onOpenSettings}
              className="mt-1.5 font-mono text-[9px] text-neon-cyan hover:underline"
            >
              Revisar configuración →
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
