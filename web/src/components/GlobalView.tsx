"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Bot, Boxes, LayoutGrid, Users } from "lucide-react";
import { BotCard, BotPill, type BotLiveState } from "./BotCard";
import { CharacterCard } from "./CharacterCard";
import { Composer } from "./Composer";
import { LogStrip } from "./LogStrip";
import { MeshGraph } from "./MeshGraph";
import { OutputPanel } from "./OutputPanel";
import { StatusDot } from "./ui";
import { UnitWaterfall } from "./UnitWaterfall";
import type {
  Bot as BotType,
  Character,
  LogEntry,
  RunState,
  Settings,
  Unit,
} from "@/lib/types";

type Filter = "all" | "modules" | "workflow" | "characters";

const FILTERS: Array<{ id: Filter; label: string; icon: ReactNode }> = [
  { id: "all", label: "Todo", icon: <LayoutGrid size={11} /> },
  { id: "modules", label: "Módulos", icon: <Boxes size={11} /> },
  { id: "workflow", label: "Bots", icon: <Bot size={11} /> },
  { id: "characters", label: "Personajes", icon: <Users size={11} /> },
];

function SectionTitle({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <div className="mb-2 flex items-end justify-between gap-2">
      <div>
        <h2 className="text-xs font-medium text-slate-300">{title}</h2>
        <p className="font-mono text-[9px] text-slate-600">{subtitle}</p>
      </div>
      <span className="font-mono text-[9px] text-slate-500">{count}</span>
    </div>
  );
}

function botState(units: Unit[], botId: string): BotLiveState {
  for (let index = units.length - 1; index >= 0; index -= 1) {
    if (units[index].botId === botId) return units[index].status;
  }
  return "idle";
}

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
  llmReply,
  llmError,
  onRun,
  onStop,
  onOpenSettings,
  onConfigureBot,
  onConnectBot,
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
  const [filter, setFilter] = useState<Filter>("all");
  const running = run.status === "running";
  const activeUnit = run.units.find((unit) => unit.status === "running");

  const modules = useMemo(() => bots.filter((bot) => bot.kind === "module"), [bots]);
  const workflow = useMemo(
    () => bots.filter((bot) => bot.kind === "workflow"),
    [bots],
  );
  const communityCharacters = characters;

  const counts: Record<Filter, number> = {
    all: bots.length + communityCharacters.length,
    modules: modules.length,
    workflow: workflow.length,
    characters: communityCharacters.length,
  };

  function renderBots(list: BotType[]) {
    return (
      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(206px,1fr))]">
        {list.map((bot) => (
          <BotCard
            key={bot.id}
            bot={bot}
            liveState={botState(run.units, bot.id)}
            active={activeUnit?.botId === bot.id}
            onConfigure={onConfigureBot}
            onConnect={onConnectBot}
          />
        ))}
      </div>
    );
  }

  function renderCharacters(list: Character[]) {
    return (
      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(206px,1fr))]">
        {list.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            onConfigure={onConfigureCharacter}
          />
        ))}
      </div>
    );
  }

  function renderPills() {
    const ordered = [...bots].sort(
      (a, b) => Number(b.connected) - Number(a.connected),
    );
    return (
      <div className="flex h-full min-h-0 gap-2">
        <div className="no-scrollbar flex w-[46%] shrink-0 flex-col gap-1.5 overflow-y-auto py-2 pl-1">
          {ordered.map((bot, index) => (
            <BotPill
              key={bot.id}
              bot={bot}
              liveState={botState(run.units, bot.id)}
              active={activeUnit?.botId === bot.id}
            />
          ))}
        </div>
        <UnitWaterfall units={run.units} bots={bots} running={running} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden">
        <MeshGraph
          online={bots.filter((bot) => bot.enabled).length}
          characters={communityCharacters.length}
          running={running}
          className="order-1"
        />

        <div className="order-3 flex min-w-0 flex-1 flex-col xl:order-2">
          {running || run.status === "complete" ? (
            <div className="min-h-0 flex-1">{renderPills()}</div>
          ) : (
            <>
              <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-[#1a1a2e] bg-[#06060b]/95 px-3 py-2 backdrop-blur">
                <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                  {FILTERS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFilter(item.id)}
                      className={`flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-1 font-mono text-[9px] transition sm:px-2 ${
                        filter === item.id
                          ? "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan"
                          : "border-white/5 bg-white/[0.02] text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <span className="hidden sm:inline-flex">{item.icon}</span>
                      {item.label}
                      <span className="text-slate-600">{counts[item.id]}</span>
                    </button>
                  ))}
                </div>
                <div className="hidden shrink-0 items-center gap-1.5 font-mono text-[9px] text-slate-500 sm:flex">
                  <StatusDot color="green" />
                  <span>grafo listo</span>
                </div>
              </div>

              <div className="min-h-0 flex-1 p-3 xl:overflow-y-auto">
                {filter === "all" ? (
                  <div className="space-y-5">
                    <section>
                      <SectionTitle
                        title="Módulos del sistema"
                        subtitle="capa de inteligencia, memoria y orquestación"
                        count={modules.length}
                      />
                      {renderBots(modules)}
                    </section>
                    <section>
                      <SectionTitle
                        title="Bots de workflow"
                        subtitle="unidades ejecutables del grafo de tareas"
                        count={workflow.length}
                      />
                      {renderBots(workflow)}
                    </section>
                    <section>
                      <SectionTitle
                        title="Personajes"
                        subtitle="perfiles con identidad propia"
                        count={communityCharacters.length}
                      />
                      {communityCharacters.length > 0 ? (
                        renderCharacters(communityCharacters)
                      ) : (
                        <div className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center font-mono text-[10px] text-slate-600">
                          todavía no hay personajes
                        </div>
                      )}
                    </section>
                  </div>
                ) : filter === "modules" ? (
                  renderBots(modules)
                ) : filter === "workflow" ? (
                  renderBots(workflow)
                ) : communityCharacters.length > 0 ? (
                  renderCharacters(communityCharacters)
                ) : (
                  <div className="rounded-lg border border-dashed border-white/10 px-3 py-8 text-center font-mono text-[10px] text-slate-600">
                    todavía no hay personajes
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <OutputPanel
          status={run.status}
          units={run.units}
          expected={run.expected}
          workspaceName="pulse-os"
          model={configured ? activeModel : "demo"}
          llmReply={llmReply}
          llmError={llmError}
          bots={bots}
          autoPay={settings.autoPay}
          configured={configured}
          onOpenSettings={onOpenSettings}
          className="order-2 xl:order-3"
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
