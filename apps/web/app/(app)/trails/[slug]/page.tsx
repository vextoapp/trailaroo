import { DEFAULT_LOCALE, formatClimb, formatDistance, formatDuration, HOME_AREA, type Trail, t } from "@trailaroo/core";
import { getTrail, getTrailPhotos, importedAt, trailFacts, trails } from "@trailaroo/core/trails";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { ElevationProfile } from "@/components/elevation-profile";
import { Icon } from "@/components/icon";
import { LazyMap } from "@/components/lazy-map";
import { NewHere } from "@/components/new-here";
import { PhotoCredit } from "@/components/photo-credit";
import { PreviewBanner } from "@/components/preview-banner";
import { asPhoto, TrailCover } from "@/components/trail-cover";
import { OG_SIZE, SITE_URL } from "@/lib/site";

type Params = { params: Promise<{ slug: string }> };

const CAPAD_URL = "https://www.dcceew.gov.au/environment/land/nrs/science/capad";

export const dynamicParams = false;
export const generateStaticParams = () => trails.map((trail) => ({ slug: trail.slug }));

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const trail = getTrail((await params).slug);
  if (!trail) return {};
  const description = metaDescription(trail);
  return {
    title: trail.name,
    description,
    alternates: { canonical: `/trails/${trail.slug}` },
    openGraph: { title: trail.name, description, url: `/trails/${trail.slug}`, images: [{ url: `/trails/${trail.slug}/cover.png`, ...OG_SIZE, alt: t("og.alt") }] },
    twitter: { card: "summary_large_image" },
  };
}

const metaDescription = (trail: Trail) => t("trail.metaDescription", { name: trail.name, length: formatDistance(trail.lengthM), area: HOME_AREA.name });

const dateFmt = new Intl.DateTimeFormat(DEFAULT_LOCALE, { day: "numeric", month: "long", year: "numeric" });

export default async function TrailPage({ params }: Params) {
  const trail = getTrail((await params).slug);
  if (!trail) notFound();
  const [lon, lat] = trail.start;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  const osmUrl = `https://www.openstreetmap.org/relation/${trail.osmId}`;
  const place = trail.park ?? trail.operator ?? trail.network;
  const facts = trailFacts(trail);
  const length = formatDistance(trail.lengthM);
  const firstPhoto = getTrailPhotos(trail.osmId)[0];
  const photo = firstPhoto && asPhoto(firstPhoto);
  const [dataCreditBefore, dataCreditAfter] = t("credit.osmLicence").split("{osm}");
  const [capadBefore, capadAfter] = t("credit.capad").split("{capad}");
  const [elevCreditBefore, elevCreditAfter] = t("credit.elevation").split("{mapterhorn}");
  const [mapCreditBefore, mapCreditAfter] = t("credit.map", { osm: "OpenStreetMap" }).split("{protomaps}");
  const url = `${SITE_URL}/trails/${trail.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: trail.name,
    description: metaDescription(trail),
    url,
    image: `${url}/cover.png`,
    geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lon },
    ...(trail.park && { containedInPlace: { "@type": "Park", name: trail.park } }),
  };

  return (
    <main id="main" className="page trail">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD from our own data, with < escaped
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="trail-top">
        <Link href="/explore" className="btn btn-quiet"><Icon id="i-back" small />{t("trail.back")}</Link>
        <NewHere />
      </div>
      {photo ? (
        <div className="cover trail-cover">
          {/* biome-ignore lint/performance/noImgElement: photos are pre-sized on our CDN; no image optimiser on the server keeps it small and cheap */}
          <img src={photo.src} alt={t("photo.trailAlt", { trail: trail.name })} width={1000} height={667} fetchPriority="high" />
          <PhotoCredit photo={photo} />
        </div>
      ) : (
        <TrailCover trail={trail} className="trail-cover" />
      )}
      <div className="gh-head">
        <h1>{trail.name}</h1>
        <div className="sub">
          {place && <span>{place}</span>}
          <span className="pill-tag num">{length}</span>
          <span>{t(trail.family === "bike" ? "trail.kindBike" : "trail.kindFoot")}</span>
        </div>
      </div>
      <div className="gh-body">
        <div>
          {facts && trail.stats && (
            <div className="stats trail-stats num">
              <div className="stat"><span className="value">{length}</span><span className="label">{t(trail.stats.routeType === "loop" ? "trail.lengthLoop" : "trail.lengthOneWay")}</span></div>
              <div className="stat"><span className="value">{formatClimb(trail.stats.gainM)}</span><span className="label">{t("trail.climb")}</span></div>
              <div className="stat"><span className="value">{formatDuration(facts.timeS)}</span><span className="label">{t(trail.stats.routeType === "loop" ? "trail.time" : "trail.timeOneWay")}</span></div>
              <div className="stat"><span className="value"><DifficultyBadge level={facts.difficulty} /></span><span className="label">{t("trail.difficulty")}</span></div>
            </div>
          )}
          <div style={{ marginBottom: "var(--space-6)" }}><PreviewBanner /></div>
          {(trail.description || (trail.from && trail.to)) && (
            <section aria-labelledby="love-h" style={{ marginBottom: "var(--space-7)" }}>
              <h2 id="love-h">{t("trail.aboutWalk")}</h2>
              {trail.from && trail.to && <p>{t("trail.from", { from: trail.from, to: trail.to })}</p>}
              {trail.description && <p style={{ marginTop: "var(--space-2)" }}>{trail.description}</p>}
            </section>
          )}
          <section aria-labelledby="route-h">
            <h2 id="route-h">{t("trail.route")}</h2>
            <div className="mapcard" style={{ marginTop: "var(--space-4)" }}>
              <div className="map trail-map">
                <LazyMap mode="one" label={t("trail.mapLabel", { name: trail.name })} lines={trail.lines} bbox={trail.bbox} />
              </div>
            </div>
            {trail.stats && (
              <div className="mapcard" style={{ marginTop: "var(--space-3)" }}>
                <ElevationProfile profile={trail.stats.profile} lengthM={trail.lengthM} lines={trail.lines} />
              </div>
            )}
            <p className="meta" style={{ marginTop: "var(--space-3)" }}>{t("trail.estimates")}</p>
          </section>
          <section aria-labelledby="about-h" style={{ marginTop: "var(--space-7)" }}>
            <h2 id="about-h">{t("trail.aboutData")}</h2>
            <p style={{ marginTop: "var(--space-3)" }}>{t("trail.aboutDataBody", { id: trail.osmId, date: dateFmt.format(new Date(importedAt)) })}</p>
            <p style={{ marginTop: "var(--space-2)" }}><a href={osmUrl}>{t("trail.viewOsm")}</a></p>
            <p className="meta" style={{ marginTop: "var(--space-2)" }}>
              {dataCreditBefore}<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>{dataCreditAfter}{" "}
              {mapCreditBefore}<a href="https://protomaps.com">Protomaps</a>{mapCreditAfter}{" "}
              {elevCreditBefore}<a href="https://mapterhorn.com/attribution">Mapterhorn</a>{elevCreditAfter}
              {trail.park && <> {capadBefore}<a href={CAPAD_URL}>CAPAD 2024</a>{capadAfter}</>}
            </p>
          </section>
        </div>
        <aside className="book" aria-label={t("trail.actions")}>
          <div className="book-detail">
            <p className="num" style={{ fontWeight: 650, fontSize: "var(--step-1)" }}>{facts ? `${length} · ${formatDuration(facts.timeS)}` : length}</p>
            <p className="meta num">{t("trail.start")}: {lat.toFixed(4)}, {lon.toFixed(4)}</p>
          </div>
          <b className="book-phone num">{length}</b>
          <a className="btn btn-primary" href={directions} rel="noopener" target="_blank"><Icon id="i-car" small />{t("trail.directions")}</a>
        </aside>
      </div>
    </main>
  );
}
