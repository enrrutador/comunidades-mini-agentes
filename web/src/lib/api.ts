/**
 * Cliente API para Pulse OS.
 * Apunta al backend FastAPI (por defecto localhost:8000).
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "/backend/api" : "http://127.0.0.1:8000/api");

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pulse.auth.token");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---------------------------------------------------------------------------
// Comunidades
// ---------------------------------------------------------------------------

export interface Comunidad {
  id: string;
  nombre: string;
  tematica?: string | null;
  descripcion_interna?: string | null;
  created_at: string;
  updated_at: string;
}

export function listComunidades() {
  return request<Comunidad[]>("/comunidades");
}

export function createComunidad(data: { nombre: string; tematica?: string; descripcion_interna?: string }) {
  return request<Comunidad>("/comunidades", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getComunidad(id: string) {
  return request<Comunidad>(`/comunidades/${id}`);
}

export function updateComunidad(id: string, data: { nombre?: string; tematica?: string; descripcion_interna?: string }) {
  return request<Comunidad>(`/comunidades/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteComunidad(id: string) {
  return request<void>(`/comunidades/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Personajes
// ---------------------------------------------------------------------------

export interface Personaje {
  id: string;
  nombre: string;
  apellido?: string | null;
  comunidad_id: string;
  pagina_id?: string | null;
  biografia_interna?: string | null;
  estilo_linguistico?: string | null;
  avatar_url?: string | null;
  personalidad?: Record<string, unknown> | null;
  estado: string;
  nivel_actividad: number;
  created_at: string;
  updated_at: string;
}

export function listPersonajes(comunidadId?: string) {
  const q = comunidadId ? `?comunidad_id=${comunidadId}` : "";
  return request<Personaje[]>(`/personajes${q}`);
}

export function createPersonaje(data: {
  nombre: string;
  comunidad_id: string;
  apellido?: string;
  biografia_interna?: string;
  personalidad?: Record<string, unknown>;
  nivel_actividad?: number;
}) {
  return request<Personaje>("/personajes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getPersonaje(id: string) {
  return request<Personaje>(`/personajes/${id}`);
}

export function updatePersonaje(id: string, data: Partial<Personaje>) {
  return request<Personaje>(`/personajes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deletePersonaje(id: string) {
  return request<void>(`/personajes/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Proveedores LLM
// ---------------------------------------------------------------------------

export interface ProveedorLLM {
  id: string;
  nombre: string;
  tipo_api: string;
  base_url?: string | null;
  activo: boolean;
  prioridad: number;
  created_at: string;
  updated_at: string;
}

export interface ModeloLLM {
  id: string;
  nombre: string;
  identificador_tecnico: string;
  proveedor_id: string;
  contexto_maximo?: number | null;
  capacidades?: string[] | null;
  disponible: boolean;
  costo_input?: number | null;
  costo_output?: number | null;
  prioridad: number;
  ultima_comprobacion?: string | null;
  created_at: string;
  updated_at: string;
}

export function listProveedores() {
  return request<ProveedorLLM[]>("/llm/proveedores");
}

export function createProveedor(data: {
  nombre: string;
  tipo_api?: string;
  base_url?: string;
  activo?: boolean;
  prioridad?: number;
}) {
  return request<ProveedorLLM>("/llm/proveedores", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateProveedor(id: string, data: Partial<ProveedorLLM>) {
  return request<ProveedorLLM>(`/llm/proveedores/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteProveedor(id: string) {
  return request<void>(`/llm/proveedores/${id}`, { method: "DELETE" });
}

export function listModelos(proveedorId?: string) {
  const q = proveedorId ? `?proveedor_id=${proveedorId}` : "";
  return request<ModeloLLM[]>(`/llm/modelos${q}`);
}

export function createModelo(data: {
  nombre: string;
  identificador_tecnico: string;
  proveedor_id: string;
  contexto_maximo?: number;
  capacidades?: string[];
  disponible?: boolean;
  costo_input?: number;
  costo_output?: number;
  prioridad?: number;
}) {
  return request<ModeloLLM>("/llm/modelos", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function testProveedor(proveedorId: string) {
  return request<{ ok: boolean; modelos_disponibles: string[]; error?: string }>(
    "/llm/test",
    {
      method: "POST",
      body: JSON.stringify({ proveedor_id: proveedorId }),
    },
  );
}

export interface LLMChatResponse {
  content: string;
  role: string;
  model_used?: string | null;
  provider_used?: string | null;
  usage?: Record<string, unknown> | null;
  finish_reason?: string | null;
}

export function chatLLM(data: {
  messages: { role: string; content: string }[];
  modelo_id?: string;
  proveedor_id?: string;
  temperature?: number;
  max_tokens?: number;
  tools?: unknown[];
}) {
  return request<LLMChatResponse>("/llm/chat", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
// Facebook
// ---------------------------------------------------------------------------

export interface CuentaFB {
  id: string;
  nombre_identificador: string;
  plataforma: string;
  estado_conexion: string;
  metodo_autenticacion?: string | null;
  estado_autorizacion?: string | null;
  ultima_conexion?: string | null;
}

export interface PaginaFB {
  id: string;
  id_plataforma: string;
  nombre_publico: string;
  url?: string | null;
  avatar_url?: string | null;
  estado_conexion: string;
  capacidades?: Record<string, unknown> | null;
  personaje_id?: string | null;
}

export function listCuentasFB() {
  return request<CuentaFB[]>("/facebook/cuentas");
}

export function createCuentaFB(data: {
  nombre_identificador: string;
  email_o_usuario: string;
  password: string;
  totp_secret?: string;
}) {
  return request<CuentaFB>("/facebook/cuentas", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteCuentaFB(id: string) {
  return request<void>(`/facebook/cuentas/${id}`, { method: "DELETE" });
}

export function loginCuentaFB(id: string) {
  return request<{ status: string; message: string; cuenta_id: string }>(
    `/facebook/cuentas/${id}/login`,
    { method: "POST" },
  );
}

export function estadoCuentaFB(id: string) {
  return request<{ cuenta_id: string; estado_conexion: string; estado_autorizacion?: string | null; ultima_conexion?: string | null }>(
    `/facebook/cuentas/${id}/estado`,
  );
}

export function crearPaginaFB(cuentaId: string, nombre: string, categoria?: string) {
  return request<{ status: string; nombre?: string; url?: string; id_plataforma?: string; pagina_id?: string; error?: string }>(
    `/facebook/cuentas/${cuentaId}/crear-pagina`,
    {
      method: "POST",
      body: JSON.stringify({ nombre, categoria: categoria ?? "Comunidad" }),
    },
  );
}

export function detectarPaginasFB(cuentaId: string) {
  return request<PaginaFB[]>(`/facebook/cuentas/${cuentaId}/detectar-paginas`, {
    method: "POST",
  });
}

export function listPaginasFB(cuentaId: string) {
  return request<PaginaFB[]>(`/facebook/cuentas/${cuentaId}/paginas`);
}

export function listAllPaginasFB() {
  return request<PaginaFB[]>("/facebook/paginas");
}

export function asignarPaginaFB(paginaId: string, personajeId: string) {
  return request<{ status: string; pagina_id: string; personaje_id: string }>(
    `/facebook/paginas/${paginaId}/asignar`,
    {
      method: "PATCH",
      body: JSON.stringify({ personaje_id: personajeId }),
    },
  );
}

export function desasignarPaginaFB(paginaId: string) {
  return request<{ status: string; pagina_id: string }>(
    `/facebook/paginas/${paginaId}/desasignar`,
    { method: "PATCH" },
  );
}

export function publicarPostFB(data: { pagina_id: string; mensaje: string; media_url?: string }) {
  return request<{ status: string; message: string; pagina_id: string }>(
    "/facebook/publicar",
    { method: "POST", body: JSON.stringify(data) },
  );
}

export function comentarFB(data: { post_url: string; mensaje: string }) {
  return request<{ status: string; message: string; post_url: string }>(
    "/facebook/comentar",
    { method: "POST", body: JSON.stringify(data) },
  );
}

export function reaccionarFB(data: { object_url: string; tipo: string }) {
  return request<{ status: string; message: string; object_url: string; tipo: string }>(
    "/facebook/reaccionar",
    { method: "POST", body: JSON.stringify(data) },
  );
}

// ---------------------------------------------------------------------------
// Tareas
// ---------------------------------------------------------------------------

export interface Tarea {
  id: string;
  tipo: string;
  prioridad: number;
  estado: string;
  payload?: Record<string, unknown> | null;
  resultado?: Record<string, unknown> | null;
  error?: string | null;
  fecha_programada?: string | null;
  fecha_ejecucion?: string | null;
  idempotency_key?: string | null;
  comunidad_id?: string | null;
  personaje_id?: string | null;
  modelo_usado?: string | null;
  created_at: string;
  updated_at: string;
}

export function listTareas(comunidadId?: string, estado?: string) {
  const params = new URLSearchParams();
  if (comunidadId) params.set("comunidad_id", comunidadId);
  if (estado) params.set("estado", estado);
  const q = params.toString() ? `?${params}` : "";
  return request<Tarea[]>(`/tareas${q}`);
}

// ---------------------------------------------------------------------------
// Memoria
// ---------------------------------------------------------------------------

export interface MemoryEntry {
  id: string;
  scope: string;
  owner: string;
  summary: string;
  metadata_json?: Record<string, unknown> | null;
  comunidad_id?: string | null;
  personaje_id?: string | null;
  created_at: string;
  updated_at: string;
}

export function listMemoria(scope?: string, comunidadId?: string, personajeId?: string) {
  const params = new URLSearchParams();
  if (scope) params.set("scope", scope);
  if (comunidadId) params.set("comunidad_id", comunidadId);
  if (personajeId) params.set("personaje_id", personajeId);
  const q = params.toString() ? `?${params}` : "";
  return request<MemoryEntry[]>(`/memoria${q}`);
}

export function createMemoria(data: {
  scope?: string;
  owner: string;
  summary: string;
  metadata_json?: Record<string, unknown>;
  comunidad_id?: string;
  personaje_id?: string;
}) {
  return request<MemoryEntry>("/memoria", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteMemoria(id: string) {
  return request<void>(`/memoria/${id}`, { method: "DELETE" });
}

export function buscarMemoria(q: string, scope?: string, comunidadId?: string) {
  const params = new URLSearchParams({ q });
  if (scope) params.set("scope", scope);
  if (comunidadId) params.set("comunidad_id", comunidadId);
  return request<MemoryEntry[]>(`/memoria/buscar?${params}`);
}


// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  username: string;
  email?: string | null;
  is_active: boolean;
  is_admin: boolean;
}

export async function loginAdmin(username: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  const data = await res.json();
  localStorage.setItem("pulse.auth.token", data.access_token);
  return data.access_token;
}

export function logoutAdmin() {
  localStorage.removeItem("pulse.auth.token");
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export async function getMe(): Promise<AuthUser> {
  return request<AuthUser>("/auth/me");
}
