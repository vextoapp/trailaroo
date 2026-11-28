import { t } from "@trailaroo/core";
import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { ReloadWhenOnline } from "@/components/reload-when-online";

export const metadata: Metadata = { title: t("offline.title") };

export default function Offline() {
  return (
    <main id="main" className="app-main">
      <ReloadWhenOnline />
      <div className="notice" data-severity="warning" role="status">
        <Icon id="i-cloud-off" />
        <div>
          <h1 style={{ fontSize: "var(--step-1)" }}>{t("offline.title")}</h1>
          <p>{t("offline.body")}</p>
        </div>
        <div className="actions"><Link className="btn" href="/explore">{t("offline.back")}</Link></div>
      </div>
    </main>
  );
}
