"use client";

import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { Field, Modal, StatusDot } from "./ui";
import { glow, line, text } from "@/lib/theme";
import type { Character } from "@/lib/types";

export function CharacterCard({
  character,
  onConfigure,
}: {
  character: Character;
  onConfigure: (character: Character) => void;
}) {
  const status =
    character.estado === "activo"
      ? { label: "activo", color: "green" as const }
      : character.estado === "inactivo"
      ? { label: "inactivo", color: "yellow" as const }
      : { label: "en preparación", color: "orange" as const };

  return (
    <article
      className={`neon-card ${glow[character.color]} flex min-h-[172px] flex-col p-3 transition hover:bg-white/[0.01]`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 font-mono text-[9px] font-bold ${text[character.color]}`}
          >
            {character.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-medium text-slate-100">
              {character.name}
            </h3>
            <div className="font-mono text-[9px] text-slate-500">
              actividad {character.actividad}/10
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 font-mono text-[9px]">
          <StatusDot color={status.color} />
          <span className={text[status.color]}>{status.label}</span>
        </div>
      </div>

      <div className="mt-2 flex gap-0.5">
        {Array.from({ length: 10 }).map((_, index) => (
          <span
            key={index}
            className="h-1 flex-1 rounded-full bg-white/5"
            style={
              index < character.actividad
                ? { backgroundColor: line[character.color] }
                : undefined
            }
          />
        ))}
      </div>

      <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-slate-400">
        {character.bio}
      </p>

      <div className="mt-2 flex flex-wrap gap-1">
        {character.temas.slice(0, 3).map((topic) => (
          <span
            key={topic}
            className="rounded border border-white/5 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-slate-500"
          >
            {topic}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between pt-2.5">
        <span className="font-mono text-[9px] text-slate-600">
          {character.temperamento}
        </span>
        <button
          type="button"
          onClick={() => onConfigure(character)}
          className="rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-neon-cyan"
          aria-label={`Configurar ${character.name}`}
        >
          <Settings2 size={13} />
        </button>
      </div>
    </article>
  );
}

export function CharacterConfigModal({
  open,
  character,
  comunidades,
  onClose,
  onSave,
}: {
  open: boolean;
  character: Character | null;
  comunidades: { id: string; nombre: string }[];
  onClose: () => void;
  onSave: (character: Character, nuevaComunidad?: string) => void;
}) {
  const [draft, setDraft] = useState<Character | null>(character);
  const [topics, setTopics] = useState("");
  const [nuevaComunidad, setNuevaComunidad] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(character);
    setTopics(character?.temas.join(", ") ?? "");
    setNuevaComunidad("");
  }, [open, character]);

  if (!draft) return null;

  const isNew = draft.id.startsWith("new-");
  const sinComunidades = comunidades.length === 0;

  function update<K extends keyof Character>(key: K, value: Character[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={draft.id.startsWith("new-") ? "Nuevo personaje" : `Configurar ${draft.name}`}
      subtitle="Identidad pública, personalidad y nivel de actividad."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button
            type="button"
            disabled={
              !draft.name.trim() ||
              (isNew && sinComunidades && !nuevaComunidad.trim())
            }
            onClick={() => {
              onSave(
                {
                  ...draft,
                  temas: topics
                    .split(",")
                    .map((topic) => topic.trim())
                    .filter(Boolean),
                },
                sinComunidades ? nuevaComunidad : undefined,
              );
              onClose();
            }}
            className="btn-primary"
          >
            Guardar personaje
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre">
            <input
              value={draft.name}
              onChange={(event) => update("name", event.target.value)}
              className="input-neon"
            />
          </Field>
          <Field label="Estado">
            <select
              value={draft.estado}
              onChange={(event) =>
                update("estado", event.target.value as Character["estado"])
              }
              className="input-neon"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="en_preparacion">En preparación</option>
            </select>
          </Field>
        </div>

        <Field label="Nivel de actividad" hint={`${draft.actividad}/10`}>
          <input
            type="range"
            min={1}
            max={10}
            value={draft.actividad}
            onChange={(event) =>
              update("actividad", Number(event.target.value))
            }
            className="range-neon mt-2 w-full"
          />
        </Field>

        <Field label="Biografía interna">
          <textarea
            value={draft.bio}
            onChange={(event) => update("bio", event.target.value)}
            rows={3}
            className="input-neon resize-y leading-relaxed"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Temperamento">
            <input
              value={draft.temperamento}
              onChange={(event) => update("temperamento", event.target.value)}
              className="input-neon"
            />
          </Field>
          <Field label="Temas" hint="separados por coma">
            <input
              value={topics}
              onChange={(event) => setTopics(event.target.value)}
              className="input-neon"
            />
          </Field>
        </div>

        {sinComunidades ? (
          <Field
            label="Comunidad"
            hint="el backend todavía no tiene ninguna: se crea al guardar"
          >
            <input
              value={nuevaComunidad}
              onChange={(event) => setNuevaComunidad(event.target.value)}
              placeholder="Nombre de la primera comunidad"
              className="input-neon"
            />
          </Field>
        ) : (
          <Field label="Comunidad">
            <select
              value={draft.communityId}
              onChange={(event) => update("communityId", event.target.value)}
              className="input-neon"
            >
              {comunidades.map((comunidad) => (
                <option key={comunidad.id} value={comunidad.id}>
                  {comunidad.nombre}
                </option>
              ))}
            </select>
          </Field>
        )}

        <p className="rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 text-[10px] leading-relaxed text-slate-500">
          El personaje se guarda en el backend (base de datos). Si el guardado
          falla, el error se muestra arriba de la pantalla, no se pierde en
          silencio.
        </p>
      </div>
    </Modal>
  );
}
