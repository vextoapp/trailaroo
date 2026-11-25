import { APP_NAME } from "@trailaroo/core";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="app-header">
      <Link href="/" className="brand">
        <svg className="brand-mark" aria-hidden="true"><use href="/icons.svg#i-mark" /></svg>
        <span translate="no">{APP_NAME}</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}
