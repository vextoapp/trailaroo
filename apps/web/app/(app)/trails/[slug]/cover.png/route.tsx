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

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const trail = getTrail((await params).slug);
  if (!trail) notFound();
  const photo = getTrailPhotos(trail.osmId)[0];
  const facts = [formatDistance(trail.lengthM), trail.stats && t("explore.climb", { climb: formatClimb(trail.stats.gainM) })].filter(Boolean).join(" · ");
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", color: "#FFFFFF", background: "radial-gradient(120% 90% at 20% 10%, #2F6B52 0%, #1F4D3A 55%, #163629 100%)" }}>
      {photo ? (
        // biome-ignore lint/performance/noImgElement: rendered to PNG by next/og, not shown in the page
        <img src={`${TILES_URL}/${photo.file}`} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, objectFit: "cover" }} />
      ) : (
        <svg viewBox="0 0 100 100" width={560} height={560} style={{ position: "absolute", right: 40, top: 35 }} aria-hidden="true">
          <path d={routePath(trail)} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          <path d={routePath(trail)} fill="none" stroke={WATTLE} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", gap: 12, padding: "120px 64px 56px", background: "linear-gradient(transparent, rgba(0,0,0,0.65))" }}>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, maxWidth: photo ? 1072 : 600 }}>{trail.name}</div>
        <div style={{ fontSize: 32, opacity: 0.92 }}>{[trail.park, facts].filter(Boolean).join(" · ")}</div>
        <div style={{ fontSize: 28, color: WATTLE, fontWeight: 700, marginTop: 8 }}>{APP_NAME}</div>
      </div>
    </div>,
    OG_SIZE,
  );
}
