"use client";

import { RefreshCw, Settings2 } from "lucide-react";
import { Stat } from "./ui";
import type { Tab } from "@/lib/types";

const TABS: Tab[] = ["Global", "Bots", "Runs", "Rules", "Memory", "Facebook"];

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
  onRefresh,
  stats,
  configured,
  model,
  running,
  onSettings,
}: {
  activeTab: Tab;
  onTab: (tab: Tab) => void;
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
            {configured ? model : "sin proveedor"}
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
              {running ? "EJECUTANDO" : "EN VIVO"}
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
          <span className="text-slate-400">global</span>
          <span className="text-slate-600">/</span>
          <span className="text-neon-cyan">pulse-os</span>
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
          <Stat value={stats.online} label="bots en línea" color="green" />
          <Stat value={stats.units} label="unidades" color="cyan" />
          <Stat value={stats.verified} label="verificadas" color="green" />
          <span className="hidden sm:inline-flex">
            <Stat value={stats.rejected} label="rechazadas" color="red" />
          </span>
          <span className="hidden sm:inline-flex">
            <Stat value={stats.rules} label="reglas" color="yellow" />
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
