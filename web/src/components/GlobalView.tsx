"use client";

import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { Composer } from "./Composer";
import { LogStrip } from "./LogStrip";
import { MeshField } from "./MeshField";
import { MeshGraph } from "./MeshGraph";
import type { Character, LogEntry } from "@/lib/types";

/**
 * Vista Global — la «cara» del sistema: estado del mesh a la izquierda,
 * personajes y tareas reales del backend (fb_*) a la derecha, y debajo
 * la respuesta del LLM SIEMPRE visible (contenido o error real).
 */
export function GlobalView({
  characters,
  charactersError,
  logs,
  configured,
  providerName,
  activeModel,
  models,
  onSetModel,
  llmReply,
  llmError,
  sending,
  onRun,
  onStop,
  onDismissReply,
  onOpenSettings,
  onConfigureCharacter,
  onNewCharacter,
  onClearLogs,
}: {
  characters: Character[];
  charactersError: string;
  logs: LogEntry[];
  configured: boolean;
  providerName: string;
  activeModel: string;
  models: { id: string; label: string }[];
  onSetModel: (modeloId: string) => void;
  llmReply: string;
  llmError: string;
  sending: boolean;
  onRun: (prompt: string) => void;
  onStop: () => void;
  onDismissReply: () => void;
  onOpenSettings: () => void;
  onConfigureCharacter: (character: Character) => void;
  onNewCharacter: () => void;
  onClearLogs: () => void;
}) {
  const showPanel = sending || llmReply !== "" || llmError !== "";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden">
        <MeshGraph
          characters={characters}
          running={sending}
          className="order-1"
        />
        <MeshField
          characters={characters}
          onConfigureCharacter={onConfigureCharacter}
          onNewCharacter={onNewCharacter}
          className="order-2 min-h-[520px] flex-1 xl:min-h-0"
        />
      </div>

      {charactersError ? (
        <div className="flex shrink-0 items-start gap-2 border-t border-neon-red/30 bg-neon-red/[0.07] px-3 py-2 text-[11px] leading-relaxed text-neon-red sm:px-4">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{charactersError}</span>
        </div>
      ) : null}

      {showPanel ? (
        <div
          className={`max-h-[38dvh] shrink-0 overflow-y-auto border-t px-3 py-2.5 sm:px-4 ${
            llmError
              ? "border-neon-red/30 bg-[#12060a]"
              : "border-neon-green/20 bg-[#060a08]"
          }`}
        >
          <div className="flex items-center gap-2">
            {sending ? (
              <Loader2 size={13} className="animate-spin text-neon-cyan" />
            ) : llmError ? (
              <AlertCircle size={13} className="text-neon-red" />
            ) : (
              <CheckCircle2 size={13} className="text-neon-green" />
            )}
            <span
              className={`font-mono text-[9px] uppercase tracking-[0.18em] ${
                llmError ? "text-neon-red" : "text-slate-400"
              }`}
            >
              {sending
                ? `esperando respuesta de ${providerName}…`
                : llmError
                  ? "el envío falló"
                  : `respuesta · ${providerName}`}
            </span>
            {!sending ? (
              <button
                type="button"
                onClick={onDismissReply}
                className="ml-auto rounded p-0.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
                aria-label="Cerrar respuesta"
              >
                <X size={13} />
              </button>
            ) : null}
          </div>
          {llmError ? (
            <p className="mt-1.5 text-[12px] leading-relaxed text-neon-red">
              {llmError}
            </p>
          ) : llmReply ? (
            <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-200">
              {llmReply}
            </p>
          ) : (
            <p className="mt-1.5 font-mono text-[10px] text-slate-500">
              El proveedor está procesando tu mensaje; la respuesta aparece acá,
              no hace falta mirar otro lado.
            </p>
          )}
        </div>
      ) : null}

      <LogStrip logs={logs} onClear={onClearLogs} />
      <Composer
        running={sending}
        configured={configured}
        providerName={providerName}
        model={activeModel}
        models={models}
        onSetModel={onSetModel}
        onRun={onRun}
        onStop={onStop}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
}
