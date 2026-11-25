"use client";
import { APP_NAME, t } from "@trailaroo/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  const path = usePathname();
  return (
    <header className="app-header">
      <Link href="/" className="brand">
        <svg className="brand-mark" aria-hidden="true"><use href="/icons.svg#i-mark" /></svg>
        <span translate="no">{APP_NAME}</span>
      </Link>
      <nav aria-label={t("nav.main")}>
        <Link href="/explore" aria-current={path.startsWith("/explore") ? "page" : undefined}>{t("nav.explore")}</Link>
        <Link href="/">{t("nav.about")}</Link>
      </nav>
      <ThemeToggle />
    </header>
  );
}
