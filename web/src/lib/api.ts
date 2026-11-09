/**
 * Cliente API mínimo para Pulse OS.
 * Apunta al backend FastAPI (por defecto localhost:8000).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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
