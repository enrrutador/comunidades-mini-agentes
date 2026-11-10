import type {
  Bot,
  Character,
  Community,
  LogEntry,
  MemoryEntry,
  ProviderPreset,
  Rule,
  RunRecord,
  Settings,
  SocialAccount,
} from "./types";

export const MODULES: Bot[] = [
  { id: "orquestador", name: "Orquestador", tag: "OR", color: "cyan", kind: "module", tools: "LLM Central", desc: "Interpreta objetivos y coordina el mesh.", instructions: "Traducí cada objetivo en un plan de unidades, seleccioná bots, recuperá memoria y evaluá resultados.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: true },
  { id: "persona-manager", name: "Persona Manager", tag: "PM", color: "purple", kind: "module", tools: "Identidades", desc: "Administra identidades y personalidades.", instructions: "Mantené las fichas de personalidad, estilo y estado de cada personaje de la comunidad activa.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: true },
  { id: "memory-core", name: "Memory Core", tag: "MC", color: "green", kind: "module", tools: "Memoria", desc: "Recupera memoria individual y colectiva.", instructions: "Recuperá sólo el contexto relevante para cada tarea. Individual, colectiva, episódica y semántica.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: true },
  { id: "task-queue", name: "Task Queue", tag: "TQ", color: "orange", kind: "module", tools: "Cola de tareas", desc: "Distribuye trabajos y controla concurrencia.", instructions: "Encolá unidades con prioridad, reintentos e idempotencia. Respetá el límite de concurrencia.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: true },
  { id: "social-adapter", name: "Social Adapter", tag: "SA", color: "pink", kind: "module", tools: "Facebook", desc: "Conecta cuentas y Páginas.", instructions: "Publicá e interactuá sólo con acciones permitidas por la plataforma y aprobadas por reglas.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: true },
  { id: "router-llm", name: "Router LLM", tag: "RL", color: "yellow", kind: "module", tools: "Multiproveedor", desc: "Selecciona modelo y aplica failover.", instructions: "Elegí el modelo por tarea, costo y disponibilidad. Si falla, reintentá con el fallback.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: true },
  { id: "relation-graph", name: "Relation Graph", tag: "RG", color: "blue", kind: "module", tools: "Relaciones", desc: "Modela vínculos entre personajes.", instructions: "Actualizá relaciones, afinidad e historial de interacción entre personajes de la comunidad.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: true },
  { id: "activity-log", name: "Activity Log", tag: "AL", color: "red", kind: "module", tools: "Eventos", desc: "Registra actividad y decisiones.", instructions: "Registrá cada evento con modelo usado, unidades verificadas, rechazadas y motivo del rechazo.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: true },
];

export const WORKFLOW_BOTS: Bot[] = [
  { id: "inbox-triage", name: "Inbox Triage", tag: "IT", color: "green", kind: "workflow", tools: "Mail · Labels", desc: "Ordena la bandeja y prepara respuestas.", instructions: "Clasificá la bandeja por prioridad, etiquetá cada correo y redactá borradores sin enviar.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: true },
  { id: "meeting-prep", name: "Meeting Prep", tag: "MP", color: "pink", kind: "workflow", tools: "Calendar · Docs", desc: "Prepara contexto y agenda de reuniones.", instructions: "Armá la agenda, recuperá contexto de la última interacción y prepará preguntas clave.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: true },
  { id: "content-calendar", name: "Content Calendar", tag: "CC", color: "pink", kind: "workflow", tools: "X · Drafts", desc: "Planifica publicaciones y borradores.", instructions: "Proponé un calendario editorial semanal, redactá borradores y coordiná formatos por red.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: true },
  { id: "expense-tracker", name: "Expense Tracker", tag: "ET", color: "purple", kind: "workflow", tools: "Sheets · Receipts", desc: "Extrae gastos y detecta anomalías.", instructions: "Extraé gastos de comprobantes, categorizá cada movimiento y marcá anomalías para revisión.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: false },
  { id: "bug-repro", name: "Bug Repro", tag: "BR", color: "orange", kind: "workflow", tools: "Repo · Shell", desc: "Reproduce bugs y aísla la causa.", instructions: "Reproducí el bug en un entorno aislado, registrá los pasos y proponé un fix con tests.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: true },
  { id: "competitor-watch", name: "Competitor Watch", tag: "CW", color: "red", kind: "workflow", tools: "Web · Alerts", desc: "Monitorea competidores y resume cambios.", instructions: "Relevá cambios en sitios y redes de competidores, resumí lo relevante y priorizá alertas.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: false },
  { id: "travel-planner", name: "Travel Planner", tag: "TP", color: "pink", kind: "workflow", tools: "Browser · Calendar", desc: "Arma itinerarios y compara opciones.", instructions: "Compará opciones de viaje, armá un itinerario y dejá reservas pendientes de aprobación.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: false },
  { id: "follow-up", name: "Follow-up", tag: "FU", color: "purple", kind: "workflow", tools: "Mail · CRM", desc: "Detecta conversaciones frías y sigue.", instructions: "Detectá conversaciones sin respuesta y redactá seguimientos breves con contexto del CRM.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: true },
  { id: "research", name: "Research", tag: "RS", color: "orange", kind: "workflow", tools: "Web · Docs", desc: "Investiga, contrasta y cita fuentes.", instructions: "Investigá el tema pedido, contrastá al menos tres fuentes y devolvé un resumen con citas.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: true },
  { id: "daily-digest", name: "Daily Digest", tag: "DD", color: "green", kind: "workflow", tools: "Chat · Notes", desc: "Resume el día y prioriza mañana.", instructions: "Resumí la actividad del día, destacá decisiones pendientes y priorizá las tareas de mañana.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: true },
  { id: "lead-scout", name: "Lead Scout", tag: "LS", color: "red", kind: "workflow", tools: "Web · CRM", desc: "Busca y califica leads.", instructions: "Buscá leads según el perfil objetivo, calificá señales de intención y enriquecé los contactos.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: false },
  { id: "invoice-bot", name: "Invoice Bot", tag: "IB", color: "purple", kind: "workflow", tools: "Sheets · Mail", desc: "Genera facturas y concilia pagos.", instructions: "Generá facturas a partir de los servicios del mes, conciliá pagos y avisá vencimientos.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: false },
  { id: "support-desk", name: "Support Desk", tag: "SD", color: "orange", kind: "workflow", tools: "Helpdesk · Mail", desc: "Responde tickets y escala casos.", instructions: "Respondé tickets con la base de conocimiento, escalá casos críticos y actualizá la FAQ.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: true },
  { id: "social-poster", name: "Social Poster", tag: "SP", color: "green", kind: "workflow", tools: "X · Media", desc: "Programa posts y mide engagement.", instructions: "Programá publicaciones aprobadas, adaptá el formato por red y medí engagement inicial.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: true },
  { id: "code-review", name: "Code Review", tag: "CR", color: "red", kind: "workflow", tools: "Repo · Diff", desc: "Revisa diffs y detecta riesgos.", instructions: "Revisá el diff, detectá riesgos de seguridad y regresiones, y sugerí mejoras concretas.", model: "", maxLoops: 3, autoVerify: true, enabled: true, connected: false },
];

export const ALL_BOTS: Bot[] = [...MODULES, ...WORKFLOW_BOTS];

export const COMMUNITIES: Community[] = [
  { id: "pulse-os", name: "pulse-os", color: "cyan", agents: 15, tematica: "Sistema operativo de agentes", descripcion: "Workspace interno de orquestación: módulos, bots de workflow y métricas del mesh." },
  { id: "gatos", name: "Comunidad Gatos", color: "cyan", agents: 48, tematica: "Gatos y adopción", descripcion: "Comunidad de referencia: personajes con identidad propia, memoria e historial social." },
  { id: "tech", name: "Tech & IA", color: "purple", agents: 32, tematica: "Tecnología e inteligencia artificial", descripcion: "Personajes que debaten modelos, herramientas y cultura open-source." },
  { id: "deportes", name: "Deportes", color: "green", agents: 27, tematica: "Deportes y comunidad", descripcion: "Cobertura, opinión y conversación sobre deportes." },
  { id: "historia", name: "Historia", color: "orange", agents: 19, tematica: "Historia y divulgación", descripcion: "Relatos, efemérides y debate histórico." },
  { id: "entretenimiento", name: "Entretenimiento", color: "pink", agents: 41, tematica: "Cultura y entretenimiento", descripcion: "Personajes que comentan series, música y tendencias." },
];

export const CHARACTERS: Character[] = [
  { id: "luna", name: "Luna", communityId: "gatos", color: "purple", estado: "activo", actividad: 9, bio: "Gata curiosa y nocturna; publica historias sobre adopción y vida callejera.", temperamento: "Juguetona, observadora", temas: ["adopción", "vida callejera", "fotografía"] },
  { id: "milo", name: "Milo", communityId: "gatos", color: "orange", estado: "activo", actividad: 7, bio: "Compañero tranquilo, especialista en rutinas de hogar y alimentación.", temperamento: "Tranquilo, afectuoso", temas: ["hogar", "comida", "descanso"] },
  { id: "sofi", name: "Sofi", communityId: "gatos", color: "pink", estado: "activo", actividad: 8, bio: "Voluntaria del refugio; coordina rescates y difunde casos urgentes.", temperamento: "Empática, organizada", temas: ["veterinaria", "rescate", "adopción"] },
  { id: "bruno", name: "Bruno", communityId: "gatos", color: "green", estado: "activo", actividad: 6, bio: "Gato mayor que cuenta historias del barrio y da consejos a nuevos adoptantes.", temperamento: "Nostálgico, sabio", temas: ["barrio", "memoria", "consejos"] },
  { id: "tom", name: "Tom", communityId: "gatos", color: "cyan", estado: "inactivo", actividad: 3, bio: "Perfil en preparación; aún no tiene Página asociada.", temperamento: "Reservado", temas: ["exploración"] },
  { id: "nexus", name: "Nexus", communityId: "tech", color: "cyan", estado: "activo", actividad: 9, bio: "Analista de modelos open-source y despliegues locales.", temperamento: "Analítico, directo", temas: ["open-source", "LLMs", "hardware"] },
  { id: "ada", name: "Ada", communityId: "tech", color: "purple", estado: "activo", actividad: 8, bio: "Ingeniera de datos; explica arquitecturas con ejemplos concretos.", temperamento: "Didáctica, precisa", temas: ["datos", "arquitectura", "seguridad"] },
  { id: "byte", name: "Byte", communityId: "tech", color: "blue", estado: "activo", actividad: 7, bio: "Entusiasta de herramientas de automatización y agentes.", temperamento: "Curioso, acelerado", temas: ["automatización", "agentes", "productividad"] },
  { id: "rayo", name: "Rayo", communityId: "deportes", color: "yellow", estado: "activo", actividad: 8, bio: "Cronista deportivo con foco en fútbol y análisis de datos.", temperamento: "Apasionado", temas: ["fútbol", "estadísticas", "hinchada"] },
  { id: "mica", name: "Mica", communityId: "deportes", color: "orange", estado: "activo", actividad: 6, bio: "Ex deportista; comparte entrenamientos y vida saludable.", temperamento: "Motivadora", temas: ["entrenamiento", "salud", "rutinas"] },
  { id: "clio", name: "Clio", communityId: "historia", color: "yellow", estado: "activo", actividad: 5, bio: "Divulgadora histórica; contrasta fuentes antes de publicar.", temperamento: "Reflexiva", temas: ["historia", "fuentes", "efemérides"] },
  { id: "zeta", name: "Zeta", communityId: "entretenimiento", color: "pink", estado: "activo", actividad: 7, bio: "Comenta series y música con humor y memes.", temperamento: "Irónica", temas: ["series", "música", "tendencias"] },
];

export const SOCIAL_ACCOUNTS: SocialAccount[] = [
  { id: "page-gatos", platform: "facebook", name: "Comunidad Gatos", page: "fb.com/comunidadgatos", status: "conectado", lastSync: "hace 12 min" },
  { id: "page-tech", platform: "facebook", name: "Tech & IA", page: "fb.com/techia", status: "conectado", lastSync: "hace 34 min" },
  { id: "page-deportes", platform: "facebook", name: "Deportes", page: "fb.com/deportes", status: "desconectado" },
];

export const PROVIDERS: ProviderPreset[] = [
  { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", needsKey: true },
  { id: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini", needsKey: true },
  { id: "groq", name: "Groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile", needsKey: true },
  { id: "nvidia", name: "NVIDIA NIM", baseUrl: "https://integrate.api.nvidia.com/v1", model: "meta/llama-3.1-8b-instruct", needsKey: true },
  { id: "ollama", name: "Ollama local", baseUrl: "http://localhost:11434/v1", model: "llama3.1", needsKey: false },
  { id: "custom", name: "Custom", baseUrl: "", model: "", needsKey: false },
];

export const DEFAULT_SETTINGS: Settings = {
  providers: [
    { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", apiKey: "", enabled: true, status: "unknown" },
    { id: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini", apiKey: "", enabled: false, status: "unknown" },
    { id: "nvidia", name: "NVIDIA NIM", baseUrl: "https://integrate.api.nvidia.com/v1", model: "meta/llama-3.1-8b-instruct", apiKey: "", enabled: false, status: "unknown" },
    { id: "ollama", name: "Ollama local", baseUrl: "http://localhost:11434/v1", model: "llama3.1", apiKey: "", enabled: false, status: "unknown" },
  ],
  activeProviderId: "openai",
  temperature: 0.7,
  maxTokens: 800,
  maxLoops: 3,
  autoVerify: true,
  autoPay: false,
};

export const DEFAULT_RULES: Rule[] = [
  { id: "r-no-autopay", name: "No auto-pay", desc: "Toda transacción que mueva dinero requiere aprobación humana.", active: true, severity: "alta", scope: "global" },
  { id: "r-verify", name: "Verificar antes de publicar", desc: "Ninguna publicación sale sin pasar por el bot de verificación.", active: true, severity: "alta", scope: "global" },
  { id: "r-loops", name: "Máximo 3 loops por bot", desc: "Un bot no puede iterar más de 3 veces sobre la misma unidad.", active: true, severity: "media", scope: "global" },
];

export const INITIAL_MEMORY: MemoryEntry[] = [
  { id: "m1", scope: "individual", owner: "Luna", summary: "Publicó una historia sobre Milo. Sofi comentó y guardó el post.", time: "ayer" },
  { id: "m2", scope: "colectiva", owner: "Comunidad Gatos", summary: "Tema recurrente: adoptabilidad de gatos callejeros en zona norte.", time: "2 días" },
  { id: "m3", scope: "episódica", owner: "Bruno + Sofi", summary: "Conversación sobre veterinaria en zona norte; pidieron turno.", time: "3 días" },
  { id: "m4", scope: "individual", owner: "Nexus", summary: "Interés creciente en modelos open-source y despliegues locales.", time: "hoy" },
  { id: "m5", scope: "semántica", owner: "Mesh", summary: "El bot de research cita fuentes primarias cuando el tema es técnico.", time: "hoy" },
];

export const INITIAL_RUNS: RunRecord[] = [
  { id: "seed-1", prompt: "Prepará mi semana y dejá la bandeja en cero", model: "gpt-4o-mini", status: "complete", units: 15, verified: 14, rejected: 1, startedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(), durationMs: 18400, logs: [] },
  { id: "seed-2", prompt: "Revisá el calendario y proponé contenido para la comunidad", model: "gpt-4o-mini", status: "complete", units: 12, verified: 12, rejected: 0, startedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), durationMs: 12100, logs: [] },
  { id: "seed-3", prompt: "Conciliá los gastos de la semana", model: "gpt-4o-mini", status: "error", units: 6, verified: 4, rejected: 2, startedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), durationMs: 8600, logs: [] },
];

export function initialLogs(): LogEntry[] {
  const now = Date.now();
  const stamp = (offset: number) =>
    new Date(now - offset).toLocaleTimeString("es-AR", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  return [
    { id: "l1", time: stamp(240000), source: "pulse", message: `mesh online · ${ALL_BOTS.length} bots · ${CHARACTERS.length} personajes`, color: "green" },
    { id: "l2", time: stamp(150000), source: "router", message: "3 reglas activas · verificación habilitada", color: "yellow" },
    { id: "l3", time: stamp(60000), source: "check", message: "pass conditions cargadas · auto-pay off", color: "purple" },
    { id: "l4", time: stamp(10000), source: "output", message: "esperando instrucciones del operador", color: "cyan" },
  ];
}
