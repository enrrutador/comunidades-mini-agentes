"use client";

import { useEffect, useState } from "react";

export function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      // ignorar almacenamiento corrupto o no disponible
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignorar cuota o modo privado
    }
  }, [key, value, hydrated]);

  return [value, setValue, hydrated] as const;
}
