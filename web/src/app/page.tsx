"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Header } from "@/components/Header";
import { GlobalView } from "@/components/GlobalView";
import { BotsView } from "@/components/BotsView";
import { RunsView } from "@/components/RunsView";
import { RulesView } from "@/components/RulesView";
import { MemoryView } from "@/components/MemoryView";
import { FacebookView } from "@/components/FacebookView";
import { SettingsModal } from "@/components/SettingsModal";
import { BotConfigModal } from "@/components/BotCard";
import { CharacterConfigModal } from "@/components/CharacterCard";
import { useStored } from "@/lib/useStored";
import {
  chatLLM,
  createComunidad,
  createPersonaje,
  getMe,
  isAuthenticated,
  listComunidades,
  listModelos,
  listPersonajes,
  listProveedores,
  listTareas,
  loginAdmin,
  logoutAdmin,
  updatePersonaje,
  type AuthUser,
  type Comunidad as ApiComunidad,
  type ModeloLLM,
  type Personaje as ApiPersonaje,
  type ProveedorLLM,
} from "@/lib/api";
import { timeNow, uid, colorForName } from "@/lib/theme";
import { ALL_BOTS } from "@/lib/data";
import type {
  Bot,
  Character,
  Color,
  LogEntry,
  Rule,
  RunRecord,
  Tab,
} from "@/lib/types";

function mapPersonaje(p: ApiPersonaje): Character {
  return {
    id: p.id,
    name: p.nombre,
    communityId: p.comunidad_id,
    color: colorForName(p.nombre),
    estado: (p.estado === "activo"
      ? "activo"
      : p.estado === "inactivo"
        ? "inactivo"
        : "en_preparacion") as Character["estado"],
    actividad: p.nivel_actividad ?? 5,
    bio: p.biografia_interna ?? "",
    temperamento: (p.personalidad as Record<string, string>)?.temperamento ?? "",
    temas: (p.personalidad as Record<string, string[]>)?.temas_preferidos ?? [],
  };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Error inesperado";
}

export default function PulseOS() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Global");

  // Bots y módulos: catálogo estructural del sistema (lib/data). No son
  // datos de la aplicación; las ediciones valen solo por la sesión.
  const [bots, setBots] = useState<Bot[]>([...ALL_BOTS]);
  // Reglas y corridas: arrancan VACÍAS. Las corridas registran envíos
  // reales de esta interfaz; nada viene precargado.
  const [rules, setRules] = useStored<Rule[]>("pulse.rules.v2", []);
  const [runs, setRuns] = useStored<RunRecord[]>("pulse.runs.v2", []);

  // Personajes y comunidades: SIEMPRE desde el backend.
  const [characters, setCharacters] = useState<Character[]>([]);
  const [charactersError, setCharactersError] = useState("");
  const [comunidades, setComunidades] = useState<ApiComunidad[]>([]);

  // Proveedores y modelos LLM: SIEMPRE desde el backend.
  const [proveedores, setProveedores] = useState<ProveedorLLM[]>([]);
  const [modelos, setModelos] = useState<ModeloLLM[]>([]);
  const [selModeloId, setSelModeloId] = useStored<string>(
    "pulse.llm.modelo.v2",
    "",
  );

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [meshStats, setMeshStats] = useState<{
    unidades: number;
    verificadas: number;
    fallidas: number;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const [llmReply, setLlmReply] = useState("");
  const [llmError, setLlmError] = useState("");
  const [actionError, setActionError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [botEditing, setBotEditing] = useState<Bot | null>(null);
  const [characterEditing, setCharacterEditing] = useState<Character | null>(
    null,
  );

  const tokenRef = useRef(0);

  const modelosDisponibles = modelos.filter((m) => m.disponible);
  const selectedModelo =
    modelosDisponibles.find((m) => m.id === selModeloId) ??
    modelosDisponibles[0];
  const selectedProveedor = proveedores.find(
    (p) => p.id === selectedModelo?.proveedor_id,
  );
  const configured = Boolean(selectedModelo) && selectedProveedor?.activo !== false;
  const providerName = selectedProveedor?.nombre ?? "sin proveedor";
  const modelName = selectedModelo?.identificador_tecnico ?? "sin modelo";
  const composerModels = modelosDisponibles.map((m) => {
    const prov = proveedores.find((p) => p.id === m.proveedor_id);
    return {
      id: m.id,
      label: prov ? `${m.identificador_tecnico} · ${prov.nombre}` : m.identificador_tecnico,
    };
  });

  function addLog(source: string, message: string, color?: Color) {
    const entry: LogEntry = {
      id: uid("log"),
      time: timeNow(),
      source,
      message,
      color,
    };
    setLogs((prev) => [...prev.slice(-199), entry]);
    return entry;
  }

  // ------------------------------------------------------------------
  // Cargas desde el backend (la respuesta — incluso vacía — manda)
  // ------------------------------------------------------------------

  const loadPersonajes = useCallback(async () => {
    try {
      const apiPersonajes = await listPersonajes();
      setCharacters(apiPersonajes.map(mapPersonaje));
      setCharactersError("");
    } catch (e) {
      setCharacters([]);
      setCharactersError(
        `No pude cargar los personajes del backend (${errorText(e)}). Revisá que el servidor esté levantado; no se muestra ningún dato de ejemplo.`,
      );
    }
  }, []);

  const loadComunidades = useCallback(async () => {
    try {
      setComunidades(await listComunidades());
    } catch {
      setComunidades([]);
    }
  }, []);

  const loadLLM = useCallback(async () => {
    try {
      const [provs, mods] = await Promise.all([
        listProveedores(),
        listModelos(),
      ]);
      setProveedores(provs);
      setModelos(mods);
    } catch {
      setProveedores([]);
      setModelos([]);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated()) {
      getMe().then(setAuthUser).catch(() => logoutAdmin());
    }
    setMounted(true);
    return () => {
      tokenRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    void loadPersonajes();
    void loadComunidades();
    void loadLLM();
  }, [mounted, loadPersonajes, loadComunidades, loadLLM]);

  // Estadísticas reales del mesh (tareas de Facebook del backend)
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const tareas = await listTareas();
        if (cancelled) return;
        const fb = tareas.filter((t) => t.tipo.startsWith("fb_"));
        setMeshStats({
          unidades: fb.length,
          verificadas: fb.filter(
            (t) =>
              t.estado === "completada" &&
              (t.resultado as Record<string, unknown> | null)?.verificado === true,
          ).length,
          fallidas: fb.filter((t) => t.estado === "fallida").length,
        });
      } catch {
        if (!cancelled) setMeshStats(null);
      }
    };
    void tick();
    const id = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [mounted]);

  // ------------------------------------------------------------------
  // Envío al LLM del backend: el resultado SIEMPRE se muestra
  // ------------------------------------------------------------------

  function pushRun(record: Omit<RunRecord, "id">) {
    setRuns((prev) => [{ ...record, id: uid("run") }, ...prev].slice(0, 30));
  }

  async function startRun(prompt: string) {
    if (sending) return;
    setLlmReply("");
    setLlmError("");

    if (!configured || !selectedModelo) {
      const message =
        "Todavía no hay un modelo LLM disponible en el backend, así que no se envió nada. Cargá un proveedor y un modelo en ⚙ → Proveedores, probá la conexión ahí y volvé a intentar.";
      setLlmError(message);
      addLog("llm", "sin proveedor en el backend · nada enviado", "red");
      return;
    }

    const token = tokenRef.current + 1;
    tokenRef.current = token;
    const startMs = Date.now();
    const startedAt = new Date(startMs).toISOString();
    const runLogs: LogEntry[] = [];
    runLogs.push(
      addLog(
        "orquestador",
        `objetivo recibido · ${providerName} / ${modelName}`,
        "cyan",
      ),
    );
    setSending(true);

    try {
      const res = await chatLLM({
        messages: [{ role: "user", content: prompt }],
        modelo_id: selectedModelo.id,
      });
      if (tokenRef.current !== token) return;
      const content = res.content ?? "";
      setLlmReply(content);
      runLogs.push(
        addLog(
          "llm",
          `respuesta recibida · ${content.length} caracteres · ${res.model_used ?? modelName}`,
          "purple",
        ),
      );
      pushRun({
        prompt,
        model: res.model_used ?? modelName,
        status: "complete",
        units: 1,
        verified: 1,
        rejected: 0,
        startedAt,
        durationMs: Date.now() - startMs,
        logs: runLogs.slice(-24),
        outputs: [
          {
            label: "respuesta",
            bot: res.provider_used ?? providerName,
            content,
          },
        ],
      });
    } catch (e) {
      if (tokenRef.current !== token) return;
      const message = `${errorText(e)} Si el problema sigue, revisá el proveedor en ⚙ → Proveedores y probá la conexión desde ahí.`;
      setLlmError(message);
      runLogs.push(addLog("llm", "error del proveedor LLM", "red"));
      pushRun({
        prompt,
        model: modelName,
        status: "error",
        units: 1,
        verified: 0,
        rejected: 1,
        startedAt,
        durationMs: Date.now() - startMs,
        logs: runLogs.slice(-24),
        outputs: [],
      });
    } finally {
      if (tokenRef.current === token) setSending(false);
    }
  }

  function stopRun() {
    tokenRef.current += 1;
    setSending(false);
    addLog("output", "envío detenido por el operador", "red");
  }

  // ------------------------------------------------------------------
  // Bots (catálogo estructural) y personajes (backend)
  // ------------------------------------------------------------------

  function saveBot(bot: Bot) {
    setBots((prev) => prev.map((item) => (item.id === bot.id ? bot : item)));
    addLog("config", `bot actualizado · ${bot.name}`, "cyan");
  }

  function toggleBotConnection(bot: Bot) {
    const next = !bot.connected;
    setBots((prev) =>
      prev.map((item) =>
        item.id === bot.id ? { ...item, connected: next } : item,
      ),
    );
    addLog(
      "mesh",
      `${bot.name} ${next ? "conectado al" : "desconectado del"} mesh`,
      next ? "green" : "yellow",
    );
  }

  function newCharacter() {
    setCharacterEditing({
      id: `new-${Date.now().toString(36)}`,
      name: "",
      communityId: comunidades[0]?.id ?? "",
      color: "cyan",
      estado: "en_preparacion",
      actividad: 5,
      bio: "",
      temperamento: "",
      temas: [],
    });
  }

  function saveCharacter(character: Character, nuevaComunidad?: string) {
    const isNew = character.id.startsWith("new-");
    void (async () => {
      try {
        let comunidadId = character.communityId;
        if (isNew) {
          if (!comunidadId && nuevaComunidad?.trim()) {
            const creada = await createComunidad({
              nombre: nuevaComunidad.trim(),
            });
            comunidadId = creada.id;
            await loadComunidades();
          }
          if (!comunidadId) {
            throw new Error(
              "el personaje necesita una comunidad: elegí una o creá la primera desde el formulario.",
            );
          }
          await createPersonaje({
            nombre: character.name,
            comunidad_id: comunidadId,
            biografia_interna: character.bio,
            nivel_actividad: character.actividad,
            personalidad: {
              temperamento: character.temperamento,
              temas_preferidos: character.temas,
            },
          });
        } else {
          await updatePersonaje(character.id, {
            nombre: character.name,
            comunidad_id: character.communityId || undefined,
            biografia_interna: character.bio,
            nivel_actividad: character.actividad,
            personalidad: {
              temperamento: character.temperamento,
              temas_preferidos: character.temas,
            },
            estado: character.estado,
          });
        }
        await loadPersonajes();
        setActionError("");
        addLog(
          "persona",
          `${isNew ? "personaje creado" : "personaje actualizado"} · ${character.name}`,
          "purple",
        );
      } catch (e) {
        const message = `No pude guardar el personaje «${character.name}»: ${errorText(e)}`;
        setActionError(message);
        addLog("persona", "error al guardar el personaje en el backend", "red");
      }
    })();
  }

  function refreshMesh() {
    void loadPersonajes();
    void loadLLM();
    addLog(
      "pulse",
      `mesh refreshed · ${characters.length} personajes del backend · ${meshStats?.unidades ?? 0} tareas fb`,
      "green",
    );
  }

  if (!mounted) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#050508] font-mono text-[10px] tracking-[0.2em] text-slate-600">
        INICIANDO PULSE MESH…
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#050508] text-slate-200">
      <Header
        activeTab={activeTab}
        onTab={setActiveTab}
        onRefresh={refreshMesh}
        stats={{
          online: characters.filter((c) => c.estado === "activo").length,
          units: meshStats?.unidades ?? 0,
          verified: meshStats?.verificadas ?? 0,
          rejected: meshStats?.fallidas ?? 0,
          rules: rules.filter((rule) => rule.active).length,
        }}
        configured={configured}
        model={modelName}
        running={sending}
        onSettings={() => setSettingsOpen(true)}
      />

      {actionError ? (
        <div className="flex shrink-0 items-start gap-2 border-b border-neon-red/30 bg-neon-red/[0.07] px-3 py-2 text-[11px] leading-relaxed text-neon-red sm:px-5">
          <span className="min-w-0 flex-1">{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError("")}
            className="shrink-0 rounded p-0.5 transition hover:bg-white/5"
            aria-label="Descartar error"
          >
            <X size={13} />
          </button>
        </div>
      ) : null}

      <main className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "Global" ? (
          <GlobalView
            characters={characters}
            charactersError={charactersError}
            logs={logs}
            configured={configured}
            providerName={providerName}
            activeModel={selectedModelo?.id ?? ""}
            models={composerModels}
            onSetModel={setSelModeloId}
            llmReply={llmReply}
            llmError={llmError}
            sending={sending}
            onRun={(prompt) => void startRun(prompt)}
            onStop={stopRun}
            onDismissReply={() => {
              setLlmReply("");
              setLlmError("");
            }}
            onOpenSettings={() => setSettingsOpen(true)}
            onConfigureCharacter={setCharacterEditing}
            onNewCharacter={newCharacter}
            onClearLogs={() => setLogs([])}
          />
        ) : activeTab === "Bots" ? (
          <BotsView
            bots={bots}
            onConfigure={setBotEditing}
            onConnect={toggleBotConnection}
          />
        ) : activeTab === "Runs" ? (
          <RunsView runs={runs} onClear={() => setRuns([])} />
        ) : activeTab === "Rules" ? (
          <RulesView rules={rules} onChange={setRules} />
        ) : activeTab === "Memory" ? (
          <MemoryView />
        ) : activeTab === "Facebook" ? (
          <FacebookView characters={characters} />
        ) : null}
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onChanged={() => void loadLLM()}
      />
      <BotConfigModal
        key={botEditing?.id ?? "bot-closed"}
        open={botEditing !== null}
        bot={botEditing}
        globalModel={modelName}
        onClose={() => setBotEditing(null)}
        onSave={saveBot}
      />
      <CharacterConfigModal
        key={characterEditing?.id ?? "character-closed"}
        open={characterEditing !== null}
        character={characterEditing}
        comunidades={comunidades}
        onClose={() => setCharacterEditing(null)}
        onSave={saveCharacter}
      />

      {loginOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-[#23233a] bg-[#08080f] p-4">
            <h3 className="text-sm font-semibold text-slate-100">Login admin</h3>
            <div className="mt-3 space-y-3">
              <input value={loginUser} onChange={(e) => setLoginUser(e.target.value)} placeholder="Usuario" className="input-neon text-[11px]" />
              <input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="Contraseña" className="input-neon text-[11px]" />
            </div>
            {loginError ? <p className="mt-2 text-[10px] text-neon-red">{loginError}</p> : null}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => { setLoginOpen(false); setLoginError(""); }} className="btn-ghost">Cancelar</button>
              <button type="button" disabled={!loginUser.trim() || !loginPass.trim()} onClick={async () => {
                try {
                  await loginAdmin(loginUser.trim(), loginPass);
                  const user = await getMe();
                  setAuthUser(user);
                  setLoginOpen(false);
                  setLoginUser("");
                  setLoginPass("");
                  setLoginError("");
                } catch {
                  setLoginError("Usuario o contraseña incorrectos");
                }
              }} className="btn-primary">Ingresar</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
