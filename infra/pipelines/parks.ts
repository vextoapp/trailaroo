/**
 * Tags each trail in packages/core/data/trails.json with the protected area most of its route runs
 * through, from CAPAD 2024 terrestrial (© Commonwealth of Australia, DCCEEW, CC BY 4.0).
 * Needs .data/capad/capad-2024-terrestrial.geojson (download link in SPEC > Open data sources).
 * Privately governed areas are left out, so landholders' names never appear. Runs in pnpm data:trails.
 */
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { z } from "zod";
import { sampleLine } from "../../packages/core/src/elevation";
import { inMultiPolygon, type Position } from "../../packages/core/src/geo";
import { ACTIVE_REGION } from "../../packages/core/src/regions";
import { parkName, trailFileSchema } from "../../packages/core/src/trail";

const CAPAD = ".data/capad/capad-2024-terrestrial.geojson";
const FILE = "packages/core/data/trails.json";
const STEP_M = 100;
const MIN_SHARE = 0.4; // the park holding the most of the route, if it holds at least 40% (trails often start outside the boundary)

// Region states use full names; CAPAD uses codes.
const STATE_CODES: Record<string, string> = { "New South Wales": "NSW", "Australian Capital Territory": "ACT", "Jervis Bay Territory": "JBT" };

const featureSchema = z.object({
  properties: z.object({ NAME: z.string(), TYPE: z.string(), STATE: z.string(), GOVERNANCE: z.string().nullable() }),
  geometry: z.discriminatedUnion("type", [
    z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))) }),
    z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(z.array(z.array(z.tuple([z.number(), z.number()])))) }),
  ]),
});

type Park = { name: string; polygons: Position[][][]; bbox: [number, number, number, number] };

async function loadParks(): Promise<Park[]> {
  const states = new Set(ACTIVE_REGION.states.map((s) => STATE_CODES[s] ?? s));
  const parks: Park[] = [];
  // The file has one feature per line; stream it rather than parse 350 MB at once.
  for await (const raw of createInterface({ input: createReadStream(CAPAD) })) {
    const line = raw.trim().replace(/,$/, "");
    if (!line.startsWith('{"type":"Feature"')) continue;
    const f = featureSchema.parse(JSON.parse(line));
    const p = f.properties;
    if (!states.has(p.STATE) || p.GOVERNANCE === "P" || p.TYPE === "Wilderness Zone") continue;
    const polygons = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    let w = 180, s = 90, e = -180, n = -90;
    for (const [x, y] of polygons.flat(2)) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); }
    parks.push({ name: parkName(p.NAME, p.TYPE), polygons, bbox: [w, s, e, n] });
  }
  return parks;
}

async function main() {
  const parks = await loadParks();
  const file = trailFileSchema.parse(JSON.parse(readFileSync(FILE, "utf8")));
  let tagged = 0;
  for (const trail of file.trails) {
    const points = trail.lines.flatMap((l) => sampleLine(l, STEP_M).map((s) => s.at));
    const counts = new Map<string, number>();
    for (const [x, y] of points) {
      for (const park of parks) {
        const [w, s, e, n] = park.bbox;
        if (x < w || x > e || y < s || y > n || !inMultiPolygon([x, y], park.polygons)) continue;
        counts.set(park.name, (counts.get(park.name) ?? 0) + 1);
      }
    }
    const [best, count] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [];
    if (best && count && count / points.length >= MIN_SHARE) { trail.park = best; tagged++; }
    else delete trail.park;
  }
  writeFileSync(FILE, `${JSON.stringify(trailFileSchema.parse(file))}\n`);
  console.log(`${parks.length} protected areas; ${tagged} of ${file.trails.length} trails are mostly inside one.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
