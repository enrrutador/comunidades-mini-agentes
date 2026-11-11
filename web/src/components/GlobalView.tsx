"use client";

import { Composer } from "./Composer";
import { LogStrip } from "./LogStrip";
import { MeshField } from "./MeshField";
import { MeshGraph } from "./MeshGraph";
import type {
  Bot as BotType,
  Character,
  LogEntry,
  RunState,
  Settings,
} from "@/lib/types";

/**
 * Vista Global — la «cara» del sistema, replicando el diseño de
 * referencia (mesh de bots): grafo del orquestador a la izquierda,
 * personajes como nodos del mesh y el campo de unidades a la derecha,
 * con el cierre de salida verificada sobre datos reales del backend.
 */
export function GlobalView({
  bots,
  characters,
  run,
  logs,
  settings,
  configured,
  providerName,
  activeModel,
  models,
  onSetModel,
  onRun,
  onStop,
  onOpenSettings,
  onConfigureCharacter,
  onClearLogs,
}: {
  bots: BotType[];
  characters: Character[];
  run: RunState;
  logs: LogEntry[];
  settings: Settings;
  configured: boolean;
  providerName: string;
  activeModel: string;
  models: string[];
  onSetModel: (model: string) => void;
  llmReply: string;
  llmError: string;
  onRun: (prompt: string) => void;
  onStop: () => void;
  onOpenSettings: () => void;
  onConfigureBot: (bot: BotType) => void;
  onConnectBot: (bot: BotType) => void;
  onConfigureCharacter: (character: Character) => void;
  onClearLogs: () => void;
}) {
  const running = run.status === "running";
  const activos = characters.filter((c) => c.estado === "activo").length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden">
        <MeshGraph
          online={activos}
          characters={characters.length}
          running={running}
          className="order-1"
        />
        <MeshField
          characters={characters}
          run={run}
          onConfigureCharacter={onConfigureCharacter}
          className="order-2 min-h-[520px] flex-1 xl:min-h-0"
        />
      </div>

      <LogStrip logs={logs} onClear={onClearLogs} />
      <Composer
        running={running}
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
