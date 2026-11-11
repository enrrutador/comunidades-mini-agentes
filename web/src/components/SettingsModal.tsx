"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { Field, Modal, StatusDot, Toggle } from "./ui";
import { PROVIDERS } from "@/lib/data";
import { testProvider } from "@/lib/llm";
import type { ProviderConfig, Settings } from "@/lib/types";

export function SettingsModal({
  open,
  onClose,
  settings,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (settings: Settings) => void;
}) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [showKey, setShowKey] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<
    Record<string, { ok: boolean; message: string } | undefined>
  >({});
  const [presetId, setPresetId] = useState("openai");

  useEffect(() => {
    if (!open) return;
    setDraft(settings);
    setTestMsg({});
    setShowKey(false);
  }, [open, settings]);

  const selected =
    draft.providers.find((provider) => provider.id === draft.activeProviderId) ??
    draft.providers[0];

  function updateSettings<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateProvider(id: string, patch: Partial<ProviderConfig>) {
    setDraft((current) => ({
      ...current,
      providers: current.providers.map((provider) =>
        provider.id === id ? { ...provider, ...patch } : provider,
      ),
    }));
  }

  function addProvider() {
    const preset = PROVIDERS.find((item) => item.id === presetId);
    if (!preset) return;
    const baseId = preset.id;
    const id = draft.providers.some((provider) => provider.id === baseId)
      ? `${baseId}-${Date.now().toString(36).slice(-4)}`
      : baseId;
    const provider: ProviderConfig = {
      id,
      name: preset.name,
      baseUrl: preset.baseUrl,
      model: preset.model,
      apiKey: "",
      enabled: true,
      status: "unknown",
    };
    setDraft((current) => ({
      ...current,
      providers: [...current.providers, provider],
      activeProviderId: id,
    }));
    setShowKey(false);
  }

  function removeProvider(id: string) {
    if (draft.providers.length <= 1) return;
    setDraft((current) => {
      const providers = current.providers.filter((provider) => provider.id !== id);
      return {
        ...current,
        providers,
        activeProviderId:
          current.activeProviderId === id
            ? providers[0]?.id ?? ""
            : current.activeProviderId,
      };
    });
  }

  async function handleTest(provider: ProviderConfig) {
    setTestingId(provider.id);
    setTestMsg((current) => ({ ...current, [provider.id]: undefined }));
    try {
      const result = await testProvider(provider);
      updateProvider(provider.id, {
        status: "ok",
        lastTest: new Date().toISOString(),
        models: result.models,
        model:
          provider.model ||
          (result.models.length > 0 ? result.models[0] : provider.model),
      });
      setTestMsg((current) => ({
        ...current,
        [provider.id]: {
          ok: true,
          message:
            result.models.length > 0
              ? `OK · ${result.models.slice(0, 3).join(", ")}`
              : "Conexión OK · el proveedor respondió",
        },
      }));
    } catch (error) {
      updateProvider(provider.id, {
        status: "error",
        lastTest: new Date().toISOString(),
      });
      setTestMsg((current) => ({
        ...current,
        [provider.id]: {
          ok: false,
          message:
            error instanceof Error ? error.message : "Error de conexión",
        },
      }));
    } finally {
      setTestingId(null);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configuración multiproveedor"
      subtitle="Registrá proveedores, elegí el modelo activo y definí los límites del mesh."
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="btn-primary"
          >
            Guardar configuración
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-neon-cyan/80">
              Proveedores registrados
            </h3>
            <span className="font-mono text-[9px] text-slate-500">
              {draft.providers.length} configurados
            </span>
          </div>

          <div className="space-y-2">
            {draft.providers.map((provider) => {
              const active = provider.id === selected?.id;
              const message = testMsg[provider.id];
              return (
                <div
                  key={provider.id}
                  className={`rounded-lg border transition ${
                    active
                      ? "border-neon-cyan/40 bg-neon-cyan/[0.04]"
                      : "border-white/5 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2 p-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings("activeProviderId", provider.id)
                      }
                      className={`h-3 w-3 shrink-0 rounded-full border transition ${
                        active
                          ? "border-neon-cyan bg-neon-cyan shadow-[0_0_8px_#00f0ff]"
                          : "border-slate-600"
                      }`}
                      aria-label={`Activar ${provider.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        updateSettings("activeProviderId", provider.id);
                        setShowKey(false);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-medium text-slate-200">
                          {provider.name}
                        </span>
                        {active ? (
                          <span className="rounded bg-neon-cyan/10 px-1 py-0.5 font-mono text-[8px] text-neon-cyan">
                            ACTIVO
                          </span>
                        ) : null}
                        <StatusDot
                          color={
                            provider.status === "ok"
                              ? "green"
                              : provider.status === "error"
                              ? "red"
                              : "yellow"
                          }
                        />
                      </div>
                      <div className="truncate font-mono text-[9px] text-slate-500">
                        {provider.baseUrl || "sin endpoint"}
                        {provider.models && provider.models.length > 0
                          ? ` · ${provider.models.length} modelos`
                          : ""}
                      </div>
                      {message ? (
                        <div
                          className={`mt-1 flex items-center gap-1 text-[10px] ${
                            message.ok ? "text-neon-green" : "text-neon-red"
                          }`}
                        >
                          {message.ok ? (
                            <CheckCircle2 size={11} />
                          ) : (
                            <AlertCircle size={11} />
                          )}
                          <span className="line-clamp-1">{message.message}</span>
                        </div>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTest(provider)}
                      disabled={testingId === provider.id || !provider.baseUrl}
                      className="rounded p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-neon-cyan disabled:opacity-40"
                      title="Probar conexión"
                    >
                      {testingId === provider.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Zap size={13} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProvider(provider.id)}
                      disabled={draft.providers.length <= 1}
                      className="rounded p-1.5 text-slate-600 transition hover:bg-white/5 hover:text-neon-red disabled:opacity-30"
                      title="Quitar proveedor"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={presetId}
              onChange={(event) => setPresetId(event.target.value)}
              className="input-neon max-w-[190px] py-1.5 text-[11px]"
            >
              {PROVIDERS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={addProvider} className="btn-ghost">
              <Plus size={12} /> Agregar proveedor
            </button>
          </div>
        </section>

        {selected ? (
          <section className="space-y-3 rounded-lg border border-white/5 bg-white/[0.015] p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Editar · {selected.name}
              </h3>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-slate-500">
                  disponible para failover
                </span>
                <Toggle
                  checked={selected.enabled}
                  onChange={(value) =>
                    updateProvider(selected.id, { enabled: value })
                  }
                  label="Proveedor habilitado"
                />
              </div>
            </div>

            <Field
              label="Base URL"
              hint="compatible con OpenAI · el modelo se elige en la caja de chat"
            >
              <input
                value={selected.baseUrl}
                onChange={(event) =>
                  updateProvider(selected.id, { baseUrl: event.target.value })
                }
                placeholder="https://api.openai.com/v1"
                className="input-neon font-mono text-[11px]"
              />
            </Field>

            <Field label="API key" hint="se guarda solo en este navegador">
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={selected.apiKey}
                  onChange={(event) =>
                    updateProvider(selected.id, { apiKey: event.target.value })
                  }
                  placeholder="sk-… (opcional para proveedores locales)"
                  autoComplete="off"
                  className="input-neon pr-16 font-mono text-[11px]"
                />
                <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                  {selected.apiKey ? (
                    <button
                      type="button"
                      onClick={() => updateProvider(selected.id, { apiKey: "" })}
                      className="rounded px-1.5 py-0.5 font-mono text-[9px] text-slate-500 hover:text-neon-red"
                    >
                      borrar
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setShowKey((value) => !value)}
                    className="rounded p-1 text-slate-500 hover:text-slate-200"
                    aria-label={showKey ? "Ocultar API key" : "Mostrar API key"}
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </Field>

            <p className="rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 text-[10px] leading-relaxed text-slate-500">
              La API key se guarda en <span className="text-slate-300">localStorage</span> y
              sólo viaja al proveedor elegido a través del proxy del panel. No se
              persiste en el servidor. El proveedor activo se usa para el
              orquestador y para cada unidad del run. El modelo se elige y cambia desde la caja de chat.
            </p>
          </section>
        ) : null}

        <section className="space-y-3 border-t border-[#1a1a2e] pt-4">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-neon-purple/80">
            Ejecución
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Temperatura" hint={draft.temperature.toFixed(2)}>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={draft.temperature}
                onChange={(event) =>
                  updateSettings("temperature", Number(event.target.value))
                }
                className="range-neon mt-2 w-full"
              />
            </Field>
            <Field label="Max tokens">
              <input
                type="number"
                min={64}
                max={8192}
                step={64}
                value={draft.maxTokens}
                onChange={(event) =>
                  updateSettings("maxTokens", Number(event.target.value))
                }
                className="input-neon"
              />
            </Field>
            <Field label="Max loops">
              <input
                type="number"
                min={1}
                max={10}
                value={draft.maxLoops}
                onChange={(event) =>
                  updateSettings("maxLoops", Number(event.target.value))
                }
                className="input-neon"
              />
            </Field>
          </div>

          <div className="space-y-2 rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-slate-200">Verificar antes de publicar</div>
                <div className="text-[10px] text-slate-500">
                  Toda salida pasa por el bot Check.
                </div>
              </div>
              <Toggle
                checked={draft.autoVerify}
                onChange={(value) => updateSettings("autoVerify", value)}
                label="Verificación automática"
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-2">
              <div>
                <div className="text-xs text-slate-200">Permitir auto-pay</div>
                <div className="text-[10px] text-slate-500">
                  Si está off, los pagos requieren aprobación humana.
                </div>
              </div>
              <Toggle
                checked={draft.autoPay}
                onChange={(value) => updateSettings("autoPay", value)}
                label="Auto-pay"
              />
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
}
