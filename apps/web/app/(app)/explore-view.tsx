"use client";
import { ACTIVE_REGION, type Difficulty, type Family, HOME_AREA, t } from "@trailaroo/core";
import Link from "next/link";
import { type ReactNode, useDeferredValue, useEffect, useState } from "react";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Icon } from "@/components/icon";
import { LazyMap } from "@/components/lazy-map";
import { PreviewBanner } from "@/components/preview-banner";

export type ExploreCard = {
  slug: string; name: string; lengthM: number; gainM: number; awayM: number; family: Family;
  difficulty: Difficulty | undefined; facts: string; meta: string; cover: ReactNode;
};
type View = "list" | "map";
type Len = "" | "short" | "mid" | "long";
type Climb = "" | "low" | "mid" | "high";
type Fam = "" | Family;
type Diff = "" | Difficulty;
type Sort = "closest" | "shortest" | "longest" | "flattest" | "steepest";
const DIFFS: Difficulty[] = ["easy", "moderate", "hard", "veryhard"];
const SORTS: { key: Sort; label: Parameters<typeof t>[0]; by: (a: ExploreCard, b: ExploreCard) => number }[] = [
  { key: "closest", label: "sort.closest", by: (a, b) => a.awayM - b.awayM },
  { key: "shortest", label: "sort.shortest", by: (a, b) => a.lengthM - b.lengthM },
  { key: "longest", label: "sort.longest", by: (a, b) => b.lengthM - a.lengthM },
  { key: "flattest", label: "sort.flattest", by: (a, b) => a.gainM - b.gainM },
  { key: "steepest", label: "sort.steepest", by: (a, b) => (b.gainM === Number.POSITIVE_INFINITY ? -1 : a.gainM === Number.POSITIVE_INFINITY ? 1 : b.gainM - a.gainM) },
];
const PAGE = 24;

const FAMILIES: { key: Fam; label: Parameters<typeof t>[0]; icon: string }[] = [
  { key: "", label: "explore.all", icon: "i-explore" },
  { key: "foot", label: "explore.walks", icon: "f-foot" },
  { key: "bike", label: "explore.bikes", icon: "f-bike" },
];

const BANDS: { key: Len; label: Parameters<typeof t>[0]; test: (m: number) => boolean }[] = [
  { key: "", label: "explore.anyLength", test: () => true },
  { key: "short", label: "explore.short", test: (m) => m < 5000 },
  { key: "mid", label: "explore.mid", test: (m) => m >= 5000 && m <= 15000 },
  { key: "long", label: "explore.long", test: (m) => m > 15000 },
];
// Most trails here climb little (median about 30 m), so the bands split at 100 and 300 m.
const CLIMBS: { key: Climb; label: Parameters<typeof t>[0]; test: (m: number) => boolean }[] = [
  { key: "", label: "explore.anyClimb", test: () => true },
  { key: "low", label: "explore.climbLow", test: (m) => m < 100 },
  { key: "mid", label: "explore.climbMid", test: (m) => m >= 100 && m <= 300 },
  { key: "high", label: "explore.climbHigh", test: (m) => m > 300 && Number.isFinite(m) }, // no climb data is stored as Infinity
];

export function ExploreView({ cards }: { cards: ExploreCard[] }) {
  const [view, setView] = useState<View>("list");
  const [q, setQ] = useState("");
  const [len, setLen] = useState<Len>("");
  const [climb, setClimb] = useState<Climb>("");
  const [fam, setFam] = useState<Fam>("");
  const [diff, setDiff] = useState<Diff>("");
  const [sort, setSort] = useState<Sort>("closest");
  const [limit, setLimit] = useState(PAGE);
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

  // Search, filters and view live in the URL (?q=…&len=short&climb=high&view=map) so a filtered list can be shared.
  const [urlRead, setUrlRead] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQ(params.get("q") ?? "");
    const l = params.get("len");
    if (l === "short" || l === "mid" || l === "long") setLen(l);
    const c = params.get("climb");
    if (c === "low" || c === "mid" || c === "high") setClimb(c);
    const f = params.get("fam");
    if (f === "foot" || f === "bike") setFam(f);
    const d = params.get("diff");
    if (DIFFS.includes(d as Difficulty)) setDiff(d as Difficulty);
    const so = params.get("sort");
    if (SORTS.some((x) => x.key === so)) setSort(so as Sort);
    if (params.get("view") === "map") setView("map");
    setUrlRead(true);
  }, []);
  useEffect(() => {
    if (!urlRead) return; // don't overwrite a shared link before it has been read
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (len) params.set("len", len);
    if (climb) params.set("climb", climb);
    if (fam) params.set("fam", fam);
    if (diff) params.set("diff", diff);
    if (sort !== "closest") params.set("sort", sort);
    if (view === "map") params.set("view", "map");
    const search = params.toString();
    history.replaceState(null, "", search ? `?${search}` : location.pathname);
  }, [q, len, climb, fam, diff, sort, view, urlRead]);
  // A new search or filter starts again from the first page.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the filters change
  useEffect(() => setLimit(PAGE), [query, len, climb, fam, diff, sort]);

  const band = BANDS.find((b) => b.key === len) ?? BANDS[0];
  const climbBand = CLIMBS.find((b) => b.key === climb) ?? CLIMBS[0];
  const sorter = (SORTS.find((x) => x.key === sort) ?? SORTS[0])?.by;
  const shown = cards
    .filter((c) => (!fam || c.family === fam) && (!diff || c.difficulty === diff) && band?.test(c.lengthM) && climbBand?.test(c.gainM) && (!query || c.name.toLowerCase().includes(query)))
    .sort(sorter);
  const count = shown.length === 1 ? t("explore.countOne") : t("explore.count", { count: shown.length });
  const [osmCreditBefore, osmCreditAfter] = t("credit.osm").split("{osm}");
  const [capadBefore, capadAfter] = t("credit.capad").split("{capad}");

  return (
    <main id="main" className="page explore" data-view={view}>
      <h1 className="visually-hidden">{t("explore.title")}</h1>
      <div className="ex-top">
        <form className="finder" onSubmit={(e) => e.preventDefault()}>
          <label>
            <b>{t("explore.where", { area: ACTIVE_REGION.name })}</b>
            <input type="search" name="q" autoComplete="off" placeholder={t("explore.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <button className="go" type="submit" aria-label={t("explore.search")}><Icon id="i-search" /></button>
        </form>
        {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would need a visible legend; the chips are labelled */}
        <div className="cats" role="group" aria-label={t("explore.activity")}>
          {FAMILIES.map((f) => (
            <button key={f.key || "all"} type="button" aria-pressed={fam === f.key} onClick={() => setFam(f.key)}>
              <Icon id={f.icon} />{t(f.label)}
            </button>
          ))}
        </div>
        <div className="filter-rows">
          {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would need a visible legend; the chips are labelled */}
          <div className="chips" role="group" aria-label={t("explore.length")}>
            {BANDS.map((b) => (
              <button key={b.key || "any"} type="button" className="chip" aria-pressed={len === b.key} onClick={() => setLen(b.key)}>{t(b.label)}</button>
            ))}
          </div>
          {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would need a visible legend; the chips are labelled */}
          <div className="chips" role="group" aria-label={t("explore.climbFilter")}>
            {CLIMBS.map((b) => (
              <button key={b.key || "any"} type="button" className="chip" aria-pressed={climb === b.key} onClick={() => setClimb(b.key)}>{t(b.label)}</button>
            ))}
          </div>
          {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would need a visible legend; the chips are labelled */}
          <div className="chips" role="group" aria-label={t("explore.difficulty")}>
            <button type="button" className="chip" aria-pressed={diff === ""} onClick={() => setDiff("")}>{t("explore.anyDifficulty")}</button>
            {DIFFS.map((d) => (
              <button key={d} type="button" className="chip" aria-pressed={diff === d} onClick={() => setDiff(d)}><DifficultyBadge level={d} /></button>
            ))}
          </div>
        </div>
      </div>

      <div className="ex-split">
        <section className="results" aria-labelledby="count">
          <PreviewBanner />
          <div className="results-bar">
            <h2 id="count" className="ex-count num" aria-live="polite">{count}</h2>
            <label className="sort">{t("sort.label")}
              <select name="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                {SORTS.map((x) => <option key={x.key} value={x.key}>{t(x.label)}</option>)}
              </select>
            </label>
          </div>
          {shown.length === 0 && query ? (
            <p>{t("explore.none", { q })}</p>
          ) : (
            <div className="cards">
              {shown.slice(0, limit).map((c) => (
                <article key={c.slug} className="pcard">
                  {c.cover}
                  <div>
                    <h3><Link className="title-link" href={`/trails/${c.slug}`}>{c.name}</Link></h3>
                    <p className="facts num">{c.difficulty && <DifficultyBadge level={c.difficulty} />}<span>{c.facts}</span></p>
                    <p className="meta num">{c.meta}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
          {shown.length > limit && (
            <p className="ex-more">
              <button type="button" className="btn" onClick={() => setLimit((n) => n + PAGE)}>
                {t("explore.showMore", { count: Math.min(PAGE, shown.length - limit) })}
              </button>
            </p>
          )}
          <p className="credit" style={{ marginTop: "var(--space-5)" }}>
            {osmCreditBefore}<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>{osmCreditAfter}
          </p>
          <p className="credit">
            {capadBefore}<a href="https://www.dcceew.gov.au/environment/land/nrs/science/capad">CAPAD 2024</a>{capadAfter}
          </p>
          <p className="credit">{t("credit.photos")}</p>
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
