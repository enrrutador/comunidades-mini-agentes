"use client";

import type { ReactNode } from "react";
import { Check, GitBranch, ShieldCheck } from "lucide-react";
import { Chip, StatusDot } from "./ui";
import { dot, text } from "@/lib/theme";
import type { Color } from "@/lib/types";

function GraphNode({
  label,
  hint,
  color,
  className,
}: {
  label: string;
  hint: string;
  color: Color;
  className: string;
}) {
  return (
    <div className={`absolute z-10 ${className}`}>
      <div className="flex items-center gap-1 rounded border border-white/10 bg-[#0b0b14]/85 px-1.5 py-0.5 backdrop-blur">
        <span className={`h-1 w-1 rounded-full ${dot[color]}`} />
        <span className="font-mono text-[8px] tracking-widest text-slate-300">
          {label}
        </span>
      </div>
      <div className="mt-0.5 text-[8px] text-slate-600">{hint}</div>
    </div>
  );
}

function DetailCard({
  title,
  color,
  icon,
  desc,
  chips,
  className,
}: {
  title: string;
  color: Color;
  icon: ReactNode;
  desc: string;
  chips: string[];
  className: string;
}) {
  return (
    <div
      className={`glow-${color} absolute z-10 hidden w-[47%] max-w-[188px] flex-col rounded-lg border bg-[#0a0a13]/95 p-2.5 sm:flex ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`flex h-5 w-5 items-center justify-center rounded ${text[color]} bg-white/5`}
          >
            {icon}
          </span>
          <span className={`text-[11px] font-medium ${text[color]}`}>{title}</span>
        </div>
        <span className="rounded bg-white/5 px-1 py-0.5 font-mono text-[7px] text-slate-400">
          {color === "yellow" ? "PASS" : "SPLIT"}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-1 font-mono text-[8px] text-neon-green">
        <StatusDot color="green" /> Enabled
      </div>
      <p className="mt-1.5 text-[9px] leading-snug text-slate-400">{desc}</p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {chips.map((chip) => (
          <Chip key={chip}>{chip}</Chip>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-1.5">
        <span className="font-mono text-[8px] text-slate-500">Connect</span>
        <span className={`font-mono text-[8px] ${text[color]}`}>→</span>
      </div>
    </div>
  );
}

export function MeshGraph({
  online,
  characters,
  running,
  activeColor = "cyan",
  className = "",
}: {
  online: number;
  characters: number;
  running: boolean;
  activeColor?: Color;
  className?: string;
}) {
  return (
    <section
      className={`flex shrink-0 flex-col overflow-hidden border-b border-[#1a1a2e] bg-[#06060c] xl:h-full xl:w-[310px] xl:border-b-0 xl:border-r 2xl:w-[350px] ${className}`}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 font-mono text-[9px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-green" />
          mesh / live
        </span>
        <span className="text-neon-cyan/70">{online} bots</span>
      </div>

      <div className="relative min-h-[260px] flex-1 sm:min-h-[360px]">
        <div className="mesh-grid absolute inset-0 opacity-25" />

        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 320 520"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="beam-cyan" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.05" />
              <stop offset="55%" stopColor="#00f0ff" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="beam-purple" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#b400ff" stopOpacity="0.05" />
              <stop offset="55%" stopColor="#b400ff" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#b400ff" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="beam-green" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#00ff9d" stopOpacity="0.05" />
              <stop offset="55%" stopColor="#00ff9d" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#00ff9d" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="beam-pink" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff00aa" stopOpacity="0.05" />
              <stop offset="55%" stopColor="#ff00aa" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ff00aa" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="beam-orange" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff6b00" stopOpacity="0.05" />
              <stop offset="55%" stopColor="#ff6b00" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ff6b00" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <g
            fill="none"
            strokeWidth="1.2"
            strokeDasharray="3 6"
            className="animate-dash"
            vectorEffect="non-scaling-stroke"
          >
            <path d="M122 244 C110 200 70 110 35 70" stroke="url(#beam-purple)" />
            <path d="M122 244 C95 215 55 180 25 160" stroke="url(#beam-cyan)" />
            <path d="M122 244 C95 285 55 350 30 380" stroke="url(#beam-orange)" />
            <path d="M122 244 C110 320 70 430 40 470" stroke="url(#beam-green)" />
            <path d="M122 244 C165 205 195 170 222 152" stroke="url(#beam-pink)" />
            <path d="M122 244 C165 285 195 330 222 356" stroke="url(#beam-purple)" />
            <path d="M122 244 C190 215 260 180 318 145" stroke="url(#beam-cyan)" opacity="0.6" />
            <path d="M122 244 C195 240 260 235 318 235" stroke="url(#beam-green)" opacity="0.5" />
            <path d="M122 244 C190 270 260 300 318 330" stroke="url(#beam-pink)" opacity="0.5" />
            <path d="M122 244 C185 300 255 370 318 430" stroke="url(#beam-orange)" opacity="0.45" />
          </g>

          <g fill="#0a0a12" stroke="#2a2a44" strokeWidth="1">
            <circle cx="35" cy="70" r="2.5" />
            <circle cx="25" cy="160" r="2.5" />
            <circle cx="30" cy="380" r="2.5" />
            <circle cx="40" cy="470" r="2.5" />
            <circle cx="318" cy="145" r="2.5" />
            <circle cx="318" cy="235" r="2.5" />
            <circle cx="318" cy="330" r="2.5" />
            <circle cx="318" cy="430" r="2.5" />
          </g>
        </svg>

        <GraphNode label="TASK" hint="run my week" color="purple" className="left-[5%] top-[9%]" />
        <GraphNode label="INBOX" hint="fetch receipts" color="cyan" className="left-[2%] top-[26%]" />
        <GraphNode label="CALENDAR" hint="special plans" color="orange" className="bottom-[20%] left-[2%]" />
        <GraphNode label="MEMORY.MD" hint="running now" color="green" className="bottom-[7%] left-[6%]" />

        <div className="absolute left-[38%] top-[47%] z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <div
            className={`relative flex h-16 w-16 items-center justify-center rounded-[22px] border border-neon-cyan/40 bg-gradient-to-br from-[#0c1020] to-[#050508] shadow-[0_0_30px_rgba(0,240,255,0.22)] sm:h-20 sm:w-20 ${
              running ? "animate-soft-pulse" : ""
            }`}
          >
            <div className="absolute -inset-2 rounded-[26px] border border-neon-cyan/15" />
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple text-sm font-bold text-black shadow-neon-cyan sm:h-11 sm:w-11`}
            >
              P
            </div>
          </div>
          <div className="mt-2 text-center">
            <div className="font-mono text-[8px] tracking-[0.2em] text-slate-400">
              PULSE BOT
            </div>
            <div className={`font-mono text-[8px] ${text[activeColor]}`}>
              {running ? "orquestando…" : "idle · listo"}
            </div>
          </div>
        </div>

        <DetailCard
          title="Check"
          color="yellow"
          icon={<ShieldCheck size={11} />}
          desc="Valida condiciones de aprobación antes de publicar."
          chips={["pass cond.", "no auto-pay"]}
          className="right-[4%] top-[15%]"
        />
        <DetailCard
          title="Splitter"
          color="purple"
          icon={<GitBranch size={11} />}
          desc="Divide la tarea en unidades para el task graph."
          chips={["unit graph", "15 bots"]}
          className="right-[4%] bottom-[17%]"
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/[0.04] px-3 py-2 font-mono text-[8px] text-slate-600">
        <span className="flex items-center gap-1">
          <Check size={9} className="text-neon-green" /> verified output
        </span>
        <span>{characters} personajes</span>
        <span className="text-neon-cyan/60">beams · 10</span>
      </div>
    </section>
  );
}
