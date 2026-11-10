"use client";

import { RefreshCw, Settings2 } from "lucide-react";
import { Stat } from "./ui";
import type { Tab } from "@/lib/types";
import { COMMUNITIES } from "@/lib/data";

const TABS: Tab[] = ["Global", "Bots", "Runs", "Rules", "Memory", "Comunidad"];

export interface HeaderStats {
  online: number;
  units: number;
  verified: number;
  rejected: number;
  rules: number;
}

export function Header({
  activeTab,
  onTab,
  workspace,
  onWorkspace,
  onRefresh,
  stats,
  configured,
  model,
  running,
  onSettings,
}: {
  activeTab: Tab;
  onTab: (tab: Tab) => void;
  workspace: string;
  onWorkspace: (id: string) => void;
  onRefresh: () => void;
  stats: HeaderStats;
  configured: boolean;
  model: string;
  running: boolean;
  onSettings: () => void;
}) {
  return (
    <header className="z-30 shrink-0 border-b border-[#1a1a2e] bg-[#07070d]/95 backdrop-blur">
      <div className="flex h-12 items-center gap-2 px-3 sm:gap-4 sm:px-5">
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple text-[10px] font-bold text-black shadow-neon-cyan">
            P
          </div>
          <span className="hidden text-sm font-semibold tracking-wide sm:inline">
            PULSE <span className="text-neon-cyan">MESH</span>
          </span>
        </div>

        <nav className="no-scrollbar flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto sm:gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTab(tab)}
              className={`shrink-0 whitespace-nowrap rounded-md px-1 py-1.5 text-[11px] transition sm:px-3 sm:text-xs ${
                activeTab === tab
                  ? "border border-neon-cyan/30 bg-[#12121f] text-neon-cyan"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onSettings}
            className="hidden items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.03] px-2 py-1 font-mono text-[9px] text-slate-400 transition hover:border-white/15 hover:text-slate-200 md:flex"
            title="Configuración del proveedor LLM"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                configured ? "bg-neon-green" : "bg-neon-yellow"
              }`}
            />
            {configured ? model : "modo demo"}
          </button>
          <div className="hidden items-center gap-1.5 sm:flex">
            <span
              className={`h-2 w-2 animate-pulse rounded-full ${
                running ? "bg-neon-cyan" : "bg-neon-red"
              }`}
            />
            <span
              className={`font-mono text-[10px] font-medium tracking-wider ${
                running ? "text-neon-cyan" : "text-neon-red"
              }`}
            >
              {running ? "RUN" : "LIVE"}
            </span>
          </div>
          <button
            type="button"
            onClick={onSettings}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-neon-cyan"
            aria-label="Configuración"
          >
            <Settings2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-white/5 px-3 py-1.5 sm:gap-3 sm:px-5">
        <div className="flex min-w-0 shrink-0 items-center gap-1 font-mono text-[10px] text-slate-500">
          <span className="hidden sm:inline">global /</span>
          <div className="relative">
            <select
              value={workspace}
              onChange={(event) => onWorkspace(event.target.value)}
              aria-label="Workspace"
              className="max-w-[150px] appearance-none truncate rounded bg-transparent py-0.5 pr-4 text-[11px] text-neon-cyan outline-none ring-0 sm:max-w-none"
            >
              {COMMUNITIES.map((community) => (
                <option key={community.id} value={community.id} className="bg-[#0a0a13]">
                  {community.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 text-[8px] text-neon-cyan/70">
              ▾
            </span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded p-0.5 text-slate-600 transition hover:text-neon-cyan"
            aria-label="Refrescar mesh"
          >
            <RefreshCw size={11} />
          </button>
        </div>

        <div className="no-scrollbar ml-auto flex items-center gap-3 overflow-x-auto sm:gap-5">
          <Stat value={stats.online} label="bots online" color="green" />
          <Stat value={stats.units} label="units" color="cyan" />
          <Stat value={stats.verified} label="verified" color="green" />
          <span className="hidden sm:inline-flex">
            <Stat value={stats.rejected} label="rejected" color="red" />
          </span>
          <span className="hidden sm:inline-flex">
            <Stat value={stats.rules} label="rules" color="yellow" />
          </span>
          {running ? (
            <span className="hidden animate-pulse items-center gap-1 font-mono text-[9px] text-neon-cyan sm:flex">
              ejecutando…
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
