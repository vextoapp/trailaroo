"use client";

import { useEffect } from "react";

/** On the offline page only: once the connection is really back, reload to show the page that was asked for. */
export function ReloadWhenOnline() {
  useEffect(() => {
    const reload = () => {
      if (navigator.onLine) location.reload();
    };
    window.addEventListener("online", reload);
    return () => window.removeEventListener("online", reload);
  }, []);
  return null;
}
