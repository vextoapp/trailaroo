"use client";
import { t } from "@trailaroo/core";
import { useEffect, useState } from "react";
import { Icon } from "./icon";

type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark"), []);

  const next: Theme = theme === "light" ? "dark" : "light";
  const flip = () => {
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("trailaroo-theme", next); } catch { /* private mode: not remembered */ }
    setTheme(next);
    window.dispatchEvent(new CustomEvent("themechange", { detail: next }));
  };

  return (
    <button type="button" className="btn btn-quiet btn-icon" onClick={flip} aria-label={t("theme.toggle", { mode: t(`theme.${next}`) })}>
      <Icon id="i-theme" />
    </button>
  );
}
