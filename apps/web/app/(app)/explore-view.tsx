"use client";
import { HOME_AREA, t } from "@trailaroo/core";
import Link from "next/link";
import { type ReactNode, useDeferredValue, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { LazyMap } from "@/components/lazy-map";
import { PreviewBanner } from "@/components/preview-banner";

export type ExploreCard = { slug: string; name: string; lengthM: number; meta: string; cover: ReactNode };
type View = "list" | "map";
type Len = "" | "short" | "mid" | "long";

// Length bands are the only filters with real data today; difficulty, time and tags arrive in M1.
const BANDS: { key: Len; label: Parameters<typeof t>[0]; icon: string; test: (m: number) => boolean }[] = [
  { key: "", label: "explore.all", icon: "i-explore", test: () => true },
  { key: "short", label: "explore.short", icon: "i-walk", test: (m) => m < 5000 },
  { key: "mid", label: "explore.mid", icon: "i-sun", test: (m) => m >= 5000 && m <= 15000 },
  { key: "long", label: "explore.long", icon: "i-up", test: (m) => m > 15000 },
];

export function ExploreView({ cards }: { cards: ExploreCard[] }) {
  const [view, setView] = useState<View>("list");
  const [q, setQ] = useState("");
  const [len, setLen] = useState<Len>("");
  // On wide screens list and map sit side by side; on phones the map only loads when asked for.
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(min-width: 1100px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const query = useDeferredValue(q.trim().toLowerCase());

  // Search, length and view live in the URL (?q=…&len=short&view=map) so a filtered list can be shared.
  const [urlRead, setUrlRead] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQ(params.get("q") ?? "");
    const l = params.get("len");
    if (l === "short" || l === "mid" || l === "long") setLen(l);
    if (params.get("view") === "map") setView("map");
    setUrlRead(true);
  }, []);
  useEffect(() => {
    if (!urlRead) return; // don't overwrite a shared link before it has been read
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (len) params.set("len", len);
    if (view === "map") params.set("view", "map");
    const search = params.toString();
    history.replaceState(null, "", search ? `?${search}` : location.pathname);
  }, [q, len, view, urlRead]);

  const band = BANDS.find((b) => b.key === len) ?? BANDS[0];
  const shown = cards.filter((c) => band?.test(c.lengthM) && (!query || c.name.toLowerCase().includes(query)));
  const count = shown.length === 1 ? t("explore.countOne") : t("explore.count", { count: shown.length });
  const [osmCreditBefore, osmCreditAfter] = t("credit.osm").split("{osm}");

  return (
    <main id="main" className="page explore" data-view={view}>
      <h1 className="visually-hidden">{t("explore.title")}</h1>
      <div className="ex-top">
        <form className="finder" onSubmit={(e) => e.preventDefault()}>
          <label>
            <b>{t("explore.where", { area: HOME_AREA.name })}</b>
            <input type="search" name="q" autoComplete="off" placeholder={t("explore.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <button className="go" type="submit" aria-label={t("explore.search")}><Icon id="i-search" /></button>
        </form>
        {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would need a visible legend; the chips are labelled */}
        <div className="cats" role="group" aria-label={t("explore.length")}>
          {BANDS.map((b) => (
            <button key={b.key || "all"} type="button" aria-pressed={len === b.key} onClick={() => setLen(b.key)}>
              <Icon id={b.icon} />{t(b.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="ex-split">
        <section className="results" aria-labelledby="count">
          <PreviewBanner />
          <h2 id="count" className="ex-count num" aria-live="polite">{count}</h2>
          {shown.length === 0 && query ? (
            <p>{t("explore.none", { q })}</p>
          ) : (
            <div className="cards">
              {shown.map((c) => (
                <article key={c.slug} className="pcard">
                  <div className="cover drawn">{c.cover}</div>
                  <div>
                    <h3><Link className="title-link" href={`/trails/${c.slug}`}>{c.name}</Link></h3>
                    <p className="meta num">{c.meta}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="credit" style={{ marginTop: "var(--space-5)" }}>
            {osmCreditBefore}<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>{osmCreditAfter}
          </p>
        </section>
        <div className="map ex-map">
          {(wide || view === "map") && <LazyMap mode="all" label={t("explore.mapLabel", { count, area: HOME_AREA.name })} />}
        </div>
      </div>

      {/* biome-ignore lint/a11y/useSemanticElements: same pattern as the mock-ups; a fieldset would need a visible legend */}
      <div className="segmented float-switch" role="group" aria-label={t("explore.view")}>
        <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}><Icon id="i-list" small />{t("explore.list")}</button>
        <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}><Icon id="i-map" small />{t("explore.map")}</button>
      </div>
    </main>
  );
}
