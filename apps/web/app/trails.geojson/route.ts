import { trails } from "@trailaroo/core/trails";

export const dynamic = "force-static";

/** All trail lines for the Explore map. Static, so the service worker and CDN can cache it. */
export function GET() {
  return Response.json({
    type: "FeatureCollection",
    features: trails.map((trail) => ({
      type: "Feature",
      properties: { slug: trail.slug, name: trail.name },
      geometry: { type: "MultiLineString", coordinates: trail.lines },
    })),
  });
}
