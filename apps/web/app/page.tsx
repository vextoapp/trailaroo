import { APP_NAME, distanceM, formatDistance, HOME_AREA, t } from "@trailaroo/core";
import { trails } from "@trailaroo/core/trails";
import type { Metadata } from "next";
import Link from "next/link";
import { HOME_PHOTOS } from "@/components/home-photos";
import { Icon } from "@/components/icon";
import { PhotoCredit } from "@/components/photo-credit";
import { SeenHome } from "@/components/seen-home";
import { ThemeToggle } from "@/components/theme-toggle";
import { TrailCard } from "@/components/trail-card";

export const metadata: Metadata = { title: { absolute: `${APP_NAME}: ${t("home.titleTag")}` } };

const MOODS = [
  { key: "short", photo: HOME_PHOTOS.short, label: "home.moodShort" },
  { key: "mid", photo: HOME_PHOTOS.morning, label: "home.moodMid" },
  { key: "long", photo: HOME_PHOTOS.long, label: "home.moodLong" },
  { key: "", photo: HOME_PHOTOS.all, label: "home.moodAll" },
] as const;

export default function Home() {
  const home: [number, number] = [HOME_AREA.lon, HOME_AREA.lat];
  const near = trails.slice(0, 8);
  const [osmCreditBefore, osmCreditAfter] = t("credit.osm").split("{osm}");
  return (
    <>
      <a className="skip" href="#main">{t("skip")}</a>
      <SeenHome />
      <main id="main">
        <div className="home-hero">
          {/* biome-ignore lint/performance/noImgElement: photos are pre-sized static files; no image optimiser on the server keeps it small and cheap */}
          <img src={HOME_PHOTOS.hero.src} alt={HOME_PHOTOS.hero.alt} width={1000} height={667} fetchPriority="high" />
          <div className="hero-bar">
            <Link className="brand" href="/"><svg className="brand-mark" aria-hidden="true"><use href="/icons.svg#i-mark" /></svg><span translate="no">{APP_NAME}</span></Link>
            <span style={{ display: "flex", gap: "var(--space-2)" }}><Link className="glass" href="/explore">{t("home.explore")}</Link><span className="glass-toggle"><ThemeToggle /></span></span>
          </div>
          <div className="hero-body">
            <h1>{t("home.headline")}</h1>
            <p className="lede">{t("home.lede", { area: HOME_AREA.name })}</p>
            <form className="searchpill" action="/explore">
              <Icon id="i-search" />
              <label className="visually-hidden" htmlFor="hq">{t("home.searchLabel")}</label>
              <input id="hq" name="q" type="search" placeholder={t("home.searchPlaceholder")} autoComplete="off" />
              <button className="btn btn-primary" type="submit">{t("home.searchButton")}</button>
            </form>
          </div>
          <p className="hero-credit"><PhotoCredit photo={HOME_PHOTOS.hero} className="" /></p>
        </div>

        <div className="page">
          <section className="block" aria-labelledby="near-h">
            <div className="block-head"><h2 id="near-h">{t("home.near", { area: HOME_AREA.name })}</h2><Link href="/explore">{t("home.seeAll", { count: trails.length })}</Link></div>
            <div className="rail">
              {near.map((trail) => (
                <TrailCard key={trail.slug} trail={trail} meta={`${t("explore.away", { distance: formatDistance(distanceM(home, trail.start)) })} · ${formatDistance(trail.lengthM)}`} />
              ))}
            </div>
          </section>

          <section className="block" aria-labelledby="mood-h">
            <div className="block-head"><h2 id="mood-h">{t("home.moods")}</h2></div>
            <div className="moods">
              {MOODS.map((m) => (
                <Link key={m.label} className="mood" href={m.key ? `/explore?len=${m.key}` : "/explore"}>
                  {/* biome-ignore lint/performance/noImgElement: photos are pre-sized static files; no image optimiser on the server keeps it small and cheap */}
                  <img src={m.photo.src} alt="" width={1000} height={667} loading="lazy" />
                  <span>{t(m.label)}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="promise" aria-label={t("home.why")}>
            <article><span className="badge"><Icon id="i-check" /></span><h3>{t("home.freeTitle")}</h3><p className="meta">{t("home.freeBody")}</p></article>
            <article><span className="badge"><Icon id="i-download" /></span><h3>{t("home.offlineTitle")}</h3><p className="meta">{t("home.offlineBody")}</p></article>
            <article><span className="badge"><Icon id="i-users" /></span><h3>{t("home.openTitle")}</h3><p className="meta">{t("home.openBody")}</p></article>
          </section>

          <footer className="credit" style={{ paddingBottom: "var(--space-7)" }}>
            <p>{t("home.previewNote")}</p>
            <p style={{ marginTop: "var(--space-2)" }}>
              {osmCreditBefore}<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>{osmCreditAfter}. {t("home.photosFrom")}{" "}
              {MOODS.map(({ photo }, i) => (
                <span key={photo.src}>{i ? "; " : ""}<PhotoCredit photo={photo} className="" /></span>
              ))}
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
