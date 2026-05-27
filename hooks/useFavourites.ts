"use client";

import { useState, useEffect, useCallback } from "react";

// ─── SHAPE ────────────────────────────────────────────────────────────────────
export interface FavouriteSession {
  id: string;
  title: string;
  day: string;
  time: string;
  sessionType: string;
  typeColor: string;
  typeLabel: string;
  initial: string;
  neighbourhood: string;
  hostName: string;
  priceLabel: string;
}

const KEY = "stretchy_favourites";

// ─── HOOK ─────────────────────────────────────────────────────────────────────
export function useFavourites() {
  const [favourites, setFavourites] = useState<FavouriteSession[]>([]);

  // Load from localStorage once on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setFavourites(JSON.parse(stored));
    } catch { /* storage unavailable */ }
  }, []);

  const toggle = useCallback((session: FavouriteSession) => {
    setFavourites((prev) => {
      const exists = prev.some((s) => s.id === session.id);
      const next = exists
        ? prev.filter((s) => s.id !== session.id)
        : [...prev, session];
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const isFaved = useCallback(
    (id: string) => favourites.some((s) => s.id === id),
    [favourites]
  );

  return { favourites, toggle, isFaved };
}
