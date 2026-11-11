import type { Color, MemoryScope } from "./types";

export const glow: Record<Color, string> = {
  cyan: "glow-cyan",
  pink: "glow-pink",
  purple: "glow-purple",
  green: "glow-green",
  orange: "glow-orange",
  yellow: "glow-yellow",
  blue: "glow-blue",
  red: "glow-red",
};

export const text: Record<Color, string> = {
  cyan: "text-neon-cyan",
  pink: "text-neon-pink",
  purple: "text-neon-purple",
  green: "text-neon-green",
  orange: "text-neon-orange",
  yellow: "text-neon-yellow",
  blue: "text-neon-blue",
  red: "text-neon-red",
};

export const dot: Record<Color, string> = {
  cyan: "bg-neon-cyan",
  pink: "bg-neon-pink",
  purple: "bg-neon-purple",
  green: "bg-neon-green",
  orange: "bg-neon-orange",
  yellow: "bg-neon-yellow",
  blue: "bg-neon-blue",
  red: "bg-neon-red",
};

export const bgSoft: Record<Color, string> = {
  cyan: "bg-neon-cyan/15",
  pink: "bg-neon-pink/15",
  purple: "bg-neon-purple/15",
  green: "bg-neon-green/15",
  orange: "bg-neon-orange/15",
  yellow: "bg-neon-yellow/15",
  blue: "bg-neon-blue/15",
  red: "bg-neon-red/15",
};

export const line: Record<Color, string> = {
  cyan: "#00f0ff",
  pink: "#ff00aa",
  purple: "#b400ff",
  green: "#00ff9d",
  orange: "#ff6b00",
  yellow: "#ffee00",
  blue: "#3b82f6",
  red: "#ff3355",
};

export const scopeColor: Record<MemoryScope, Color> = {
  individual: "cyan",
  colectiva: "purple",
  episódica: "orange",
  semántica: "green",
};

export function timeNow(): string {
  return new Date().toLocaleTimeString("es-AR", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const PALETTE: Color[] = [
  "cyan",
  "pink",
  "purple",
  "green",
  "orange",
  "yellow",
  "blue",
  "red",
];

/** Color estable por nombre (para que cada personaje tenga el suyo). */
export function colorForName(name: string): Color {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}
