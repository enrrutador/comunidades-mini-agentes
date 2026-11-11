"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import type { Color } from "@/lib/types";
import { dot, text } from "@/lib/theme";

export function Chip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border border-white/5 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-slate-500 ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusDot({
  color = "green",
  pulse = false,
  className = "",
}: {
  color?: Color;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${dot[color]} ${
        pulse ? "animate-pulse" : ""
      } ${className}`}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  compact = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 items-center rounded-full border transition ${
        compact ? "h-3.5 w-6 px-0.5" : "h-5 w-9 px-0.5"
      } ${
        checked
          ? "border-neon-cyan/50 bg-neon-cyan/20"
          : "border-white/10 bg-white/5"
      }`}
    >
      <span
        className={`inline-block rounded-full transition ${
          compact ? "h-2 w-2" : "h-3.5 w-3.5"
        } ${
          checked
            ? `${compact ? "translate-x-2" : "translate-x-4"} bg-neon-cyan shadow-[0_0_8px_#00f0ff]`
            : "translate-x-0.5 bg-slate-500"
        }`}
      />
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
        {label}
        {hint ? <span className="normal-case tracking-normal text-slate-600">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        className={`animate-sheet relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-[#23233a] bg-[#08080f] shadow-[0_0_60px_rgba(0,240,255,0.08)] sm:rounded-xl ${
          size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#1a1a2e] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#1a1a2e] px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Stat({
  value,
  label,
  color = "green",
  pulse = false,
}: {
  value: string | number;
  label: string;
  color?: Color;
  pulse?: boolean;
}) {
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1.5 font-mono">
      <span className={`text-xs font-semibold ${text[color]}`}>{value}</span>
      <span className="text-[9px] uppercase tracking-wider text-slate-500 sm:text-[10px]">
        {label}
      </span>
    </span>
  );
}
