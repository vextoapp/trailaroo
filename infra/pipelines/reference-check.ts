/**
 * Compares our trail lengths with published park figures (packages/core/data/reference-trails.json,
 * one source link per trail). SPEC check: length within 2%. Parks publish no climb figures, so climb
 * isn't checked here. Run: pnpm data:check. Prints a table; exits 1 if fewer than 20 trails pass.
 */
import { readFileSync } from "node:fs";
import { z } from "zod";
import { trailFileSchema } from "../../packages/core/src/trail";

const TOLERANCE = 0.02;
const MIN_PASSING = 20;

const referenceSchema = z.array(
  z.object({
    name: z.string(),
    osmId: z.number().int(),
    publishedDistanceKm: z.number().positive(),
    distanceBasis: z.enum(["loop", "one-way", "return"]),
    sourceUrl: z.url(),
  }),
);

const { trails } = trailFileSchema.parse(JSON.parse(readFileSync("packages/core/data/trails.json", "utf8")));
const refs = referenceSchema.parse(JSON.parse(readFileSync("packages/core/data/reference-trails.json", "utf8")));

let passed = 0;
const rows = refs.map((ref) => {
  const trail = trails.find((t) => t.osmId === ref.osmId);
  if (!trail) return { name: ref.name, result: "missing from trails.json" };
  // A published "return" figure for a one-way route is there and back. Parks also call loops "return".
  const oursKm = (trail.lengthM / 1000) * (ref.distanceBasis === "return" && trail.stats?.routeType !== "loop" ? 2 : 1);
  const diff = (oursKm - ref.publishedDistanceKm) / ref.publishedDistanceKm;
  const ok = Math.abs(diff) <= TOLERANCE;
  if (ok) passed++;
  return {
    name: ref.name,
    published: `${ref.publishedDistanceKm} km ${ref.distanceBasis}`,
    ours: `${oursKm.toFixed(2)} km`,
    diff: `${(diff * 100).toFixed(1)}%`,
    result: ok ? "pass" : "miss",
  };
});

console.table(rows);
console.log(`${passed} of ${refs.length} within ${TOLERANCE * 100}% of the published length (need ${MIN_PASSING}).`);
process.exitCode = passed >= MIN_PASSING ? 0 : 1;
