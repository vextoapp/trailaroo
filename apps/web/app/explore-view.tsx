"use client";
import { HOME_AREA, t } from "@trailaroo/core";
import Link from "next/link";
import { type ReactNode, useDeferredValue, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { LazyMap } from "@/components/lazy-map";
import { PreviewBanner } from "@/components/preview-banner";

export type TrailCard = { slug: string; name: string; length: string; away: string; place: string | undefined; thumb: ReactNode };
type View = "list" | "map";

export function ExploreView({ cards }: { cards: TrailCard[] }) {
  const [view, setView] = useState<View>("list");
  const [q, setQ] = useState("");
  // On wide screens list and map sit side by side; on phones the map only loads when asked for.
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(min-width: 1024px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const query = useDeferredValue(q.trim().toLowerCase());
  const shown = query ? cards.filter((c) => c.name.toLowerCase().includes(query)) : cards;
  const count = shown.length === 1 ? t("explore.countOne") : t("explore.count", { count: shown.length });
  const [creditBefore, creditAfter] = t("credit.osm").split("{osm}");

  return (
    <main id="main" className="app-main" data-view={view}>
      <div className="explore-top">
        <h1 className="visually-hidden">{t("explore.title")}</h1>
        <PreviewBanner />
        <div className="where"><p>{t("explore.where", { area: HOME_AREA.name })}</p></div>
        <label className="search">
          <Icon id="i-search" />
          <span className="visually-hidden">{t("explore.search")}</span>
          <input type="search" name="q" autoComplete="off" placeholder={t("explore.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      <div className="split">
        <section className="results" aria-labelledby="count">
          <div className="results-head"><h2 id="count" aria-live="polite">{count}</h2></div>
          {shown.length === 0 && query ? (
            <p>{t("explore.none", { q })}</p>
          ) : (
            <div className="card-grid">
              {shown.map((c) => (
                <article key={c.slug} className="card trail-card">
                  <div className="thumb">{c.thumb}</div>
                  <div className="body">
                    <p className="title"><Link href={`/trails/${c.slug}`}>{c.name}</Link></p>
                    <p className="meta">{c.place ? `${c.place}, ${c.away}` : c.away}</p>
                    <p className="facts"><span className="family" data-family="foot"><svg aria-hidden="true"><use href="/icons.svg#f-foot" /></svg></span><span>{c.length}</span></p>
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="meta" style={{ marginTop: "var(--space-3)" }}>
            {creditBefore}<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>{creditAfter}
          </p>
        </section>

        <div className="map explore-map">
          {(wide || view === "map") && <LazyMap mode="all" label={t("explore.mapLabel", { count, area: HOME_AREA.name })} />}
        </div>
      </div>

      {/* biome-ignore lint/a11y/useSemanticElements: same pattern as the mock-ups; a fieldset would need a visible legend */}
      <div className="segmented view-switch" role="group" aria-label={t("explore.view")}>
        <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}><Icon id="i-list" small />{t("explore.list")}</button>
        <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}><Icon id="i-map" small />{t("explore.map")}</button>
      </div>
    </main>
  );
}
