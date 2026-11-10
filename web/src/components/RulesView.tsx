"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { Field, Modal, StatusDot, Toggle } from "./ui";
import { uid } from "@/lib/theme";
import type { Rule } from "@/lib/types";

const SEVERITY_COLOR = {
  alta: "red",
  media: "orange",
  baja: "yellow",
} as const;

export function RulesView({
  rules,
  onChange,
}: {
  rules: Rule[];
  onChange: (rules: Rule[]) => void;
}) {
  const [editing, setEditing] = useState<Rule | null>(null);
  const [open, setOpen] = useState(false);

  function createRule() {
    setEditing({
      id: uid("r"),
      name: "",
      desc: "",
      active: true,
      severity: "media",
      scope: "global",
    });
    setOpen(true);
  }

  function editRule(rule: Rule) {
    setEditing(rule);
    setOpen(true);
  }

  function saveRule(rule: Rule) {
    const exists = rules.some((item) => item.id === rule.id);
    onChange(
      exists
        ? rules.map((item) => (item.id === rule.id ? rule : item))
        : [...rules, rule],
    );
    setOpen(false);
  }

  function removeRule(id: string) {
    onChange(rules.filter((rule) => rule.id !== id));
    setOpen(false);
  }

  const active = rules.filter((rule) => rule.active).length;
  const high = rules.filter((rule) => rule.severity === "alta").length;

  return (
    <section className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-slate-100">Reglas y políticas</h1>
          <p className="mt-0.5 max-w-2xl text-[11px] leading-relaxed text-slate-500">
            La capa de orquestación evalúa estas reglas antes de ejecutar cada
            unidad. Una regla de severidad alta puede bloquear la corrida.
          </p>
        </div>
        <button
          type="button"
          onClick={createRule}
          className="btn-primary inline-flex items-center gap-1.5"
        >
          <Plus size={12} /> Nueva regla
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5 font-mono text-[9px] text-slate-500">
        <span className="rounded border border-white/5 bg-white/[0.03] px-2 py-1">
          <span className="text-slate-300">{rules.length}</span> totales
        </span>
        <span className="rounded border border-white/5 bg-white/[0.03] px-2 py-1">
          <span className="text-neon-green">{active}</span> activas
        </span>
        <span className="rounded border border-white/5 bg-white/[0.03] px-2 py-1">
          <span className="text-neon-red">{high}</span> severidad alta
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {rules.map((rule) => (
          <article
            key={rule.id}
            className={`neon-card flex flex-wrap items-start gap-3 px-3 py-3 sm:flex-nowrap ${
              rule.active ? "glow-cyan" : "opacity-55"
            }`}
          >
            <span className="mt-0.5 shrink-0">
              <ShieldAlert
                size={15}
                className={
                  rule.active ? "text-neon-cyan" : "text-slate-600"
                }
              />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[13px] font-medium text-slate-200">
                {rule.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded border border-white/5 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[8px] uppercase text-slate-500">
                  <StatusDot color={SEVERITY_COLOR[rule.severity]} />
                  {rule.severity}
                </span>
                <span className="rounded bg-white/[0.03] px-1.5 py-0.5 font-mono text-[8px] uppercase text-slate-500">
                  {rule.scope}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                {rule.desc}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => editRule(rule)}
                className="rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-neon-cyan"
                aria-label={`Editar ${rule.name}`}
              >
                <Pencil size={12} />
              </button>
              <Toggle
                checked={rule.active}
                onChange={(value) =>
                  onChange(
                    rules.map((item) =>
                      item.id === rule.id ? { ...item, active: value } : item,
                    ),
                  )
                }
                label={`Activar ${rule.name}`}
              />
            </div>
          </article>
        ))}
      </div>

      {rules.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-white/10 px-4 py-10 text-center font-mono text-[10px] text-slate-600">
          no hay reglas definidas
        </div>
      ) : null}

      <RuleModal
        key={editing?.id ?? "rule-closed"}
        open={open}
        rule={editing}
        onClose={() => setOpen(false)}
        onSave={saveRule}
        onDelete={removeRule}
      />
    </section>
  );
}

function RuleModal({
  open,
  rule,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  rule: Rule | null;
  onClose: () => void;
  onSave: (rule: Rule) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Rule | null>(rule);

  useEffect(() => {
    if (open) setDraft(rule);
  }, [open, rule]);

  if (!draft) return null;

  function update<K extends keyof Rule>(key: K, value: Rule[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={draft.name ? `Editar “${draft.name}”` : "Nueva regla"}
      subtitle="Las reglas se guardan en el workspace y se aplican antes de ejecutar."
      footer={
        <>
          {draft.id.startsWith("r-") && draft.name ? (
            <button
              type="button"
              onClick={() => onDelete(draft.id)}
              className="btn-ghost mr-auto inline-flex items-center gap-1 !text-neon-red"
            >
              <Trash2 size={12} /> Eliminar
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!draft.name.trim()}
            onClick={() => onSave({ ...draft, name: draft.name.trim() })}
            className="btn-primary"
          >
            Guardar regla
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre de la regla">
          <input
            value={draft.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Ej: No publicar sin verificación"
            className="input-neon"
          />
        </Field>
        <Field label="Descripción">
          <textarea
            value={draft.desc}
            onChange={(event) => update("desc", event.target.value)}
            rows={3}
            placeholder="Qué evalúa y cuándo bloquea una unidad."
            className="input-neon resize-y leading-relaxed"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Severidad">
            <select
              value={draft.severity}
              onChange={(event) =>
                update("severity", event.target.value as Rule["severity"])
              }
              className="input-neon"
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </Field>
          <Field label="Alcance">
            <select
              value={draft.scope}
              onChange={(event) =>
                update("scope", event.target.value as Rule["scope"])
              }
              className="input-neon"
            >
              <option value="global">Global</option>
              <option value="comunidad">Comunidad</option>
            </select>
          </Field>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
          <div>
            <div className="text-xs text-slate-200">Regla activa</div>
            <div className="text-[10px] text-slate-500">
              Si está apagada queda como borrador.
            </div>
          </div>
          <Toggle
            checked={draft.active}
            onChange={(value) => update("active", value)}
            label="Regla activa"
          />
        </div>
      </div>
    </Modal>
  );
}
