/**
 * Builds the map files for the active region into .data/tiles: a Protomaps basemap extract (z0–14,
 * from OpenStreetMap) and a Mapterhorn terrain extract (z0–11) for hillshade. Each stays under
 * 512 MB so Cloudflare's CDN can cache it. Needs the pmtiles CLI. Run: pnpm data:tiles.
 * Uploading to R2 happens in .github/workflows/tiles.yml, so R2 keys live only in GitHub secrets.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import { z } from "zod";
import { ACTIVE_REGION } from "../../packages/core/src/regions";

const OUT = ".data/tiles";
const MAX_BYTES = 512 * 1024 * 1024;

async function latestBasemap(): Promise<string> {
  const builds = z.array(z.object({ key: z.string() })).parse(await (await fetch("https://build-metadata.protomaps.dev/builds.json")).json());
  const key = builds.at(-1)?.key;
  if (!key) throw new Error("No Protomaps builds listed");
  return `https://build.protomaps.com/${key}`;
}

function extract(source: string, name: string, maxzoom: number) {
  const out = `${OUT}/${name}.pmtiles`;
  execFileSync("pmtiles", ["extract", source, out, `--bbox=${ACTIVE_REGION.bbox.join(",")}`, `--maxzoom=${maxzoom}`], { stdio: "inherit" });
  const size = statSync(out).size;
  if (size > MAX_BYTES) throw new Error(`${out} is ${Math.round(size / 1e6)} MB, over the 512 MB CDN cache limit`);
  console.log(`${out}: ${Math.round(size / 1e6)} MB`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  extract(await latestBasemap(), "basemap", 14);
  extract("https://download.mapterhorn.com/planet.pmtiles", "terrain", 11);
}

main().catch((e) => { console.error(e); process.exit(1); });
