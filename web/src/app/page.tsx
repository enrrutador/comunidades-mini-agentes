"use client";

import { useState } from "react";

const TABS = ["Global", "Bots", "Runs", "Rules", "Memory"] as const;

const COMMUNITIES = [
  { id: "gatos", name: "Comunidad Gatos", color: "cyan", agents: 48, status: "active" },
  { id: "tech", name: "Tech & IA", color: "purple", agents: 32, status: "active" },
  { id: "deportes", name: "Deportes", color: "green", agents: 27, status: "active" },
  { id: "historia", name: "Historia", color: "orange", agents: 19, status: "idle" },
  { id: "entretenimiento", name: "Entretenimiento", color: "pink", agents: 41, status: "active" },
];

const AGENT_CARDS = [
  { name: "Orquestador", tag: "OR", color: "cyan", desc: "LLM Central", status: "Enabled" },
  { name: "Persona Manager", tag: "PM", color: "purple", desc: "Identidades", status: "Enabled" },
  { name: "Memory Core", tag: "MC", color: "green", desc: "Memoria", status: "Enabled" },
  { name: "Task Queue", tag: "TQ", color: "orange", desc: "Cola de tareas", status: "Enabled" },
  { name: "Social Adapter", tag: "SA", color: "pink", desc: "Facebook", status: "Enabled" },
  { name: "Router LLM", tag: "RL", color: "yellow", desc: "Multiproveedor", status: "Enabled" },
  { name: "Relation Graph", tag: "RG", color: "blue", desc: "Relaciones", status: "Enabled" },
  { name: "Activity Log", tag: "AL", color: "red", desc: "Eventos", status: "Enabled" },
];

const glowClass: Record<string, string> = {
  cyan: "glow-cyan",
  pink: "glow-pink",
  purple: "glow-purple",
  green: "glow-green",
  orange: "glow-orange",
  yellow: "glow-yellow",
  blue: "glow-blue",
  red: "glow-red",
};

const textColor: Record<string, string> = {
  cyan: "text-neon-cyan",
  pink: "text-neon-pink",
  purple: "text-neon-purple",
  green: "text-neon-green",
  orange: "text-neon-orange",
  yellow: "text-neon-yellow",
  blue: "text-neon-blue",
  red: "text-neon-red",
};

export default function PulseOS() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Global");

  return (
    <div className="h-screen flex flex-col bg-[#050508] text-slate-200">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-[#1a1a2e] bg-[#08080f]/90 backdrop-blur">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-[10px] font-bold text-black">
              P
            </div>
            <span className="font-semibold tracking-wide text-sm">
              PULSE <span className="text-neon-cyan">OS</span>
            </span>
          </div>

          <nav className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs rounded-md transition ${
                  activeTab === tab
                    ? "bg-[#12121f] text-neon-cyan border border-neon-cyan/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-5 text-xs font-mono">
          <div className="flex items-center gap-4">
            <span className="text-slate-400">
              <span className="text-neon-cyan font-semibold">167</span> personajes
            </span>
            <span className="text-slate-400">
              <span className="text-neon-green font-semibold">5</span> comunidades
            </span>
            <span className="text-slate-400">
              <span className="text-neon-yellow font-semibold">23</span> tareas
            </span>
            <span className="text-slate-400">
              <span className="text-neon-pink font-semibold">0</span> errores
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="text-neon-green font-medium tracking-wider">LIVE</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Graph / Mesh */}
        <section className="w-[42%] relative border-r border-[#1a1a2e] p-6 flex flex-col">
          <div className="text-xs text-slate-500 mb-4 font-mono">global / pulse-os</div>

          {/* Central graph area */}
          <div className="flex-1 relative flex items-center justify-center">
            {/* Background grid dots */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: "radial-gradient(circle, #334 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />

            {/* Central node - LLM Orquestador */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-[#0c0c18] border-2 border-neon-cyan shadow-neon-cyan flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full bg-neon-cyan/10 animate-pulse" />
                <div className="text-3xl">◉</div>
              </div>
              <div className="mt-3 text-center">
                <div className="text-sm font-semibold text-neon-cyan">LLM Orquestador</div>
                <div className="text-[10px] text-slate-500 font-mono">core · multiproveedor</div>
              </div>
            </div>

            {/* Orbiting nodes (simplified) */}
            <div className="absolute top-[18%] left-[22%] neon-card glow-purple px-3 py-2 text-[11px]">
              <div className="font-medium text-neon-purple">Personajes</div>
              <div className="text-slate-400 text-[10px]">167 activos</div>
            </div>
            <div className="absolute top-[22%] right-[18%] neon-card glow-green px-3 py-2 text-[11px]">
              <div className="font-medium text-neon-green">Memoria</div>
              <div className="text-slate-400 text-[10px]">colectiva + individual</div>
            </div>
            <div className="absolute bottom-[28%] left-[18%] neon-card glow-orange px-3 py-2 text-[11px]">
              <div className="font-medium text-neon-orange">Tareas</div>
              <div className="text-slate-400 text-[10px]">23 en cola</div>
            </div>
            <div className="absolute bottom-[22%] right-[20%] neon-card glow-pink px-3 py-2 text-[11px]">
              <div className="font-medium text-neon-pink">Facebook</div>
              <div className="text-slate-400 text-[10px]">adaptador activo</div>
            </div>
          </div>

          {/* Bottom mini log */}
          <div className="mt-4 font-mono text-[10px] text-slate-500 space-y-0.5 border-t border-[#1a1a2e] pt-3">
            <div><span className="text-neon-cyan">10:24:01</span> orquestador → tarea creada · comunidad/gatos</div>
            <div><span className="text-neon-green">10:24:03</span> memory · recuperado contexto · personaje/luna</div>
            <div><span className="text-neon-yellow">10:24:05</span> router · modelo seleccionado · gpt-4o-mini</div>
          </div>
        </section>

        {/* Right: Agent / Community cards */}
        <section className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-300">Módulos del sistema</h2>
            <span className="text-[10px] text-slate-500 font-mono">8 módulos · todos online</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {AGENT_CARDS.map((card) => (
              <div
                key={card.tag}
                className={`neon-card ${glowClass[card.color]} p-3.5 hover:scale-[1.02] transition-transform cursor-pointer`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${textColor[card.color]} bg-white/5`}>
                        {card.tag}
                      </span>
                      <span className="text-sm font-medium">{card.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{card.desc}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                    <span className="text-[10px] text-neon-green">{card.status}</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 text-[10px] text-slate-500">
                  <span className="px-1.5 py-0.5 rounded bg-white/5">own context</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5">loop · max 3</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-300">Comunidades</h2>
            <span className="text-[10px] text-slate-500 font-mono">5 activas</span>
          </div>

          <div className="space-y-2.5">
            {COMMUNITIES.map((c) => (
              <div
                key={c.id}
                className={`neon-card ${glowClass[c.color]} px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition cursor-pointer`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-8 rounded-full bg-neon-${c.color === "cyan" ? "cyan" : c.color}`} style={{ background: `var(--tw-gradient-from, currentColor)` }} />
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-[11px] text-slate-400">{c.agents} personajes</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] ${c.status === "active" ? "text-neon-green" : "text-slate-500"}`}>
                    {c.status === "active" ? "● activo" : "○ idle"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer status bar */}
      <footer className="h-8 border-t border-[#1a1a2e] bg-[#08080f] flex items-center justify-between px-4 text-[10px] font-mono text-slate-500">
        <div className="flex gap-4">
          <span>pulse-os v0.1.0</span>
          <span>backend · online</span>
          <span>router · multiproveedor</span>
        </div>
        <div className="flex gap-3">
          <span>Fase 1 · Núcleo</span>
          <span className="text-neon-cyan">localhost:3000</span>
        </div>
      </footer>
    </div>
  );
}
