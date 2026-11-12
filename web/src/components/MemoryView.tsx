"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Brain, Plus, Search, Trash2 } from "lucide-react";
import { Field, Modal, StatusDot } from "./ui";
import { dot, scopeColor, shortDate, text } from "@/lib/theme";
import {
  createMemoria,
  deleteMemoria,
  listMemoria,
  type MemoryEntry as ApiMemoryEntry,
} from "@/lib/api";
import type { MemoryScope } from "@/lib/types";

const SCOPES: MemoryScope[] = [
  "individual",
  "colectiva",
  "episódica",
  "semántica",
];

const SCOPE_DESC: Record<MemoryScope, string> = {
  individual: "cada personaje",
  colectiva: "la comunidad",
  episódica: "eventos e interacciones",
  semántica: "aprendizajes del mesh",
};

type Filter = "all" | MemoryScope;

function asScope(value: string): MemoryScope {
  return (SCOPES as string[]).includes(value)
    ? (value as MemoryScope)
    : "individual";
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Error inesperado";
}

/**
 * Memoria del mesh — vive en el backend (/api/memoria). La pantalla
 * muestra exactamente lo que devuelve el servidor, incluida la lista
 * vacía; si la API falla se muestra el error, nunca datos de ejemplo.
 */
export function MemoryView() {
  const [entries, setEntries] = useState<ApiMemoryEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await listMemoria());
      setError("");
    } catch (e) {
      setEntries([]);
      setError(
        `No pude cargar la memoria del backend (${errorText(e)}). No se muestra ningún recuerdo de ejemplo.`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (filter !== "all" && asScope(entry.scope) !== filter) return false;
      if (!term) return true;
      return `${entry.owner} ${entry.summary}`.toLowerCase().includes(term);
    });
  }, [entries, filter, query]);

  const counts = useMemo(() => {
    const result = { all: entries.length } as Record<Filter, number>;
    for (const scope of SCOPES) {
      result[scope] = entries.filter(
        (entry) => asScope(entry.scope) === scope,
      ).length;
    }
    return result;
  }, [entries]);

  async function handleDelete(id: string) {
    try {
      await deleteMemoria(id);
      await reload();
    } catch (e) {
      setError(`No pude borrar el recuerdo: ${errorText(e)}`);
    }
  }

  return (
    <section className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-slate-100">Memoria del mesh</h1>
          <p className="mt-0.5 max-w-2xl text-[11px] leading-relaxed text-slate-500">
            El orquestador recupera sólo el contexto relevante para cada tarea.
            La memoria persistente vive en el backend y se consulta por scope.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-primary inline-flex items-center gap-1.5"
        >
          <Plus size={12} /> Nueva memoria
        </button>
      </div>

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-neon-red/30 bg-neon-red/[0.06] px-3 py-2 text-[11px] leading-relaxed text-neon-red">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-md border px-2 py-1 font-mono text-[9px] transition ${
            filter === "all"
              ? "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan"
              : "border-white/5 bg-white/[0.02] text-slate-500 hover:text-slate-300"
          }`}
        >
          Todo {counts.all}
        </button>
        {SCOPES.map((scope) => (
          <button
            key={scope}
            type="button"
            onClick={() => setFilter(scope)}
            title={SCOPE_DESC[scope]}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[9px] transition ${
              filter === scope
                ? "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan"
                : "border-white/5 bg-white/[0.02] text-slate-500 hover:text-slate-300"
            }`}
          >
            <StatusDot color={scopeColor[scope]} />
            {scope} {counts[scope]}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-56">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar memoria…"
            className="input-neon py-1.5 pl-7 text-[11px]"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
        {filtered.map((entry) => {
          const scope = asScope(entry.scope);
          const color = scopeColor[scope];
          return (
            <article key={entry.id} className="neon-card group p-3">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider ${text[color]}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${dot[color]}`} />
                  {scope}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDelete(entry.id)}
                  className="rounded p-0.5 text-slate-600 opacity-0 transition hover:text-neon-red group-hover:opacity-100"
                  aria-label="Borrar memoria"
                >
                  <Trash2 size={11} />
                </button>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-300">
                <Brain size={11} className="text-slate-500" />
                {entry.owner}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                {entry.summary}
              </p>
              <div className="mt-2 font-mono text-[9px] text-slate-600">
                {shortDate(entry.created_at)}
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-white/10 px-4 py-10 text-center font-mono text-[10px] leading-relaxed text-slate-600">
          {loading
            ? "cargando la memoria del backend…"
            : entries.length === 0
              ? "Todavía no hay recuerdos guardados en el backend."
              : "No hay recuerdos en este filtro."}
        </div>
      ) : null}

      <MemoryModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => void reload()}
      />
    </section>
  );
}

function MemoryModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [scope, setScope] = useState<MemoryScope>("individual");
  const [owner, setOwner] = useState("");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!open) return;
    setScope("individual");
    setOwner("");
    setSummary("");
    setSaveError("");
  }, [open ]);

  async function save() {
    if (!owner.trim() || !summary.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      await createMemoria({
        scope,
        owner: owner.trim(),
        summary: summary.trim(),
      });
      onSaved();
      onClose();
    } catch (e) {
      setSaveError(`No pude guardar el recuerdo: ${errorText(e)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva memoria"
      subtitle="Un recuerdo recuperable por el orquestador en futuras corridas. Se guarda en el backend."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!owner.trim() || !summary.trim() || saving}
            className="btn-primary"
          >
            {saving ? "Guardando…" : "Guardar memoria"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Scope">
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value as MemoryScope)}
            className="input-neon"
          >
            {SCOPES.map((item) => (
              <option key={item} value={item}>
                {item} · {SCOPE_DESC[item]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Owner" hint="personaje, comunidad o mesh">
          <input
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="Ej: Luna, Comunidad Gatos, Mesh"
            className="input-neon"
          />
        </Field>
        <Field label="Recuerdo">
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={3}
            placeholder="Qué debería recordar el sistema y por qué es relevante."
            className="input-neon resize-y leading-relaxed"
          />
        </Field>
        {saveError ? (
          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-neon-red">
            <AlertCircle size={12} className="mt-0.5 shrink-0" /> {saveError}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
