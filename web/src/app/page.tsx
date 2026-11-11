"use client";

import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { GlobalView } from "@/components/GlobalView";
import { BotsView } from "@/components/BotsView";
import { RunsView } from "@/components/RunsView";
import { RulesView } from "@/components/RulesView";
import { MemoryView } from "@/components/MemoryView";
import { FacebookView } from "@/components/FacebookView";
import { SettingsModal } from "@/components/SettingsModal";
import { BotConfigModal, unitCode } from "@/components/BotCard";
import { CharacterConfigModal } from "@/components/CharacterCard";
import { useStored } from "@/lib/useStored";
import { activeProvider, callLLM, llmConfigured } from "@/lib/llm";
import { listPersonajes, createPersonaje, updatePersonaje, loginAdmin, logoutAdmin, isAuthenticated, getMe } from "@/lib/api";
import type { AuthUser } from "@/lib/api";
import type { Comunidad as ApiComunidad, Personaje as ApiPersonaje } from "@/lib/api";
import { timeNow, uid } from "@/lib/theme";
import {
  ALL_BOTS,
  CHARACTERS,
  DEFAULT_RULES,
  DEFAULT_SETTINGS,
  INITIAL_MEMORY,
  INITIAL_RUNS,
  SOCIAL_ACCOUNTS,
  initialLogs,
} from "@/lib/data";
import type {
  Bot,
  Character,
  Community,
  Color,
  LogEntry,
  MemoryEntry,
  Rule,
  RunRecord,
  RunState,
  Settings,
  Tab,
  Unit,
} from "@/lib/types";

const DEMO_CONTENT: string[] = [
  "Hoy hicimos una limpieza del refugio y los chicos respondieron genial 🐾",
  "Tip del día: revisá las orejas de tu gato una vez por semana, evita infecciones.",
  "Se busca hogar para Simona, 2 años, super cariñosa. Compartan!",
  "Les dejamos el calendario de vacunación gratuito para este mes.",
  "Gracias a todos los que donaron alimento, llegamos a la meta del mes 🙌",
];

function demoUnitContent(persona: Character | undefined, label: string): string {
  const base = DEMO_CONTENT[Math.floor(Math.random() * DEMO_CONTENT.length)];
  if (persona) return `${base} — ${persona.name}`;
  return `${base} (${label})`;
}

function unitSystem(bot: Bot, persona: Character | undefined): string {
  const lines = [
    `Sos ${bot.name}, un bot del mesh de Pulse OS.`,
    bot.instructions ? `Instrucciones: ${bot.instructions}` : `Rol: ${bot.desc}`,
  ];
  if (persona) {
    lines.push(
      `Operás como ${persona.name} en Pulse OS, una red social con perfiles propios. Temperamento: ${persona.temperamento}. Temas: ${persona.temas.join(", ")}. Bio: ${persona.bio}. Escribí como una persona real, en primera persona.`,
    );
  }
  lines.push(
    "Respondé en español rioplatense. Devolvé ÚNICAMENTE el contenido final para publicar (sin prefijos, sin explicaciones, sin comillas). Máximo 3 frases cortas.",
  );
  return lines.join("\n");
}

export default function PulseOS() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Global");
  const [settings, setSettings] = useStored<Settings>(
    "pulse.settings.v1",
    DEFAULT_SETTINGS,
  );
  const [bots, setBots] = useStored<Bot[]>("pulse.bots.v1", [...ALL_BOTS]);
  const [rules, setRules] = useStored<Rule[]>("pulse.rules.v1", [
    ...DEFAULT_RULES,
  ]);
  const [memories, setMemories] = useStored<MemoryEntry[]>(
    "pulse.memory.v1",
    [...INITIAL_MEMORY],
  );
  const [characters, setCharacters] = useStored<Character[]>(
    "pulse.characters.v1",
    [...CHARACTERS],
  );
  const [accounts, setAccounts] = useStored(
    "pulse.accounts.v1",
    [...SOCIAL_ACCOUNTS],
  );
  const [runs, setRuns] = useStored<RunRecord[]>("pulse.runs.v1", [
    ...INITIAL_RUNS,
  ]);

  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [run, setRun] = useState<RunState>({
    status: "idle",
    units: [],
    prompt: "",
    expected: 0,
  });
  const [llmReply, setLlmReply] = useState("");
  const [llmError, setLlmError] = useState("");
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const provider = activeProvider(settings);
  const providerName = provider?.name ?? "sin proveedor";
  const modelName = provider?.model ?? "sin modelo";
  const configured = llmConfigured(settings);

  useEffect(() => {
    if (isAuthenticated()) {
      getMe().then(setAuthUser).catch(() => logoutAdmin());
    }
    setMounted(true);
    return () => {
      tokenRef.current += 1;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Sincronizar comunidades y personajes con el backend al montar
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    (async () => {
      try {
        const apiPersonajes = await listPersonajes();
        if (cancelled || !apiPersonajes.length) return;
        const mapped: Character[] = apiPersonajes.map((p) => ({
          id: p.id,
          name: p.nombre,
          communityId: p.comunidad_id,
          color: "cyan" as Color,
          estado: (p.estado === "activo" ? "activo" : p.estado === "inactivo" ? "inactivo" : "en_preparacion") as Character["estado"],
          actividad: p.nivel_actividad ?? 5,
          bio: p.biografia_interna ?? "",
          temperamento: (p.personalidad as Record<string, string>)?.temperamento ?? "",
          temas: (p.personalidad as Record<string, string[]>)?.temas_preferidos ?? [],
        }));
        setCharacters(mapped);
      } catch {
        // Backend no disponible, usar datos locales
      }
    })();
    return () => { cancelled = true; };
  }, [mounted]);

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

  function startRun(prompt: string) {
    if (run.status === "running") return;

    const enabled = bots.filter((bot) => bot.enabled);
    if (enabled.length === 0) {
      addLog("pulse", "no hay bots habilitados para ejecutar", "red");
      return;
    }

    const ordered = [...enabled].sort(
      (a, b) => Number(b.connected) - Number(a.connected),
    );
    const pool = ordered.slice(0, 15);
    const expected = Math.max(6, Math.min(15, pool.length));
    const token = tokenRef.current + 1;
    tokenRef.current = token;
    const startMs = Date.now();
    const startedAt = new Date(startMs).toISOString();
    const runLogs: LogEntry[] = [];
    const collected: Unit[] = [];

    function pushLog(source: string, message: string, color?: Color) {
      runLogs.push(addLog(source, message, color));
    }

    setRun({ status: "running", units: [], prompt, expected });
    setLlmReply("");
    setLlmError("");
    pushLog("orquestador", `objetivo recibido · ${expected} unidades`, "cyan");
    pushLog("router", `modelo activo · ${configured ? modelName : "demo"}`, "yellow");

    if (configured) {
      callLLM(prompt, settings)
        .then((reply) => {
          if (tokenRef.current !== token) return;
          setLlmReply(reply);
          addLog("llm", `respuesta recibida · ${reply.length} caracteres`, "purple");
        })
        .catch((error: unknown) => {
          if (tokenRef.current !== token) return;
          setLlmError(
            error instanceof Error ? error.message : "Error al llamar al LLM.",
          );
          addLog("llm", "error de proveedor · revisá la configuración", "red");
        });
    } else {
      const plan = pool
        .slice(0, 3)
        .map((bot, index) => `${index + 1}. ${bot.name} (${bot.tag}) — ${bot.desc}`)
        .join("\n");
      setLlmReply(
        `Modo demo · sin API key.\n\nPlan para “${prompt}”:\n${plan}\n\nLas unidades se ejecutan de forma simulada.`,
      );
      addLog("llm", "plan demo generado sin proveedor", "yellow");
    }

    let index = 0;

    function finish() {
      const verified = collected.filter(
        (unit) => unit.status === "verified",
      ).length;
      const rejected = collected.filter(
        (unit) => unit.status === "rejected",
      ).length;
      setRun({
        status: "complete",
        units: collected.map((unit) => ({ ...unit })),
        prompt,
        expected,
      });
      pushLog(
        "check",
        `${verified} verificadas · ${rejected} ${
          rejected === 1 ? "rechazada" : "rechazadas"
        }`,
        rejected > 0 ? "yellow" : "green",
      );
      pushLog("output", "run completo · salida verificada", "green");
      const record: RunRecord = {
        id: uid("run"),
        prompt,
        model: configured ? modelName : "demo",
        status: "complete",
        units: collected.length,
        verified,
        rejected,
        startedAt,
        durationMs: Date.now() - startMs,
        logs: runLogs.slice(-24),
        outputs: collected
          .filter((unit) => unit.output && unit.status === "verified")
          .map((unit) => {
            const bot = pool.find((item) => item.id === unit.botId);
            return {
              label: unit.label,
              bot: bot?.name ?? unit.botId,
              content: unit.output as string,
            };
          })
          .slice(0, 20),
      };
      setRuns((prev) => [record, ...prev].slice(0, 30));
    }

    const personasPool = characters;

    async function executeUnit(
      bot: Bot,
      persona: Character | undefined,
      label: string,
    ): Promise<{ ok: boolean; content: string; error?: string }> {
      await new Promise((resolve) => setTimeout(resolve, 350 + Math.random() * 400));
      if (!configured) {
        return { ok: true, content: demoUnitContent(persona, label) };
      }
      try {
        const content = await callLLM(
          `Tarea del operador: ${prompt}\nUnidad a ejecutar: ${label}`,
          settings,
          { system: unitSystem(bot, persona), maxTokens: 240 },
        );
        if (!content || content.trim().length < 30) {
          return {
            ok: false,
            content: content ?? "",
            error: "contenido insuficiente",
          };
        }
        return { ok: true, content: content.trim() };
      } catch (error) {
        return {
          ok: false,
          content: "",
          error: error instanceof Error ? error.message : "error de LLM",
        };
      }
    }

    async function step() {
      if (tokenRef.current !== token) return;

      if (index >= expected) {
        finish();
        return;
      }

      const bot = pool[index];
      const persona =
        personasPool.length > 0 ? personasPool[index % personasPool.length] : undefined;
      const unit: Unit = {
        id: String(index + 1).padStart(2, "0"),
        botId: bot.id,
        label: unitCode(bot, index),
        status: "running",
      };
      collected.push(unit);
      setRun((current) => ({
        ...current,
        units: collected.map((item) => ({ ...item })),
      }));
      pushLog(
        "mesh",
        `unit ${unit.id} · ${unit.label}${persona ? ` · ${persona.name}` : ""}`,
        bot.color,
      );
      index += 1;

      const result = await executeUnit(bot, persona, unit.label);
      if (tokenRef.current !== token) return;
      unit.status = result.ok ? "verified" : "rejected";
      unit.output = result.content || undefined;
      unit.error = result.error;
      setRun((current) => ({
        ...current,
        units: collected.map((item) => ({ ...item })),
      }));
      pushLog(
        "check",
        `${unit.label} · ${result.ok ? "verified" : `rejected · ${result.error ?? ""}`}`,
        result.ok ? "green" : "red",
      );
      timerRef.current = setTimeout(step, 420);
    }

    void step();
  }

  function stopRun() {
    tokenRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    setRun((current) => ({ ...current, status: "error" }));
    addLog("output", "corrida detenida por el operador", "red");
  }

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

  function saveCharacter(character: Character) {
    const exists = characters.some((item) => item.id === character.id);
    setCharacters((prev) =>
      exists
        ? prev.map((item) => (item.id === character.id ? character : item))
        : [...prev, character],
    );
    // Sincronizar con backend
    (async () => {
      try {
        if (exists) {
          await updatePersonaje(character.id, {
            nombre: character.name,
            biografia_interna: character.bio,
            nivel_actividad: character.actividad,
            personalidad: { temperamento: character.temperamento, temas_preferidos: character.temas },
            estado: character.estado,
          });
        } else {
          await createPersonaje({
            nombre: character.name,
            comunidad_id: character.communityId || "gatos",
            biografia_interna: character.bio,
            nivel_actividad: character.actividad,
            personalidad: { temperamento: character.temperamento, temas_preferidos: character.temas },
          });
        }
      } catch {
        // Backend no disponible
      }
    })();
    addLog(
      "persona",
      `${exists ? "personaje actualizado" : "personaje creado"} · ${character.name}`,
      "purple",
    );
  }

  function toggleAccount(id: string) {
    setAccounts((prev) =>
      prev.map((account) => {
        if (account.id !== id) return account;
        const connected = account.status === "conectado";
        return {
          ...account,
          status: connected ? "desconectado" : "conectado",
          lastSync: connected ? account.lastSync : "ahora",
        };
      }),
    );
    addLog("social", "estado de la Página actualizado", "pink");
  }

  function saveSettings(next: Settings) {
    setSettings(next);
    addLog("config", "configuración multiproveedor guardada", "green");
  }

  function setModel(model: string) {
    setSettings((current) => ({
      ...current,
      providers: current.providers.map((item) =>
        item.id === current.activeProviderId
          ? { ...item, model: model.trim() }
          : item,
      ),
    }));
  }

  function refreshMesh() {
    addLog(
      "pulse",
      `mesh refreshed · ${bots.filter((bot) => bot.enabled).length} bots · ${
        characters.length
      } personajes`,
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

  const verified = run.units.filter((unit) => unit.status === "verified").length;
  const rejected = run.units.filter((unit) => unit.status === "rejected").length;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#050508] text-slate-200">
      <Header
        activeTab={activeTab}
        onTab={setActiveTab}
        onRefresh={refreshMesh}
        stats={{
          online: bots.filter((bot) => bot.enabled).length,
          units: run.units.length,
          verified,
          rejected,
          rules: rules.filter((rule) => rule.active).length,
        }}
        configured={configured}
        model={modelName}
        running={run.status === "running"}
        onSettings={() => setSettingsOpen(true)}
      />

      <main className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "Global" ? (
          <GlobalView
            bots={bots}
            characters={characters}
            run={run}
            logs={logs}
            settings={settings}
            configured={configured}
            providerName={providerName}
            activeModel={modelName}
            models={provider?.models ?? []}
            onSetModel={setModel}
            llmReply={llmReply}
            llmError={llmError}
            onRun={startRun}
            onStop={stopRun}
            onOpenSettings={() => setSettingsOpen(true)}
            onConfigureBot={setBotEditing}
            onConnectBot={toggleBotConnection}
            onConfigureCharacter={setCharacterEditing}
            onClearLogs={() => setLogs([])}
          />
        ) : activeTab === "Bots" ? (
          <BotsView
            bots={bots}
            settings={settings}
            onConfigure={setBotEditing}
            onConnect={toggleBotConnection}
          />
        ) : activeTab === "Runs" ? (
          <RunsView runs={runs} onClear={() => setRuns([])} />
        ) : activeTab === "Rules" ? (
          <RulesView rules={rules} onChange={setRules} />
        ) : activeTab === "Memory" ? (
          <MemoryView memories={memories} onChange={setMemories} />
        ) : activeTab === "Facebook" ? (
          <FacebookView
            characters={characters}
          />
        ) : null}
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={saveSettings}
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
