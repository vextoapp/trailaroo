import { APP_NAME, formatClimb, formatDistance, t } from "@trailaroo/core";
import { getTrail, getTrailPhotos, trails } from "@trailaroo/core/trails";
import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { routePath } from "@/components/route-svg";
import { OG_SIZE } from "@/lib/site";
import { TILES_URL } from "@/lib/tiles";

// The link preview for a trail: its first picked photo, or the drawn route on Golden hour green
// (the same look as .cover.drawn). Built once per trail at build time, at a stable URL so the
// Open Graph tags and the JSON-LD can share it (opengraph-image.tsx adds a changing hash).
export const dynamic = "force-static";
export const dynamicParams = false;
export const generateStaticParams = () => trails.map((trail) => ({ slug: trail.slug }));

const WATTLE = "#F2B705";

/** The photo as a data URL, or undefined if it isn't on the CDN yet (a new pick uploads while CI builds)
 *  or the CDN is down: then the preview falls back to the drawn route instead of a blank card. */
async function photoDataUrl(file: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${TILES_URL}/${file}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return undefined;
    return `data:image/jpeg;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const trail = getTrail((await params).slug);
  if (!trail) notFound();
  const picked = getTrailPhotos(trail.osmId)[0];
  const photoSrc = picked && (await photoDataUrl(picked.file));
  const photo = photoSrc ? picked : undefined;
  const credit = photo ? t("og.creditPhoto", { author: photo.author, licence: photo.licence }) : t("og.creditOsm");
  const route = routePath(trail);
  const facts = [formatDistance(trail.lengthM), trail.stats && t("explore.climb", { climb: formatClimb(trail.stats.gainM) })].filter(Boolean).join(" · ");
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", color: "#FFFFFF", background: "radial-gradient(120% 90% at 20% 10%, #2F6B52 0%, #1F4D3A 55%, #163629 100%)" }}>
      {photo ? (
        // biome-ignore lint/performance/noImgElement: rendered to PNG by next/og, not shown in the page
        <img src={photoSrc} alt="" {...OG_SIZE} style={{ position: "absolute", inset: 0, objectFit: "cover" }} />
      ) : (
        <svg viewBox="0 0 100 100" width={560} height={560} style={{ position: "absolute", right: 40, top: 35 }} aria-hidden="true">
          <path d={route} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          <path d={route} fill="none" stroke={WATTLE} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", gap: 12, padding: "120px 64px 56px", background: "linear-gradient(transparent, rgba(0,0,0,0.65))" }}>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, maxWidth: photo ? 1072 : 600 }}>{trail.name}</div>
        <div style={{ fontSize: 32, opacity: 0.92 }}>{[trail.park, facts].filter(Boolean).join(" · ")}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 24, marginTop: 8 }}>
          <div style={{ fontSize: 28, color: WATTLE, fontWeight: 700 }}>{APP_NAME}</div>
          <div style={{ fontSize: 18, opacity: 0.85 }}>{credit}</div>
        </div>
      </div>
    </div>,
    OG_SIZE,
  );
}
