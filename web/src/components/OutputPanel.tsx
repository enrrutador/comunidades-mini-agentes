"use client";

import type { ReactNode } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  Settings2,
  Sparkles,
} from "lucide-react";
import { Chip, StatusDot } from "./ui";
import { dot, text } from "@/lib/theme";
import type { Bot, RunStatus, Unit } from "@/lib/types";

function MiniCard({
  label,
  value,
  color,
  children,
}: {
  label: string;
  value: string;
  color: "cyan" | "green" | "purple" | "pink";
  children?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-white/5 bg-white/[0.02] p-2">
      <div className="flex items-center justify-between gap-1 font-mono text-[8px] text-slate-500">
        <span className="truncate">{label}</span>
        <StatusDot color={color} />
      </div>
      <div className={`mt-1 text-[11px] font-medium ${text[color]}`}>{value}</div>
      {children}
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
  const activeUnit = units.find((unit) => unit.status === "running");
  const activeBot = bots.find((bot) => bot.id === activeUnit?.botId);

  return (
    <aside
      className={`flex w-full flex-col border-t border-[#1a1a2e] bg-[#06060b] xl:w-[292px] xl:border-t-0 xl:border-l 2xl:w-[320px] ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#1a1a2e] px-3 py-2 font-mono text-[9px]">
        <span className="text-slate-500">OUTPUT STREAM</span>
        <span
          className={
            running
              ? "text-neon-cyan"
              : complete
              ? "text-neon-green"
              : "text-slate-600"
          }
        >
          {running ? "running" : complete ? "verified" : "idle"}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {status === "idle" ? (
          <p className="font-mono text-[9px] leading-relaxed text-slate-600 xl:hidden">
            Escribí una tarea abajo para que el orquestador reparta unidades
            entre los bots conectados.
          </p>
        ) : null}

        {complete ? (
          <div className="animate-rise space-y-3">
            <div className="neon-card glow-green p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-mono text-[8px] tracking-widest text-slate-500">
                    RUN COMPLETE · {workspaceName}
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-100">
                    {units.length} units
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neon-green/40 bg-neon-green/10 text-neon-green shadow-[0_0_18px_rgba(0,255,157,0.25)]">
                  <Check size={18} />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[8px] text-slate-500">
                <span>{bots.filter((bot) => bot.enabled).length} bots</span>
                <span className="text-neon-red">{rejected} rejected</span>
                <span>check ok</span>
                <span className="text-neon-green">{verified} verified</span>
              </div>
              <div className="mt-2 flex items-center gap-1 font-mono text-[8px] text-neon-green/80">
                <Check size={9} /> VERIFIED OUTPUT
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MiniCard label="inbox" value="zero" color="cyan">
                <div className="mt-1 flex h-5 items-end gap-0.5">
                  {[30, 55, 40, 70, 45, 80, 60, 90].map((height, index) => (
                    <span
                      key={index}
                      className="animate-bar flex-1 rounded-sm bg-neon-cyan/40"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </MiniCard>
              <MiniCard
                label="posts"
                value={`${verified} queued`}
                color="green"
              >
                <div className="mt-1 flex h-5 items-end gap-0.5">
                  {[20, 35, 50, 45, 65, 70, 85, 95].map((height, index) => (
                    <span
                      key={index}
                      className="animate-bar flex-1 rounded-sm bg-neon-green/40"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </MiniCard>
              <MiniCard label="memory.md" value="+3" color="purple">
                <div className="mt-1 truncate font-mono text-[8px] text-slate-600">
                  reglas aplicadas
                </div>
              </MiniCard>
              <MiniCard
                label="payment"
                value={autoPay ? "auto-pay" : "needs you"}
                color="pink"
              >
                <div className="mt-1 truncate font-mono text-[8px] text-slate-600">
                  {autoPay ? "aprobación automática" : "1 pago retenido"}
                </div>
              </MiniCard>
            </div>
          </div>
        ) : running ? (
          <div className="neon-card glow-cyan p-3">
            <div className="flex items-center justify-between gap-2 font-mono text-[8px] text-slate-500">
              <span>RUNNING · {workspaceName}</span>
              <Loader2 size={11} className="animate-spin text-neon-cyan" />
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-100">
              {units.length}
              <span className="ml-1 text-xs font-normal text-slate-500">
                / {expected} units
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple transition-all duration-300"
                style={{ width: `${Math.max(4, progress)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center gap-1.5 font-mono text-[9px] text-slate-400">
              <StatusDot color="cyan" pulse />
              {activeBot ? (
                <>
                  unit {units.length} · {activeBot.name.toLowerCase()}
                </>
              ) : (
                "asignando unidades…"
              )}
            </div>
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
          <div className="hidden rounded-lg border border-dashed border-white/10 bg-white/[0.01] p-3 xl:block">
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

        {llmReply ? (
          <div className="neon-card glow-cyan p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-mono text-[9px] text-neon-cyan">
                <Sparkles size={10} /> ORQUESTADOR
              </span>
              <span className="font-mono text-[8px] text-slate-500">{model}</span>
            </div>
            <p className="mt-1.5 max-h-32 overflow-y-auto whitespace-pre-wrap text-[10px] leading-relaxed text-slate-300 xl:max-h-44">
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

        <div className="hidden xl:block">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[8px] text-slate-600">
            <span>UNITS</span>
            <span>
              {verified} ok · {rejected} rejected
            </span>
          </div>
          <div className="space-y-1">
            {units.length === 0 ? (
              <div className="rounded border border-white/5 bg-white/[0.01] px-2 py-1.5 font-mono text-[9px] text-slate-600">
                esperando task graph…
              </div>
            ) : (
              units
                .slice()
                .reverse()
                .slice(0, 10)
                .map((unit) => {
                  const bot = bots.find((item) => item.id === unit.botId);
                  return (
                    <div
                      key={unit.id}
                      className="flex items-center gap-2 rounded border border-white/5 bg-white/[0.02] px-2 py-1 font-mono text-[9px]"
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          bot ? dot[bot.color] : "bg-slate-600"
                        }`}
                      />
                      <span className="shrink-0 text-slate-600">{unit.id}</span>
                      <span className="min-w-0 flex-1 truncate text-slate-400">
                        {bot?.name ?? unit.label}
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
                          : "run"}
                      </span>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
