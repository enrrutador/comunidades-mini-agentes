"use client";

import { useState } from "react";
import { Send, Settings2, Square, Sparkles } from "lucide-react";

const SUGGESTIONS = [
  "Prepará mi semana y dejá la bandeja en cero",
  "Planificá contenido para la comunidad",
  "Revisá memoria y prioridades de mañana",
];

export function Composer({
  running,
  configured,
  providerName,
  model,
  onRun,
  onStop,
  onOpenSettings,
}: {
  running: boolean;
  configured: boolean;
  providerName: string;
  model: string;
  onRun: (prompt: string) => void;
  onStop: () => void;
  onOpenSettings: () => void;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const prompt = value.trim();
    if (!prompt || running) return;
    onRun(prompt);
    setValue("");
  }

  return (
    <div className="shrink-0 border-t border-[#1a1a2e] bg-[#07070d] px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-4">
      {!running ? (
        <div className="no-scrollbar mb-1.5 hidden items-center gap-1.5 overflow-x-auto sm:flex">
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-slate-600">
            sugerencias
          </span>
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setValue(suggestion)}
              className="shrink-0 rounded-full border border-white/5 bg-white/[0.02] px-2 py-0.5 text-[10px] text-slate-500 transition hover:border-neon-cyan/20 hover:text-slate-300"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0b0b13] transition focus-within:border-neon-cyan/40 focus-within:shadow-[0_0_0_3px_rgba(0,240,255,0.05)]">
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value.slice(0, 2000))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Describí una tarea…"
            className="max-h-32 w-full resize-none bg-transparent px-3 py-2.5 text-base leading-snug text-slate-200 outline-none placeholder:text-slate-600 sm:text-sm"
          />
          <div className="flex items-center gap-2 px-2 pb-1.5">
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-1 rounded px-1 py-0.5 font-mono text-[9px] text-slate-500 transition hover:text-neon-cyan"
              title="Configuración multiproveedor"
            >
              <Settings2 size={10} />
              <span className="max-w-[90px] truncate">{providerName}</span>
            </button>
            <span className="h-2 w-px bg-white/10" />
            <span className="truncate font-mono text-[9px] text-slate-500">
              {model || "sin modelo"}
            </span>
            <span
              className={`rounded px-1 py-0.5 font-mono text-[8px] ${
                configured
                  ? "bg-neon-green/10 text-neon-green"
                  : "bg-neon-yellow/10 text-neon-yellow"
              }`}
            >
              {configured ? "LLM" : "demo"}
            </span>
            <span className="ml-auto hidden font-mono text-[8px] text-slate-600 sm:inline">
              {running ? "ejecutando…" : "Enter ejecuta · Shift+Enter salto"}
            </span>
            <span className="font-mono text-[8px] text-slate-600">
              {value.length}/2000
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={running ? onStop : submit}
          disabled={!running && !value.trim()}
          className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl transition ${
            running
              ? "border border-neon-red/40 bg-neon-red/10 text-neon-red hover:bg-neon-red/15"
              : "bg-gradient-to-br from-neon-cyan to-[#7a5cff] text-[#05050a] shadow-[0_0_18px_rgba(0,240,255,0.25)] hover:brightness-110 disabled:opacity-30 disabled:shadow-none"
          }`}
          aria-label={running ? "Detener corrida" : "Ejecutar tarea"}
        >
          {running ? <Square size={16} /> : <Send size={16} />}
        </button>
      </div>

      <div className="mt-1 flex items-center gap-1.5 font-mono text-[8px] text-slate-600">
        <Sparkles size={9} className="text-neon-purple/60" />
        {configured
          ? "El orquestador usa el proveedor activo y las reglas del workspace."
          : "Modo demo: configurá una API key para respuestas reales del LLM."}
      </div>
    </div>
  );
}
