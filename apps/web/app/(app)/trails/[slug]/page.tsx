import { DEFAULT_LOCALE, formatDistance, HOME_AREA, t } from "@trailaroo/core";
import { getTrail, importedAt, trails } from "@trailaroo/core/trails";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { LazyMap } from "@/components/lazy-map";
import { NewHere } from "@/components/new-here";
import { PreviewBanner } from "@/components/preview-banner";
import { RouteSvg } from "@/components/route-svg";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => trails.map((trail) => ({ slug: trail.slug }));

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const trail = getTrail((await params).slug);
  if (!trail) return {};
  const description = t("trail.metaDescription", { name: trail.name, length: formatDistance(trail.lengthM), area: HOME_AREA.name });
  return {
    title: trail.name,
    description,
    alternates: { canonical: `/trails/${trail.slug}` },
    openGraph: { title: trail.name, description, url: `/trails/${trail.slug}` },
  };
}

const dateFmt = new Intl.DateTimeFormat(DEFAULT_LOCALE, { day: "numeric", month: "long", year: "numeric" });

export default async function TrailPage({ params }: Params) {
  const trail = getTrail((await params).slug);
  if (!trail) notFound();
  const [lon, lat] = trail.start;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  const osmUrl = `https://www.openstreetmap.org/relation/${trail.osmId}`;
  const place = trail.operator ?? trail.network;
  const [dataCreditBefore, dataCreditAfter] = t("credit.osmLicence").split("{osm}");
  const [mapCreditBefore, mapCreditAfter] = t("credit.map", { osm: "OpenStreetMap" }).split("{protomaps}");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: trail.name,
    geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lon },
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
      <div className="cover drawn trail-cover"><RouteSvg trail={trail} /></div>
      <div className="gh-head">
        <h1>{trail.name}</h1>
        <div className="sub">
          {place && <span>{place}</span>}
          <span className="pill-tag num">{formatDistance(trail.lengthM)}</span>
          <span>{t("trail.walkingRoute")}</span>
        </div>
      </div>
      <div className="gh-body">
        <div>
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
            <p className="meta" style={{ marginTop: "var(--space-3)" }}>{t("trail.notYet")}</p>
          </section>
          <section aria-labelledby="about-h" style={{ marginTop: "var(--space-7)" }}>
            <h2 id="about-h">{t("trail.aboutData")}</h2>
            <p style={{ marginTop: "var(--space-3)" }}>{t("trail.aboutDataBody", { id: trail.osmId, date: dateFmt.format(new Date(importedAt)) })}</p>
            <p style={{ marginTop: "var(--space-2)" }}><a href={osmUrl}>{t("trail.viewOsm")}</a></p>
            <p className="meta" style={{ marginTop: "var(--space-2)" }}>
              {dataCreditBefore}<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>{dataCreditAfter}{" "}
              {mapCreditBefore}<a href="https://protomaps.com">Protomaps</a>{mapCreditAfter}
            </p>
          </section>
        </div>
        <aside className="book" aria-label={t("trail.actions")}>
          <div className="book-detail">
            <p className="num" style={{ fontWeight: 650, fontSize: "var(--step-1)" }}>{formatDistance(trail.lengthM)}</p>
            <p className="meta num">{t("trail.start")}: {lat.toFixed(4)}, {lon.toFixed(4)}</p>
          </div>
          <b className="book-phone num">{formatDistance(trail.lengthM)}</b>
          <a className="btn btn-primary" href={directions} rel="noopener" target="_blank"><Icon id="i-car" small />{t("trail.directions")}</a>
        </aside>
      </div>
    </main>
  );
}
