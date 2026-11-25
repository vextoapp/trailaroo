"use client";
import { useEffect } from "react";

export const SEEN_HOME_KEY = "seen-home";

/** Remembers that this visitor has found their way around (home or Explore), so trail pages stop showing "New here?". */
export function SeenHome() {
  useEffect(() => {
    try { localStorage.setItem(SEEN_HOME_KEY, "1"); } catch { /* private mode: the strip just keeps showing */ }
  }, []);
  return null;
}
