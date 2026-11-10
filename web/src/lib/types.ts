export type Color =
  | "cyan"
  | "pink"
  | "purple"
  | "green"
  | "orange"
  | "yellow"
  | "blue"
  | "red";

export type Tab = "Global" | "Bots" | "Runs" | "Rules" | "Memory" | "Comunidad";

export type RunStatus = "idle" | "running" | "complete" | "error";
export type UnitStatus = "running" | "verified" | "rejected";
export type EntityKind = "module" | "workflow";

export interface Bot {
  id: string;
  name: string;
  tag: string;
  color: Color;
  kind: EntityKind;
  tools: string;
  desc: string;
  instructions: string;
  model: string;
  maxLoops: number;
  autoVerify: boolean;
  enabled: boolean;
  connected: boolean;
}

export interface Character {
  id: string;
  name: string;
  communityId: string;
  color: Color;
  estado: "activo" | "inactivo" | "en_preparacion";
  actividad: number;
  bio: string;
  temperamento: string;
  temas: string[];
}

export interface SocialAccount {
  id: string;
  platform: "facebook";
  name: string;
  page: string;
  status: "conectado" | "desconectado";
  lastSync?: string;
}

export interface Unit {
  id: string;
  botId: string;
  label: string;
  status: UnitStatus;
}

export interface RunState {
  status: RunStatus;
  units: Unit[];
  prompt: string;
  expected: number;
}

export interface LogEntry {
  id: string;
  time: string;
  source: string;
  message: string;
  color?: Color;
}

export interface RunRecord {
  id: string;
  prompt: string;
  model: string;
  status: "complete" | "error";
  units: number;
  verified: number;
  rejected: number;
  startedAt: string;
  durationMs: number;
  logs: LogEntry[];
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
  status: "unknown" | "ok" | "error";
  lastTest?: string;
}

export interface Settings {
  providers: ProviderConfig[];
  activeProviderId: string;
  temperature: number;
  maxTokens: number;
  maxLoops: number;
  autoVerify: boolean;
  autoPay: boolean;
}

export interface Rule {
  id: string;
  name: string;
  desc: string;
  active: boolean;
  severity: "alta" | "media" | "baja";
  scope: "global" | "comunidad";
}

export type MemoryScope = "individual" | "colectiva" | "episódica" | "semántica";

export interface MemoryEntry {
  id: string;
  scope: MemoryScope;
  owner: string;
  summary: string;
  time: string;
}

export interface Community {
  id: string;
  name: string;
  color: Color;
  agents: number;
  tematica?: string;
  descripcion?: string;
}

export interface ProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  needsKey: boolean;
}
