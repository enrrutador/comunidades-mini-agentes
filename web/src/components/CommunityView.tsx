"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Facebook,
  Plus,
  Users,
  Waypoints,
} from "lucide-react";
import {
  CharacterCard,
  CharacterConfigModal,
} from "./CharacterCard";
import { StatusDot } from "./ui";
import { glow, text, uid } from "@/lib/theme";
import type { Character, Community, SocialAccount } from "@/lib/types";

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function CommunityView({
  communities,
  characters,
  accounts,
  workspaceId,
  onSelectWorkspace,
  onSaveCharacter,
  onToggleAccount,
}: {
  communities: Community[];
  characters: Character[];
  accounts: SocialAccount[];
  workspaceId: string;
  onSelectWorkspace: (id: string) => void;
  onSaveCharacter: (character: Character) => void;
  onToggleAccount: (id: string) => void;
}) {
  const [editing, setEditing] = useState<Character | null>(null);

  const community = communities.find((item) => item.id === workspaceId);
  const isSystem = workspaceId === "pulse-os";
  const communityCharacters = characters.filter(
    (character) => character.communityId === workspaceId,
  );
  const account =
    community !== undefined
      ? accounts.find((item) => item.name === community.name)
      : undefined;

  function newCharacter() {
    setEditing({
      id: uid("new"),
      name: "",
      communityId: isSystem ? "gatos" : workspaceId,
      color: "cyan",
      estado: "en_preparacion",
      actividad: 5,
      bio: "",
      temperamento: "",
      temas: [],
    });
  }

  return (
    <section className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-slate-100">
            {isSystem ? "Comunidades" : community?.name ?? "Comunidad"}
          </h1>
          <p className="mt-0.5 max-w-2xl text-[11px] leading-relaxed text-slate-500">
            {isSystem
              ? "Cada comunidad tiene personajes, cuenta de Página, reglas y memoria propios."
              : community?.descripcion ??
                "Personajes, identidad pública y cuenta de la comunidad."}
          </p>
        </div>
        {isSystem ? (
          <span className="rounded-md border border-white/5 bg-white/[0.02] px-2 py-1 font-mono text-[9px] text-slate-500">
            workspace del sistema
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectWorkspace("pulse-os")}
              className="btn-ghost inline-flex items-center gap-1.5"
            >
              <ArrowLeft size={12} /> Comunidades
            </button>
            <button
              type="button"
              onClick={newCharacter}
              className="btn-primary inline-flex items-center gap-1.5"
            >
              <Plus size={12} /> Nuevo personaje
            </button>
          </div>
        )}
      </div>

      {isSystem ? (
        <>
          <div className="mt-4 grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
            {communities
              .filter((item) => item.id !== "pulse-os")
              .map((item) => {
                const count = characters.filter(
                  (character) => character.communityId === item.id,
                ).length;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectWorkspace(item.id)}
                    className={`neon-card ${glow[item.color]} p-3 text-left transition hover:bg-white/[0.015]`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[13px] font-medium text-slate-100">
                        {item.name}
                      </h3>
                      <StatusDot color={item.color} />
                    </div>
                    <p className="mt-1 font-mono text-[9px] text-slate-500">
                      {plural(item.agents, "agente", "agentes")} ·{" "}
                      {plural(count, "personaje", "personajes")}
                    </p>
                    <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-slate-400">
                      {item.descripcion}
                    </p>
                    <div className="mt-2.5 inline-flex items-center gap-1 font-mono text-[9px] text-slate-500">
                      <Waypoints size={10} /> administrar comunidad
                    </div>
                  </button>
                );
              })}
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center gap-2">
              <Facebook size={13} className="text-neon-blue" />
              <h2 className="text-xs font-medium text-slate-200">
                Cuentas conectadas
              </h2>
            </div>
            <div className="space-y-2">
              {accounts.map((item) => (
                <div
                  key={item.id}
                  className="neon-card flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                >
                  <div>
                    <div className="text-[12px] text-slate-200">{item.name}</div>
                    <div className="font-mono text-[9px] text-slate-500">
                      {item.page}
                      {item.lastSync ? ` · sync ${item.lastSync}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleAccount(item.id)}
                    className={`rounded-md border px-2 py-1 font-mono text-[9px] transition ${
                      item.status === "conectado"
                        ? "border-neon-green/30 bg-neon-green/10 text-neon-green"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.status === "conectado" ? "Conectada" : "Conectar"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="neon-card min-w-[150px] flex-1 p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                agentes
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-base text-slate-100">
                <Users size={13} className="text-neon-cyan" />
                {community?.agents ?? 0}
              </div>
            </div>
            <div className="neon-card min-w-[150px] flex-1 p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                personajes
              </div>
              <div className="mt-0.5 text-base text-slate-100">
                {communityCharacters.length}
              </div>
            </div>
            <div className="neon-card min-w-[180px] flex-1 p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                página
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 truncate font-mono text-[10px] text-slate-300">
                <Facebook size={12} className="text-neon-blue" />
                {account ? account.page : "sin cuenta asociada"}
              </div>
              {account ? (
                <button
                  type="button"
                  onClick={() => onToggleAccount(account.id)}
                  className={`mt-1.5 rounded border px-1.5 py-0.5 font-mono text-[8px] ${
                    account.status === "conectado"
                      ? "border-neon-green/30 text-neon-green"
                      : "border-white/10 text-slate-400"
                  }`}
                >
                  {account.status === "conectado"
                    ? "conectada · sincronizando"
                    : "conectar página"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
            {communityCharacters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                onConfigure={setEditing}
              />
            ))}
          </div>

          {communityCharacters.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-white/10 px-4 py-10 text-center font-mono text-[10px] text-slate-600">
              esta comunidad todavía no tiene personajes
            </div>
          ) : null}
        </>
      )}

      <CharacterConfigModal
        key={editing?.id ?? "character-closed"}
        open={editing !== null}
        character={editing}
        onClose={() => setEditing(null)}
        onSave={onSaveCharacter}
      />
    </section>
  );
}
