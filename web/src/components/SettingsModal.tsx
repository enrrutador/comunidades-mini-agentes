"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { Field, Modal, StatusDot, Toggle } from "./ui";
import { PROVIDERS } from "@/lib/data";
import {
  createModelo,
  createProveedor,
  deleteProveedor,
  listModelos,
  listProveedores,
  testProveedor,
  updateProveedor,
  type ModeloLLM,
  type ProveedorLLM,
} from "@/lib/api";

/** El backend lee la key de la variable de entorno <NOMBRE>_API_KEY. */
function envName(nombre: string): string {
  return `${nombre.toUpperCase().replace(/ /g, "_")}_API_KEY`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Error inesperado";
}

/**
 * Sección Proveedores — única fuente de verdad del LLM.
 * Todo vive en el backend (base de datos): esta pantalla crea, edita,
 * borra y PRUEBA proveedores y modelos contra /api/llm/*. El chat y las
 * corridas usan exactamente estos proveedores.
 */
export function SettingsModal({
  open,
  onClose,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [proveedores, setProveedores] = useState<ProveedorLLM[]>([]);
  const [modelos, setModelos] = useState<ModeloLLM[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<
    Record<string, { ok: boolean; message: string } | undefined>
  >({});
  const [presetId, setPresetId] = useState("openai");
  const [nuevoProv, setNuevoProv] = useState({ nombre: "OpenAI", base_url: "https://api.openai.com/v1" });
  const [nuevoModelo, setNuevoModelo] = useState<
    Record<string, { nombre: string; identificador: string } | undefined>
  >({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [provs, mods] = await Promise.all([listProveedores(), listModelos()]);
      setProveedores(provs);
      setModelos(mods);
      setError("");
    } catch (e) {
      setError(
        `No pude cargar los proveedores del backend (${errorText(e)}). Revisá que el servidor esté levantado.`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void reload();
  }, [open, reload]);

  async function mutate(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await reload();
      onChanged();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function importarModelos(proveedor: ProveedorLLM): Promise<void> {
    setImportingId(proveedor.id);
    setTestMsg((current) => ({ ...current, [proveedor.id]: undefined }));
    try {
      const result = await testProveedor(proveedor.id);
      if (!result.ok) {
        setTestMsg((current) => ({
          ...current,
          [proveedor.id]: {
            ok: false,
            message: result.error ?? "No se pudo conectar al proveedor para cargar sus modelos.",
          },
        }));
        return;
      }
      const disponibles = result.modelos_disponibles ?? [];
      if (disponibles.length === 0) {
        setTestMsg((current) => ({
          ...current,
          [proveedor.id]: {
            ok: true,
            message: "Conexión OK · el proveedor respondió, pero no listó modelos.",
          },
        }));
        return;
      }
      const actuales = await listModelos();
      const yaEstan = new Set(
        actuales
          .filter((m) => m.proveedor_id === proveedor.id)
          .map((m) => m.identificador_tecnico),
      );
      let nuevos = 0;
      for (const ident of disponibles) {
        if (yaEstan.has(ident)) continue;
        await createModelo({
          nombre: ident,
          identificador_tecnico: ident,
          proveedor_id: proveedor.id,
          disponible: true,
        });
        nuevos += 1;
      }
      await reload();
      onChanged();
      setTestMsg((current) => ({
        ...current,
        [proveedor.id]: {
          ok: true,
          message:
            nuevos > 0
              ? `${nuevos} modelos cargados en la caja de chat (${disponibles.length} disponibles en total). Elegí el que quieras usar desde el selector del chat.`
              : `Los ${disponibles.length} modelos de este proveedor ya estaban cargados en la caja de chat.`,
        },
      }));
    } catch (e) {
      setTestMsg((current) => ({
        ...current,
        [proveedor.id]: { ok: false, message: errorText(e) },
      }));
    } finally {
      setImportingId(null);
    }
  }

  async function handleTest(proveedor: ProveedorLLM) {
    setTestingId(proveedor.id);
    setTestMsg((current) => ({ ...current, [proveedor.id]: undefined }));
    try {
      const result = await testProveedor(proveedor.id);
      if (result.ok) {
        const lista = result.modelos_disponibles ?? [];
        setTestMsg((current) => ({
          ...current,
          [proveedor.id]: {
            ok: true,
            message:
              lista.length > 0
                ? `Conexión OK · ${lista.length} modelos disponibles (${lista.slice(0, 3).join(", ")}${lista.length > 3 ? "…" : ""})`
                : "Conexión OK · el proveedor respondió, pero no listó modelos",
          },
        }));
      } else {
        setTestMsg((current) => ({
          ...current,
          [proveedor.id]: {
            ok: false,
            message: result.error ?? "No se pudo conectar al proveedor.",
          },
        }));
      }
    } catch (e) {
      setTestMsg((current) => ({
        ...current,
        [proveedor.id]: { ok: false, message: errorText(e) },
      }));
    } finally {
      setTestingId(null);
    }
  }

  function applyPreset(id: string) {
    setPresetId(id);
    const preset = PROVIDERS.find((item) => item.id === id);
    if (preset) {
      setNuevoProv({ nombre: preset.name, base_url: preset.baseUrl });
    }
  }

  async function addProvider() {
    if (!nuevoProv.nombre.trim() || !nuevoProv.base_url.trim()) return;
    setBusy(true);
    try {
      const creado = await createProveedor({
        nombre: nuevoProv.nombre.trim(),
        base_url: nuevoProv.base_url.trim(),
        tipo_api: "openai_compatible",
        activo: true,
      });
      await reload();
      onChanged();
      // Recien creado el proveedor, sus modelos se cargan solos en la
      // caja de chat: el usuario solo tiene que elegir cual usar.
      await importarModelos(creado);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function addModelo(proveedor: ProveedorLLM) {
    const draft = nuevoModelo[proveedor.id];
    if (!draft?.identificador.trim()) return;
    await mutate(async () => {
      await createModelo({
        nombre: draft.nombre.trim() || draft.identificador.trim(),
        identificador_tecnico: draft.identificador.trim(),
        proveedor_id: proveedor.id,
        disponible: true,
      });
      setNuevoModelo((current) => ({ ...current, [proveedor.id]: undefined }));
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Proveedores LLM"
      subtitle="Se guardan en el backend y son la única fuente de verdad: el chat y las corridas usan estos proveedores."
      size="lg"
      footer={
        <button type="button" onClick={onClose} className="btn-primary">
          Cerrar
        </button>
      }
    >
      <div className="space-y-5">
        <p className="rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 text-[10px] leading-relaxed text-slate-500">
          La API key <span className="text-slate-300">no se escribe acá</span>: el
          backend la lee de la variable de entorno del servidor. Para un
          proveedor llamado «OpenAI», la variable es{" "}
          <span className="font-mono text-slate-300">OPENAI_API_KEY</span> (en
          Kaggle, definila en la celda antes de levantar el backend). Después de
          cargar proveedor y modelo, tocá <span className="text-slate-300">Probar</span>:
          si la conexión está bien, acá mismo vas a ver los modelos que responde.
        </p>

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-neon-red/30 bg-neon-red/[0.06] px-3 py-2 text-[11px] leading-relaxed text-neon-red">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-neon-cyan/80">
              Proveedores registrados en el backend
            </h3>
            <span className="font-mono text-[9px] text-slate-500">
              {loading ? "cargando…" : `${proveedores.length} cargados`}
            </span>
          </div>

          {proveedores.length === 0 && !loading ? (
            <div className="rounded-lg border border-dashed border-white/10 px-4 py-8 text-center font-mono text-[10px] leading-relaxed text-slate-600">
              Todavía no hay proveedores en el backend.
              <br />
              Cargá el primero con el formulario de abajo.
            </div>
          ) : null}

          <div className="space-y-2">
            {proveedores.map((proveedor) => {
              const message = testMsg[proveedor.id];
              const mods = modelos.filter((m) => m.proveedor_id === proveedor.id);
              const draftModelo = nuevoModelo[proveedor.id] ?? { nombre: "", identificador: "" };
              return (
                <div
                  key={proveedor.id}
                  className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-medium text-slate-200">
                          {proveedor.nombre}
                        </span>
                        {proveedor.activo ? (
                          <span className="rounded bg-neon-green/10 px-1 py-0.5 font-mono text-[8px] text-neon-green">
                            ACTIVO
                          </span>
                        ) : (
                          <span className="rounded bg-white/5 px-1 py-0.5 font-mono text-[8px] text-slate-500">
                            INACTIVO
                          </span>
                        )}
                      </div>
                      <div className="truncate font-mono text-[9px] text-slate-500">
                        {proveedor.base_url || "sin endpoint"} · key:{" "}
                        <span className="text-slate-400">{envName(proveedor.nombre)}</span>
                      </div>
                      {message ? (
                        <div
                          className={`mt-1 flex items-start gap-1 text-[10px] leading-snug ${
                            message.ok ? "text-neon-green" : "text-neon-red"
                          }`}
                        >
                          {message.ok ? (
                            <CheckCircle2 size={11} className="mt-px shrink-0" />
                          ) : (
                            <AlertCircle size={11} className="mt-px shrink-0" />
                          )}
                          <span>{message.message}</span>
                        </div>
                      ) : null}
                    </div>
                    <Toggle
                      checked={proveedor.activo}
                      onChange={(value) =>
                        void mutate(() =>
                          updateProveedor(proveedor.id, { activo: value }),
                        )
                      }
                      label={`Proveedor ${proveedor.nombre} activo`}
                    />
                    <button
                      type="button"
                      onClick={() => void handleTest(proveedor)}
                      disabled={testingId === proveedor.id || !proveedor.base_url}
                      className="inline-flex items-center gap-1 rounded-md border border-neon-cyan/30 bg-neon-cyan/10 px-2 py-1 font-mono text-[9px] text-neon-cyan transition hover:bg-neon-cyan/20 disabled:opacity-40"
                      title="Probar conexión contra el backend"
                    >
                      {testingId === proveedor.id ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Zap size={11} />
                      )}
                      Probar
                    </button>
                    <button
                      type="button"
                      onClick={() => void importarModelos(proveedor)}
                      disabled={importingId === proveedor.id || !proveedor.base_url}
                      className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 font-mono text-[9px] text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
                      title="Traer los modelos de este proveedor a la caja de chat"
                    >
                      {importingId === proveedor.id ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : null}
                      Cargar modelos
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void mutate(() => deleteProveedor(proveedor.id))
                      }
                      disabled={busy}
                      className="rounded p-1.5 text-slate-600 transition hover:bg-white/5 hover:text-neon-red disabled:opacity-30"
                      title="Quitar proveedor"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="mt-2.5 border-t border-white/5 pt-2.5">
                    <div className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-slate-500">
                      Modelos de este proveedor
                    </div>
                    {mods.length === 0 ? (
                      <p className="font-mono text-[9px] leading-relaxed text-slate-600">
                        Todavía no hay modelos: sin modelo el chat no puede
                        responder. Cargá al menos uno.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {mods.map((modelo) => (
                          <span
                            key={modelo.id}
                            className="inline-flex items-center gap-1.5 rounded border border-white/5 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] text-slate-300"
                          >
                            <StatusDot color={modelo.disponible ? "green" : "red"} />
                            {modelo.identificador_tecnico}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <input
                        value={draftModelo.identificador}
                        onChange={(event) =>
                          setNuevoModelo((current) => ({
                            ...current,
                            [proveedor.id]: {
                              nombre: current[proveedor.id]?.nombre ?? "",
                              identificador: event.target.value,
                            },
                          }))
                        }
                        placeholder="identificador técnico · ej: gpt-4o-mini"
                        className="input-neon min-w-[180px] flex-1 py-1.5 font-mono text-[10px]"
                      />
                      <button
                        type="button"
                        onClick={() => void addModelo(proveedor)}
                        disabled={busy || !draftModelo.identificador.trim()}
                        className="btn-ghost inline-flex items-center gap-1 disabled:opacity-40"
                      >
                        <Plus size={11} /> modelo
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3 border-t border-[#1a1a2e] pt-4">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-neon-purple/80">
            Agregar proveedor
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Preset">
              <select
                value={presetId}
                onChange={(event) => applyPreset(event.target.value)}
                className="input-neon py-1.5 text-[11px]"
              >
                {PROVIDERS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nombre">
              <input
                value={nuevoProv.nombre}
                onChange={(event) =>
                  setNuevoProv((current) => ({ ...current, nombre: event.target.value }))
                }
                placeholder="OpenAI"
                className="input-neon py-1.5 text-[11px]"
              />
            </Field>
          </div>
          <Field label="Base URL" hint="compatible con OpenAI · suele terminar en /v1">
            <input
              value={nuevoProv.base_url}
              onChange={(event) =>
                setNuevoProv((current) => ({ ...current, base_url: event.target.value }))
              }
              placeholder="https://api.openai.com/v1"
              className="input-neon py-1.5 font-mono text-[11px]"
            />
          </Field>
          <button
            type="button"
            onClick={() => void addProvider()}
            disabled={busy || !nuevoProv.nombre.trim() || !nuevoProv.base_url.trim()}
            className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            <Plus size={12} /> Agregar proveedor al backend
          </button>
        </section>
      </div>
    </Modal>
  );
}
