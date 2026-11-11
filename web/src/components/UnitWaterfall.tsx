"use client";

import { dot, text } from "@/lib/theme";
import type { Bot, Unit } from "@/lib/types";

export function UnitWaterfall({
  units,
  bots,
  running,
  className = "",
}: {
  units: Unit[];
  bots: Bot[];
  running: boolean;
  className?: string;
}) {
  const visible = units.slice(-16).reverse();

  return (
    <div className={`relative min-w-0 flex-1 overflow-hidden ${className}`}>
      <div className="mesh-grid absolute inset-0 opacity-[0.12]" />
      <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-white/25 via-white/5 to-transparent" />

      <div className="relative flex h-full flex-col justify-start gap-[3px] overflow-hidden py-2 pl-3 pr-1">
        {visible.length === 0 ? (
          <span className="font-mono text-[9px] text-slate-600">
            {running ? "spawn units…" : "sin unidades"}
          </span>
        ) : null}
        {visible.map((unit, index) => {
          const bot = bots.find((item) => item.id === unit.botId);
          const color = bot?.color ?? "cyan";
          return (
            <div
              key={unit.id}
              className="animate-chip-in flex items-center gap-1.5"
              style={{ opacity: Math.max(0.25, 1 - index * 0.07) }}
            >
              <span className={`h-1 w-1 shrink-0 rounded-full ${dot[color]}`} />
              <span
                className={`shrink-0 rounded border px-1 py-px font-mono text-[8px] ${text[color]} border-current/25 bg-white/[0.02]`}
              >
                {unit.label}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-[8px] text-slate-600">
                {bot?.tag.toLowerCase() ?? ""}
              </span>
              <span
                className={`shrink-0 font-mono text-[8px] ${
                  unit.status === "verified"
                    ? "text-neon-green"
                    : unit.status === "rejected"
                    ? "text-neon-red"
                    : "text-neon-cyan"
                }`}
              >
                {unit.status === "verified"
                  ? "ok"
                  : unit.status === "rejected"
                  ? "rej"
                  : "···"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
