"use client";
import { layers, namedFlavor } from "@protomaps/basemaps";
import { t } from "@trailaroo/core";
import type { FeatureCollection } from "geojson";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRouter } from "next/navigation";
import { Protocol } from "pmtiles";
import { useEffect, useRef, useState } from "react";

// ACT basemap extract served by this app (public/tiles). Moves to R2 behind a CDN in M1.
const TILES = "/tiles/act.pmtiles";
const ACT_BOUNDS: [number, number, number, number] = [148.76, -35.93, 149.4, -35.12];

let protocolAdded = false;
function ensureProtocol() {
  if (protocolAdded) return;
  maplibregl.addProtocol("pmtiles", new Protocol().tile);
  protocolAdded = true;
}

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const themeNow = (): "dark" | "light" => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

function buildStyle(data: string | FeatureCollection): StyleSpecification {
  const theme = themeNow();
  return {
    version: 8,
    sources: {
      basemap: {
        type: "vector",
        url: `pmtiles://${new URL(TILES, location.origin).href}`,
        attribution: t("credit.map", { protomaps: '<a href="https://protomaps.com">Protomaps</a>', osm: '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }),
      },
      trails: { type: "geojson", data },
    },
    layers: [
      // Labels need self-hosted fonts; they arrive with the M1 tile pipeline.
      ...layers("basemap", namedFlavor(theme)).filter((l) => l.type !== "symbol"),
      { id: "trail-casing", type: "line", source: "trails", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": cssVar("--map-route-casing"), "line-width": ["interpolate", ["linear"], ["zoom"], 9, 4, 15, 9] } },
      { id: "trail-line", type: "line", source: "trails", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": cssVar("--route"), "line-width": ["interpolate", ["linear"], ["zoom"], 9, 2, 15, 5] } },
    ],
  };
}

type Props =
  | { mode: "all"; label: string }
  | { mode: "one"; label: string; lines: [number, number][][]; bbox: [number, number, number, number] };

/** MapLibre map of all trails (Explore) or one trail (trail page). Client-only, loaded lazily. */
export default function TrailMap(props: Props) {
  const el = useRef<HTMLElement>(null);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

  // Re-create the map when the connection comes back.
  useEffect(() => {
    const back = () => setOffline(false);
    window.addEventListener("online", back);
    return () => window.removeEventListener("online", back);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: create the map once per mount (and again after reconnecting)
  useEffect(() => {
    if (!el.current) return;
    if (!navigator.onLine) { setOffline(true); return; }
    ensureProtocol();
    const data: string | FeatureCollection =
      props.mode === "all"
        ? "/trails.geojson"
        : { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: props.lines } }] };
    const map = new maplibregl.Map({
      container: el.current,
      style: buildStyle(data),
      bounds: props.mode === "one" ? props.bbox : ACT_BOUNDS,
      fitBoundsOptions: { padding: 40 },
      maxBounds: [ACT_BOUNDS[0] - 0.3, ACT_BOUNDS[1] - 0.3, ACT_BOUNDS[2] + 0.3, ACT_BOUNDS[3] + 0.3],
      minZoom: 8,
      maxZoom: 17,
      attributionControl: { compact: true },
      cooperativeGestures: props.mode === "one",
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    // The box can still be settling when the map starts (fonts, lazy load); keep the canvas matched to it.
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(el.current);
    map.on("load", () => setReady(true));
    map.on("error", (e) => {
      if (!navigator.onLine && !map.loaded()) setOffline(true);
      console.error("map", e.error);
    });

    if (props.mode === "all") {
      map.on("click", "trail-line", (e) => {
        const slug = e.features?.[0]?.properties?.slug;
        if (typeof slug === "string") router.push(`/trails/${slug}`);
      });
      map.on("mouseenter", "trail-line", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "trail-line", () => { map.getCanvas().style.cursor = ""; });
    }

    const onTheme = () => map.setStyle(buildStyle(data));
    window.addEventListener("themechange", onTheme);
    return () => {
      window.removeEventListener("themechange", onTheme);
      resize.disconnect();
      map.remove();
    };
  }, [offline]);

  return (
    <>
      <section ref={el} className="map-canvas" aria-label={props.label} />
      {!ready && <p className="map-status" aria-hidden={!offline}>{t(offline ? "map.offline" : "map.loading")}</p>}
    </>
  );
}
