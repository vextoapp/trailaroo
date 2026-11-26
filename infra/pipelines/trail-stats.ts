/**
 * Adds elevation stats to packages/core/data/trails.json: climb and descent (5 m hysteresis),
 * lowest and highest point, a 120-point profile and loop or one-way. Runs after trails.ts
 * (both are `pnpm data:trails`). Terrain: Mapterhorn (see terrain.ts).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { climb, resampleProfile, routeType, sampleLine } from "../../packages/core/src/elevation";
import { type Trail, trailFileSchema } from "../../packages/core/src/trail";
import { elevationAt } from "./terrain";

const FILE = "packages/core/data/trails.json";
const STEP_M = 25;

async function statsFor(trail: Trail): Promise<Trail["stats"]> {
  let gainM = 0, lossM = 0, offset = 0;
  const all: { distM: number; elevM: number }[] = [];
  for (const line of trail.lines) {
    const samples = sampleLine(line, STEP_M);
    const elevs: number[] = [];
    for (const s of samples) {
      const e = await elevationAt(s.at);
      if (e === null) return undefined; // no terrain here: leave the trail without stats rather than guess
      elevs.push(e);
      all.push({ distM: offset + s.distM, elevM: e });
    }
    const c = climb(elevs);
    gainM += c.gainM;
    lossM += c.lossM;
    offset += samples.at(-1)?.distM ?? 0;
  }
  const elevations = all.map((s) => s.elevM);
  return {
    gainM,
    lossM,
    minM: Math.round(Math.min(...elevations)),
    maxM: Math.round(Math.max(...elevations)),
    routeType: routeType(trail.lines, trail.osmTags?.roundtrip),
    profile: resampleProfile(all, 120),
  };
}

async function main() {
  const file = trailFileSchema.parse(JSON.parse(readFileSync(FILE, "utf8")));
  let done = 0, missing = 0;
  for (const trail of file.trails) {
    const stats = await statsFor(trail);
    if (stats) trail.stats = stats;
    else { delete trail.stats; missing++; }
    if (++done % 50 === 0) console.log(`${done}/${file.trails.length}`);
  }
  writeFileSync(FILE, `${JSON.stringify(trailFileSchema.parse(file))}\n`);
  console.log(`Elevation added to ${file.trails.length - missing} of ${file.trails.length} trails (${missing} without terrain).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
