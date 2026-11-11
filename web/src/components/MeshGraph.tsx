"use client";

import { ChevronDown, GitBranch, ShieldCheck } from "lucide-react";
import { Chip, StatusDot } from "./ui";
import { text } from "@/lib/theme";
import type { Color } from "@/lib/types";

const PATHS = [
  { d: "M60 48 C95 60 118 130 138 218", dur: "2.6s" },
  { d: "M55 138 C92 150 120 190 138 222", dur: "3.1s" },
  { d: "M58 392 C100 380 124 320 138 286", dur: "2.8s" },
  { d: "M62 462 C105 440 128 350 140 292", dur: "3.4s" },
  { d: "M240 470 C210 445 172 380 152 298", dur: "2.9s" },
];

function InputChip({
  label,
  hint,
  className,
}: {
  label: string;
  hint: string;
  className: string;
}) {
  return (
    <div className={`absolute z-10 ${className}`}>
      <div className="rounded border border-white/25 bg-[#0b0b13]/90 px-1.5 py-0.5 font-mono text-[8px] tracking-widest text-slate-100 shadow-[0_0_10px_rgba(255,255,255,0.12)] backdrop-blur">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-[8px] text-slate-500">{hint}</div>
    </div>
  );
}

function LineLabel({ text: label, className }: { text: string; className: string }) {
  return (
    <span
      className={`absolute z-10 rounded bg-[#0a0a12]/80 px-1 font-mono text-[8px] text-slate-400 backdrop-blur ${className}`}
    >
      {label}
    </span>
  );
}

function SpecialCard({
  title,
  color,
  badge,
  toggleLabel,
  desc,
  chips,
  footer,
  action,
  className,
}: {
  title: string;
  color: Color;
  badge: "check" | "split";
  toggleLabel: string;
  desc: string;
  chips: React.ReactNode;
  footer: string;
  action: string;
  className: string;
}) {
  return (
    <div
      className={`neon-card glow-${color} absolute z-10 hidden w-[52%] max-w-[190px] p-2.5 sm:flex sm:flex-col ${className}`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <span className={`text-[12px] font-medium ${text[color]}`}>{title}</span>
        {badge === "check" ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-neon-yellow/50 bg-neon-yellow/10 text-neon-yellow shadow-[0_0_10px_rgba(255,238,0,0.35)]">
            <ShieldCheck size={11} />
          </span>
        ) : (
          <span className="flex h-5 w-6 items-center justify-center rounded-md border border-white/20 bg-white/5 text-slate-300">
            <ChevronDown size={11} />
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="relative inline-flex h-3 w-6 items-center rounded-full bg-neon-green/25 px-0.5">
          <span className="ml-auto h-2 w-2 rounded-full bg-neon-green shadow-[0_0_6px_rgba(0,255,157,0.8)]" />
        </span>
        <span className="flex items-center gap-1 font-mono text-[8px] text-neon-green">
          <StatusDot color="green" /> {toggleLabel}
        </span>
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-slate-200">{desc}</p>
      <div className="mt-1.5 space-y-0.5 font-mono text-[8px] text-slate-400">
        {chips}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-1.5">
        <span className="font-mono text-[8px] text-slate-500">{footer}</span>
        <span className={`font-mono text-[8px] ${text[color]}`}>{action}</span>
      </div>
    </div>
  );
}

export function MeshGraph({
  online,
  characters,
  running,
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
      className={`flex shrink-0 flex-col overflow-hidden border-b border-[#1a1a2e] bg-[#05050a] xl:h-full xl:w-[340px] xl:border-b-0 xl:border-r 2xl:w-[380px] ${className}`}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 font-mono text-[9px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-red" />
          mesh
        </span>
        <span className="text-slate-400">{online} bots</span>
      </div>

      <div className="relative min-h-[300px] flex-1 sm:min-h-[380px]">
        <div className="mesh-grid absolute inset-0 opacity-[0.16]" />

        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 320 520"
          preserveAspectRatio="none"
          aria-hidden
        >
          <g fill="none" stroke="#e6e6f0" strokeOpacity="0.28" strokeWidth="1" vectorEffect="non-scaling-stroke">
            {PATHS.map((path) => (
              <path key={path.d} d={path.d} />
            ))}
          </g>
          <g fill="#f4f4ff">
            {PATHS.map((path) => (
              <circle key={`p1-${path.d}`} r="1.7" opacity="0.95">
                <animateMotion dur={path.dur} repeatCount="indefinite" path={path.d} />
              </circle>
            ))}
            {PATHS.map((path) => (
              <circle key={`p2-${path.d}`} r="1.2" opacity="0.55">
                <animateMotion
                  dur={path.dur}
                  begin="1.3s"
                  repeatCount="indefinite"
                  path={path.d}
                />
              </circle>
            ))}
          </g>
        </svg>

        <InputChip label="TASK" hint="run my week" className="left-[4%] top-[7%]" />
        <InputChip label="INBOX" hint="inbox scan" className="left-[3%] top-[24%]" />
        <InputChip label="CALENDAR" hint="tune rules" className="bottom-[22%] left-[3%]" />
        <InputChip label="MEMORY_MD" hint="memory.md" className="bottom-[7%] left-[6%]" />
        <InputChip label="FACEBOOK" hint="posts · comments" className="bottom-[10%] right-[4%]" />

        <LineLabel text="plan.md" className="left-[26%] top-[13%]" />
        <LineLabel text="run my week" className="left-[30%] top-[19%]" />
        <LineLabel text="inbox scan" className="left-[27%] top-[30%]" />
        <LineLabel text="tune rules" className="left-[24%] bottom-[26%]" />
        <LineLabel text="publish · comment" className="right-[6%] bottom-[32%]" />

        <div className="absolute left-[46%] top-[49%] z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <div
            className={`animate-orb relative flex h-16 w-16 items-center justify-center rounded-[24px] bg-gradient-to-b from-white to-[#c9c9d6] sm:h-20 sm:w-20`}
          >
            <div className="absolute -inset-2.5 rounded-[30px] border border-white/10" />
            <div className="flex gap-1.5">
              <span className="h-3.5 w-2 rounded-full bg-[#101018] sm:h-4 sm:w-2.5" />
              <span className="h-3.5 w-2 rounded-full bg-[#101018] sm:h-4 sm:w-2.5" />
            </div>
          </div>
          <div className="mt-2 rounded border border-white/15 bg-[#0b0b13]/90 px-1.5 py-0.5 font-mono text-[8px] tracking-widest text-slate-200 backdrop-blur">
            PULSE BOT
          </div>
          <div className={`mt-0.5 font-mono text-[8px] ${running ? "text-neon-cyan" : "text-slate-600"}`}>
            {running ? "orquestando…" : "idle"}
          </div>
        </div>

        <SpecialCard
          title="Check"
          color="yellow"
          badge="check"
          toggleLabel="Finished"
          desc="Writer pass condition"
          chips={
            <>
              <span>list: cores · no auto-pay</span>
              <span className="mt-1 flex items-center gap-1">
                <Chip>MEMORY.md</Chip>
              </span>
              <span className="text-slate-500">• Splitter → 15 bots</span>
            </>
          }
          footer="Splitter"
          action="→ Connect"
          className="right-[2%] top-[12%]"
        />
        <SpecialCard
          title="Splitter"
          color="blue"
          badge="split"
          toggleLabel="Finished"
          desc="Cuts task into units"
          chips={
            <>
              <span>• target → data only</span>
              <span>• → → in parallel</span>
              <span className="pt-1 text-slate-500">Task graph</span>
              <span>• 15 units</span>
            </>
          }
          footer="Task graph"
          action="→ Connect"
          className="right-[2%] bottom-[16%]"
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/[0.04] px-3 py-2 font-mono text-[8px] text-slate-600">
        <span className="flex items-center gap-1">
          <GitBranch size={9} className="text-neon-purple" /> task graph
        </span>
        <span>{characters} personajes</span>
        <span className="text-neon-cyan/60">live · beams</span>
      </div>
    </section>
  );
}
