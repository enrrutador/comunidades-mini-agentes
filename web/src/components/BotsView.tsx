"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { BotCard } from "./BotCard";
import type { Bot } from "@/lib/types";

type Filter = "all" | "module" | "workflow";

export function BotsView({
  bots,
  onConfigure,
  onConnect,
}: {
  bots: Bot[];
  onConfigure: (bot: Bot) => void;
  onConnect: (bot: Bot) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return bots.filter((bot) => {
      if (filter !== "all" && bot.kind !== filter) return false;
      if (!term) return true;
      return `${bot.name} ${bot.tag} ${bot.tools} ${bot.desc}`
        .toLowerCase()
        .includes(term);
    });
  }, [bots, filter, query]);

  const enabled = bots.filter((bot) => bot.enabled).length;
  const connected = bots.filter((bot) => bot.connected).length;
  const modules = bots.filter((bot) => bot.kind === "module").length;
  const workflow = bots.filter((bot) => bot.kind === "workflow").length;

  return (
    <section className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-slate-100">Bots y módulos</h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Componentes del sistema y bots de workflow (catálogo estructural).
            El modelo activo se elige en la caja de chat y sale de los
            proveedores cargados en el backend.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 font-mono text-[9px] text-slate-500">
          <span>
            <span className="text-neon-green">{enabled}</span> enabled
          </span>
          <span>
            <span className="text-neon-cyan">{connected}</span> conectados
          </span>
          <span>
            <span className="text-neon-purple">{modules}</span> módulos
          </span>
          <span>
            <span className="text-neon-orange">{workflow}</span> workflow
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          {(
            [
              ["all", `Todos ${bots.length}`],
              ["module", `Sistema ${modules}`],
              ["workflow", `Workflow ${workflow}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-md border px-2 py-1 font-mono text-[9px] transition ${
                filter === id
                  ? "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan"
                  : "border-white/5 bg-white/[0.02] text-slate-500 hover:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-56">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar bot o herramienta…"
            className="input-neon py-1.5 pl-7 text-[11px]"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
        {filtered.map((bot) => (
          <BotCard
            key={bot.id}
            bot={bot}
            onConfigure={onConfigure}
            onConnect={onConnect}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-white/10 px-4 py-10 text-center font-mono text-[10px] text-slate-600">
          no hay bots que coincidan con “{query}”
        </div>
      ) : null}
    </section>
  );
}
