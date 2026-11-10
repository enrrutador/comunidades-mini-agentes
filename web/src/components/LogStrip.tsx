"use client";

import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { text } from "@/lib/theme";
import type { LogEntry } from "@/lib/types";

export function LogStrip({
  logs,
  onClear,
}: {
  logs: LogEntry[];
  onClear: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [logs]);

  return (
    <div className="shrink-0 border-t border-[#1a1a2e] bg-[#050509] px-3 py-1.5 sm:px-4">
      <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-wider text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-1 animate-pulse rounded-full bg-neon-green" />
          live log
        </span>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 transition hover:text-slate-300"
          title="Limpiar log"
        >
          <Trash2 size={9} /> limpiar
        </button>
      </div>
      <div
        ref={ref}
        className="no-scrollbar mt-0.5 max-h-[46px] space-y-0.5 overflow-y-auto font-mono text-[9px] leading-relaxed sm:max-h-[62px] sm:text-[10px]"
      >
        {logs.slice(-40).map((entry) => (
          <div key={entry.id} className="flex gap-2">
            <span className="shrink-0 text-slate-600">{entry.time}</span>
            <span
              className={`w-14 shrink-0 truncate ${
                entry.color ? text[entry.color] : "text-slate-500"
              }`}
            >
              {entry.source}
            </span>
            <span className="min-w-0 truncate text-slate-400">
              {entry.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
