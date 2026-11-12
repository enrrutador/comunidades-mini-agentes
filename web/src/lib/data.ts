import type { Bot, ProviderPreset } from "./types";

/**
 * Definiciones ESTRUCTURALES del sistema (catálogo de módulos y bots).
 * No son datos de la aplicación: los personajes, la memoria, las corridas,
 * los proveedores y las cuentas viven en el backend y se cargan por API.
 * Acá no va ningún contenido de ejemplo presentado como datos reales.
 */

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

/**
 * Presets de endpoints conocidos para dar de alta un proveedor en el
 * backend desde la sección Proveedores. Solo son URLs públicas de
 * referencia: el proveedor real se crea y se guarda en el backend.
 */
export const PROVIDERS: ProviderPreset[] = [
  { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", needsKey: true },
  { id: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini", needsKey: true },
  { id: "groq", name: "Groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile", needsKey: true },
  { id: "nvidia", name: "NVIDIA NIM", baseUrl: "https://integrate.api.nvidia.com/v1", model: "deepseek-ai/deepseek-v4.1-flash", needsKey: true },
  { id: "ollama", name: "Ollama local", baseUrl: "http://localhost:11434/v1", model: "llama3.1", needsKey: false },
  { id: "custom", name: "Custom", baseUrl: "", model: "", needsKey: false },
];
