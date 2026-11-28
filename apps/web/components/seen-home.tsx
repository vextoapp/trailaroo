"use client";
import { SEEN_HOME_KEY } from "@trailaroo/core";
import { useEffect } from "react";

/** Remembers that this visitor has found their way around (home or Explore), so trail pages stop showing "New here?". */
export function SeenHome() {
  useEffect(() => {
    document.documentElement.dataset.seenHome = ""; // hides the strip on in-app navigation too, not only on the next load
    try { localStorage.setItem(SEEN_HOME_KEY, "1"); } catch { /* private mode: hidden for this visit only */ }
  }, []);
  return null;
}
