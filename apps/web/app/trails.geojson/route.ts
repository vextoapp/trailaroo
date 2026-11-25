import { trails } from "@trailaroo/core/trails";

export const dynamic = "force-static";

/** All trail lines for the Explore map. Static, so the service worker and CDN can cache it. */
export function GET() {
  return Response.json({
    type: "FeatureCollection",
    features: trails.map((t) => ({
      type: "Feature",
      properties: { slug: t.slug, name: t.name },
      geometry: { type: "MultiLineString", coordinates: t.lines },
    })),
  });
}
