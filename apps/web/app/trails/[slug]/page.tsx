import { DEFAULT_LOCALE, formatDistance, HOME_AREA, t } from "@trailaroo/core";
import { getTrail, importedAt, trails } from "@trailaroo/core/trails";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { Icon } from "@/components/icon";
import { LazyMap } from "@/components/lazy-map";
import { PreviewBanner } from "@/components/preview-banner";

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
    <main id="main" className="app-main">
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      <Link href="/" className="btn btn-quiet"><Icon id="i-back" small />{t("trail.back")}</Link>
      <div className="trail-layout">
        <div>
          <div className="trail-head">
            <h1>{trail.name}</h1>
            {place && <p className="meta">{place}</p>}
          </div>
          <div className="stats" style={{ "--cols": 2 } as CSSProperties}>
            <div className="stat"><span className="value">{formatDistance(trail.lengthM)}</span><span className="label">{t("trail.length")}</span></div>
            <div className="stat"><span className="value num" style={{ fontSize: "var(--step-1)" }}>{lat.toFixed(4)}, {lon.toFixed(4)}</span><span className="label">{t("trail.start")}</span></div>
          </div>
          <div className="actions" style={{ marginTop: "var(--space-4)" }}>
            <a className="btn btn-primary" href={directions} rel="noopener" target="_blank"><Icon id="i-car" small />{t("trail.directions")}</a>
          </div>
          {trail.from && trail.to && <p style={{ marginTop: "var(--space-4)" }}>{t("trail.from", { from: trail.from, to: trail.to })}</p>}
          {trail.description && <p style={{ marginTop: "var(--space-3)" }}>{trail.description}</p>}

          <div className="section"><PreviewBanner /></div>
          <p className="meta" style={{ marginTop: "var(--space-3)" }}>{t("trail.notYet")}</p>

          <section className="section" aria-labelledby="about-h">
            <h2 id="about-h">{t("trail.aboutData")}</h2>
            <p>{t("trail.aboutDataBody", { id: trail.osmId, date: dateFmt.format(new Date(importedAt)) })}</p>
            <p style={{ marginTop: "var(--space-2)" }}><a href={osmUrl}>{t("trail.viewOsm")}</a></p>
            <p className="meta" style={{ marginTop: "var(--space-2)" }}>
              {dataCreditBefore}<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>{dataCreditAfter}{" "}
              {mapCreditBefore}<a href="https://protomaps.com">Protomaps</a>{mapCreditAfter}
            </p>
          </section>
        </div>
        <div className="map trail-map">
          <LazyMap mode="one" label={t("trail.mapLabel", { name: trail.name })} lines={trail.lines} bbox={trail.bbox} />
        </div>
      </div>
    </main>
  );
}
