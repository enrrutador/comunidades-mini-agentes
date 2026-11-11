"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight, Link2, Settings2 } from "lucide-react";
import { Chip, Field, Modal, Toggle } from "./ui";
import { bgSoft, glow, text } from "@/lib/theme";
import type { Bot, UnitStatus } from "@/lib/types";

export type BotLiveState = "idle" | UnitStatus;

const UNIT_VERBS = ["run", "sort", "write", "send", "scan", "check", "reply", "book", "draft", "log", "review", "plan", "flag", "queue", "sync"];

export function unitCode(bot: Bot, index: number): string {
  const first = bot.name.toLowerCase().split(/[\s&-]+/)[0] ?? bot.name.toLowerCase();
  return `${first}_${UNIT_VERBS[index % UNIT_VERBS.length]}`;
}

function statusOf(liveState: BotLiveState, enabled: boolean) {
  if (liveState === "running") return { label: "Ejecutando", color: "cyan" as const, pulse: true };
  if (liveState === "verified") return { label: "Verificado", color: "green" as const, pulse: false };
  if (liveState === "rejected") return { label: "Rechazado", color: "red" as const, pulse: false };
  if (enabled) return { label: "Activo", color: "green" as const, pulse: false };
  return { label: "Pausado", color: "yellow" as const, pulse: false };
}

export function BotPill({
  bot,
  liveState = "idle",
  active = false,
}: {
  bot: Bot;
  liveState?: BotLiveState;
  active?: boolean;
}) {
  const status = statusOf(liveState, bot.enabled);
  return (
    <div
      className={`animate-pill flex shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap rounded-full border px-2 py-1.5 ${glow[bot.color]} ${
        liveState === "running" ? "animate-pulse" : ""
      } ${bot.enabled ? "" : "opacity-50"} ${active ? "ring-1 ring-white/40" : ""}`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${text[bot.color]} ${bgSoft[bot.color]} font-mono text-[7px] font-bold`}
      >
        {bot.tag}
      </span>
      <span className="min-w-0 truncate text-[11px] font-medium text-slate-100">
        {bot.name}
      </span>
      <span className={`shrink-0 font-mono text-[8px] ${text[status.color]}`}>
        {status.label === "Running" ? "···" : liveState === "verified" ? "ok" : ""}
      </span>
      <ChevronRight size={11} className="shrink-0 text-slate-500" />
    </div>
  );
}

export function BotCard({
  bot,
  liveState = "idle",
  active = false,
  onConfigure,
  onConnect,
}: {
  bot: Bot;
  liveState?: BotLiveState;
  active?: boolean;
  onConfigure: (bot: Bot) => void;
  onConnect: (bot: Bot) => void;
}) {
  const status = statusOf(liveState, bot.enabled);
  const tools = bot.tools
    .split(/[,/]/)
    .map((tool) => tool.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <article
      className={`neon-card ${glow[bot.color]} group flex min-h-[190px] flex-col p-2.5 transition ${
        bot.enabled ? "" : "opacity-55"
      } ${active ? "ring-1 ring-white/40" : ""}`}
    >
      {liveState === "running" ? (
        <span className="pointer-events-none absolute inset-0 animate-pulse rounded-[10px] ring-1 ring-white/25" />
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-[12px] font-medium text-slate-100">
            {bot.name}
          </h3>
        </div>
        <span
          className={`flex h-4.5 min-w-[22px] shrink-0 items-center justify-center rounded px-1 py-0.5 font-mono text-[8px] font-bold ${text[bot.color]} ${bgSoft[bot.color]} border border-current/30`}
        >
          {bot.tag}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <Toggle
          checked={bot.enabled}
          onChange={() => onConfigure(bot)}
          label=""
          compact
        />
        <span className="flex items-center gap-1 font-mono text-[8px]">
          <span
            className={`h-1 w-1 rounded-full ${
              status.pulse ? "animate-pulse" : ""
            } ${status.color === "green" ? "bg-neon-green" : status.color === "cyan" ? "bg-neon-cyan" : status.color === "red" ? "bg-neon-red" : "bg-neon-yellow"}`}
          />
          <span className={text[status.color]}>{status.label}</span>
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {tools.map((tool) => (
          <Chip key={tool}>{tool}</Chip>
        ))}
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1">
        <Chip>MEMORY.md</Chip>
      </div>

      <div className="mt-2 space-y-0.5 font-mono text-[8px] text-slate-500">
        <span className="block">• contexto propio</span>
        <span className="block">• ciclos: máx {bot.maxLoops}</span>
        <span className="block">• check: {bot.autoVerify ? "pase automático" : "manual"}</span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
        <button
          type="button"
          onClick={() => onConnect(bot)}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[9px] transition ${
            bot.connected
              ? "border-neon-green/30 bg-neon-green/10 text-neon-green"
              : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
          }`}
        >
          {bot.connected ? <Check size={10} /> : <Link2 size={10} />}
          {bot.connected ? "Conectado" : "→ Conectar"}
        </button>
        <button
          type="button"
          onClick={() => onConfigure(bot)}
          className="rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-neon-cyan"
          aria-label={`Configurar ${bot.name}`}
        >
          <Settings2 size={13} />
        </button>
      </div>
    </article>
  );
}

export function BotConfigModal({
  open,
  bot,
  globalModel,
  onClose,
  onSave,
}: {
  open: boolean;
  bot: Bot | null;
  globalModel: string;
  onClose: () => void;
  onSave: (bot: Bot) => void;
}) {
  const [draft, setDraft] = useState<Bot | null>(bot);

  useEffect(() => {
    if (open) setDraft(bot);
  }, [open, bot]);

  if (!draft) return null;

  function update<K extends keyof Bot>(key: K, value: Bot[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Configurar ${draft.name}`}
      subtitle="Instrucciones, modelo y condiciones de ejecución del bot."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="btn-primary"
          >
            Guardar bot
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${text[draft.color]} bg-white/5`}
            >
              {draft.tag}
            </span>
            <div>
              <div className="text-xs text-slate-200">{draft.name}</div>
              <div className="font-mono text-[9px] text-slate-500">
                {draft.tools}
              </div>
            </div>
          </div>
          <Toggle
            checked={draft.enabled}
            onChange={(value) => update("enabled", value)}
            label="Bot habilitado"
          />
        </div>

        <Field label="Instrucciones del bot">
          <textarea
            value={draft.instructions}
            onChange={(event) => update("instructions", event.target.value)}
            rows={4}
            className="input-neon resize-y leading-relaxed"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Modelo override" hint="vacío = modelo global">
            <input
              value={draft.model}
              onChange={(event) => update("model", event.target.value)}
              placeholder={globalModel}
              className="input-neon font-mono text-[11px]"
            />
          </Field>
          <Field label="Max loops">
            <input
              type="number"
              min={1}
              max={10}
              value={draft.maxLoops}
              onChange={(event) =>
                update("maxLoops", Number(event.target.value))
              }
              className="input-neon"
            />
          </Field>
        </div>

        <div className="space-y-2 rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-200">Verificación de salida</div>
              <div className="text-[10px] text-slate-500">
                Requiere pasar por el bot Check antes de publicar.
              </div>
            </div>
            <Toggle
              checked={draft.autoVerify}
              onChange={(value) => update("autoVerify", value)}
              label="Verificación"
            />
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-2">
            <div>
              <div className="text-xs text-slate-200">Conectar al mesh</div>
              <div className="text-[10px] text-slate-500">
                Recibe unidades del orquestador en cada corrida.
              </div>
            </div>
            <Toggle
              checked={draft.connected}
              onChange={(value) => update("connected", value)}
              label="Conectado"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
