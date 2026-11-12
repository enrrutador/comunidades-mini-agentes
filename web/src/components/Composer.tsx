"use client";

import { useState } from "react";
import { ChevronDown, Send, Settings2, Square } from "lucide-react";

export function Composer({
  running,
  configured,
  providerName,
  model,
  models = [],
  onSetModel,
  onRun,
  onStop,
  onOpenSettings,
}: {
  running: boolean;
  configured: boolean;
  providerName: string;
  model: string;
  models?: { id: string; label: string }[];
  onSetModel: (modeloId: string) => void;
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
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 pb-2 pt-0.5">
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-1 rounded px-1 py-1 font-mono text-[11px] text-slate-500 transition hover:text-neon-cyan"
              title="Proveedores LLM del backend"
            >
              <Settings2 size={10} />
              <span className="max-w-[90px] truncate">{providerName}</span>
            </button>
            <span className="h-2 w-px bg-white/10" />
            <div className="relative min-w-0">
              <select
                value={model}
                onChange={(event) => onSetModel(event.target.value)}
                aria-label="Modelo del LLM"
                className={`max-w-[150px] appearance-none truncate rounded bg-transparent py-1 pl-1 pr-4 font-mono text-[11px] outline-none transition hover:bg-white/5 sm:max-w-[210px] ${
                  model ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {models.length === 0 ? (
                  <option value="">sin modelos · cargá un proveedor en ⚙</option>
                ) : null}
                {models.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={9}
                className="pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>
            <span
              className={`shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[10px] ${
                configured
                  ? "bg-neon-green/10 text-neon-green"
                  : "bg-neon-yellow/10 text-neon-yellow"
              }`}
            >
              {configured ? "LLM · backend" : "sin proveedor"}
            </span>
            <span className="ml-auto hidden font-mono text-[8px] text-slate-600 sm:inline">
              {running ? "ejecutando…" : "Enter ejecuta · Shift+Enter salto"}
            </span>
            <span className="hidden font-mono text-[10px] text-slate-600 sm:inline">
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
          aria-label={running ? "Detener envío" : "Ejecutar tarea"}
        >
          {running ? <Square size={16} /> : <Send size={16} />}
        </button>
      </div>

      <div className="mt-1 font-mono text-[8px] leading-relaxed text-slate-600">
        {configured
          ? "El mensaje va al proveedor cargado en el backend; la respuesta (o el error real) aparece arriba de esta caja."
          : "Sin proveedor LLM: cargá uno en ⚙ → Proveedores (queda en el backend), sumale un modelo y probá la conexión ahí mismo."}
      </div>
    </div>
  );
}
