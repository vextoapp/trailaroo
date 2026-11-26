/**
 * Builds packages/core/data/trails.json from OpenStreetMap walking and mountain-bike route
 * relations in the active region (packages/core/src/regions.ts). Maintainers run it with
 * `pnpm data:trails`; contributors use the committed file.
 *
 * Needs: osmium-tool (brew install osmium-tool) and the Geofabrik Australia extract at
 * .data/australia-latest.osm.pbf (https://download.geofabrik.de/australia-oceania.html).
 * Data © OpenStreetMap contributors, ODbL 1.0.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { v7 as uuidv7 } from "uuid";
import { bbox, inMultiPolygon, multiLineLengthM, type Position, simplify, stitch } from "../../packages/core/src/geo";
import { ACTIVE_REGION } from "../../packages/core/src/regions";
import { type Family, slugify, type Trail, trailFileSchema } from "../../packages/core/src/trail";

const DATA = ".data";
const PBF = `${DATA}/australia-latest.osm.pbf`;
const OUT = "packages/core/data/trails.json";
const REGION_BBOX = ACTIVE_REGION.bbox.join(",");
const EXTRACT = `${DATA}/${ACTIVE_REGION.id}`;
/** route=* value -> activity family. route=bicycle is left out: in Australia it's mostly road and commuter routes. */
const ROUTE_FAMILY: Record<string, Family> = { hiking: "foot", foot: "foot", walking: "foot", mtb: "bike" };
const MIN_M = 300;
const MAX_M = 250_000;
const DISPLAY_TOLERANCE_M = 4;
const MAX_PIECES = 8;

if (!existsSync(PBF)) {
  console.error(`Missing ${PBF}. Download it from https://download.geofabrik.de/australia-oceania/australia-latest.osm.pbf`);
  process.exit(1);
}
const osmium = (...args: string[]) => execFileSync("osmium", args, { stdio: "inherit" });
osmium("extract", "-b", REGION_BBOX, "-s", "smart", PBF, "-o", `${EXTRACT}.osm.pbf`, "--overwrite");
osmium("tags-filter", `${EXTRACT}.osm.pbf`, `r/route=${Object.keys(ROUTE_FAMILY).join(",")}`, "-o", `${EXTRACT}-routes.osm.pbf`, "--overwrite");
osmium("cat", `${EXTRACT}-routes.osm.pbf`, "-f", "opl", "-o", `${EXTRACT}-routes.opl`, "--overwrite");

// ---- Region borders: OSM state boundaries (admin_level=4), extracted once ----
const STATES = `${DATA}/states.geojson`;
if (!existsSync(STATES)) {
  osmium("tags-filter", PBF, "r/admin_level=4", "-o", `${DATA}/states.osm.pbf`, "--overwrite");
  osmium("export", `${DATA}/states.osm.pbf`, "-f", "geojson", "--geometry-types=polygon", "-o", STATES, "--overwrite");
}
type StateFeature = { properties: { name?: string; admin_level?: string }; geometry: { type: string; coordinates: Position[][][] } };
const regionShapes = (JSON.parse(readFileSync(STATES, "utf8")) as { features: StateFeature[] }).features
  .filter((f) => f.properties.admin_level === "4" && ACTIVE_REGION.states.includes(f.properties.name ?? "") && f.geometry.type === "MultiPolygon")
  .map((f) => f.geometry.coordinates);
if (regionShapes.length !== ACTIVE_REGION.states.length) {
  console.error(`Expected ${ACTIVE_REGION.states.length} state borders for ${ACTIVE_REGION.name}, found ${regionShapes.length}.`);
  process.exit(1);
}
const inRegion = (p: Position) => regionShapes.some((shape) => inMultiPolygon(p, shape));

// ---- Parse OPL (https://osmcode.org/opl-file-format/) ----
const unescapeOpl = (s: string) => s.replace(/%([0-9a-fA-F]+)%/g, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)));
const parseTags = (s: string) =>
  Object.fromEntries(
    s ? s.split(",").map((kv) => { const i = kv.indexOf("="); return [unescapeOpl(kv.slice(0, i)), unescapeOpl(kv.slice(i + 1))]; }) : [],
  ) as Record<string, string>;

const nodes = new Map<number, Position>();
const ways = new Map<number, number[]>();
const relations: { id: number; tags: Record<string, string>; members: { type: string; ref: number }[] }[] = [];

for (const line of readFileSync(`${EXTRACT}-routes.opl`, "utf8").split("\n")) {
  if (!line) continue;
  const fields = Object.fromEntries(line.split(" ").map((f) => [f[0], f.slice(1)])) as Record<string, string>;
  const kind = line[0];
  const id = Number(line.slice(1, line.indexOf(" ")));
  if (kind === "n" && fields.x && fields.y) nodes.set(id, [Number(fields.x), Number(fields.y)]);
  else if (kind === "w") ways.set(id, (fields.N ?? "").split(",").filter(Boolean).map((n) => Number(n.slice(1))));
  else if (kind === "r")
    relations.push({
      id,
      tags: parseTags(fields.T ?? ""),
      members: (fields.M ?? "").split(",").filter(Boolean).map((m) => ({ type: m[0] ?? "", ref: Number(m.slice(1, m.indexOf("@"))) })),
    });
}

// ---- Build trails ----
/** Keep only the tags later steps use (difficulty, route type). */
function osmTags(tags: Record<string, string>): Pick<Trail, "osmTags"> {
  const picked = {
    ...(tags.sac_scale ? { sac_scale: tags.sac_scale } : {}),
    ...(tags["mtb:scale"] ? { mtb_scale: tags["mtb:scale"] } : {}),
    ...(tags.surface ? { surface: tags.surface } : {}),
    ...(tags.roundtrip ? { roundtrip: tags.roundtrip } : {}),
  };
  return Object.keys(picked).length ? { osmTags: picked } : {};
}
const previous = existsSync(OUT) ? trailFileSchema.parse(JSON.parse(readFileSync(OUT, "utf8"))) : null;
const idByOsm = new Map(previous?.trails.map((t) => [t.osmId, t.id]));
const round6 = (v: number) => Math.round(v * 1e6) / 1e6;
const round = ([x, y]: Position): Position => [round6(x), round6(y)];
const skipped: Record<string, number> = {};
const skip = (why: string) => { skipped[why] = (skipped[why] ?? 0) + 1; };

const out: Trail[] = [];
for (const r of relations) {
  const { tags } = r;
  const route = tags.route ?? "";
  const family = Object.hasOwn(ROUTE_FAMILY, route) ? ROUTE_FAMILY[route] : undefined;
  if (tags.type !== "route" || !family) { skip("not a walking or MTB route"); continue; }
  if (tags.state === "proposed" || tags["disused:route"]) { skip("proposed or disused"); continue; }
  const name = tags.name?.trim();
  if (!name) { skip("no name"); continue; }
  // A route that leaves the extract or is missing ways would show a wrong length: leave it out.
  const wayMembers = r.members.filter((m) => m.type === "w");
  if (wayMembers.some((m) => !ways.get(m.ref)?.every((n) => nodes.has(n)))) { skip("incomplete in the region extract"); continue; }
  if (r.members.some((m) => m.type === "r")) { skip("route of routes"); continue; }
  const segments = wayMembers.map((m) => (ways.get(m.ref) ?? []).map((n) => nodes.get(n)).filter((p): p is Position => !!p));
  const lines = stitch(segments);
  if (!lines.length) { skip("no ways"); continue; }
  // Many disconnected pieces means the mapped route has gaps, so its length can't be trusted yet.
  if (lines.length > MAX_PIECES) { skip("too many gaps to measure"); continue; }
  const lengthM = Math.round(multiLineLengthM(lines));
  if (lengthM < MIN_M || lengthM > MAX_M) { skip("too short or too long"); continue; }
  const longest = lines.reduce((a, b) => (b.length > a.length ? b : a));
  if (!inRegion(longest[0] as Position)) { skip("starts outside the region"); continue; }
  const optional = (k: string) => (tags[k]?.trim() ? { [k]: tags[k].trim() } : {});
  const website = tags.website?.startsWith("http") ? { website: tags.website } : {};
  out.push({
    id: idByOsm.get(r.id) ?? uuidv7(),
    slug: slugify(name, r.id),
    osmId: r.id,
    name,
    family,
    lengthM,
    start: round(longest[0] as Position),
    bbox: bbox(lines).map(round6) as Trail["bbox"],
    ...optional("from"),
    ...optional("to"),
    ...(tags.network && !/^[ilrn]wn$/.test(tags.network) ? { network: tags.network } : {}),
    ...optional("operator"),
    ...optional("description"),
    ...website,
    ...osmTags(tags),
    lines: lines.map((l) => simplify(l, DISPLAY_TOLERANCE_M).map(round)),
  });
}
out.sort((a, b) => a.osmId - b.osmId);

const importedAt = new Date(statSync(PBF).mtime).toISOString().slice(0, 10);
const file = trailFileSchema.parse({ importedAt, source: "OpenStreetMap via Geofabrik (australia-latest.osm.pbf)", licence: "ODbL-1.0", trails: out });
writeFileSync(OUT, `${JSON.stringify(file)}\n`);
console.log(`Wrote ${out.length} trails to ${OUT} (${(statSync(OUT).size / 1024).toFixed(0)} KB). Skipped:`, skipped);
