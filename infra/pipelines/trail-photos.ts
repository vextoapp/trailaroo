/**
 * Trail photos from Wikimedia Commons, picked by a human. Two steps:
 *
 *   pnpm data:photos
 *     Finds geotagged Commons photos within 400 m of four points along each trail in
 *     packages/core/data/trails.json, keeps CC BY / CC BY-SA / CC0 / public-domain landscape
 *     photos at least 1000 px wide, and writes .data/photo-picker.html listing the trails that have
 *     any. Open it, tick up to three photos per trail that really show the trail (in order), then
 *     "Copy picks" and save the JSON to a file, e.g. .data/picks.json.
 *     Requests are one at a time with a pause between them, so a full region takes a while; each
 *     trail's result is cached in .data/photo-candidates.json, so an interrupted run resumes where it
 *     stopped. Add --fresh to search every trail again.
 *
 *   pnpm data:photos --apply .data/picks.json
 *     Downloads each picked photo, resizes it to 1000 px wide JPEG of about 80 KB with macOS
 *     `sips`, saves it as apps/web/public/photos/<slug>-<n>.jpg and records its author and licence
 *     in packages/core/data/trail-photos.json. Trails in the picks file are replaced; others are kept.
 *     A trail with an empty list loses its photos.
 *
 * Needs: network access to commons.wikimedia.org; `sips` (built into macOS) for --apply.
 * Photos are by Wikimedia Commons contributors under the licence recorded for each one.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { distanceM, type Position } from "../../packages/core/src/geo";
import { isOpenPhotoLicence, type Trail, type TrailPhoto, trailFileSchema, trailPhotosSchema } from "../../packages/core/src/trail";

const TRAILS = "packages/core/data/trails.json";
const PHOTOS_JSON = "packages/core/data/trail-photos.json";
const CACHE = ".data/photo-candidates.json";
const PHOTOS_DIR = "apps/web/public/photos";
const PICKER = ".data/photo-picker.html";
const API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "TrailarooPhotoPipeline/0.1 (https://github.com/vextoapp/trailaroo)";
const RADIUS_M = 400;
const SAMPLE_POINTS = 4;
const MIN_WIDTH = 1000;
const OUT_WIDTH = 1000;
const TARGET_BYTES = 85_000;
const DELAY_MS = 600;
const MAX_PICKS = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- Commons API ----
const metaValue = z.object({ value: z.union([z.string(), z.number()]) }).optional();
const imageInfoSchema = z.object({
  url: z.url(),
  descriptionurl: z.url(),
  width: z.number(),
  height: z.number(),
  mime: z.string(),
  thumburl: z.url().optional(),
  extmetadata: z.record(z.string(), metaValue).optional(),
});
const responseSchema = z.object({
  error: z.object({ code: z.string(), info: z.string() }).optional(),
  query: z
    .object({
      geosearch: z.array(z.object({ pageid: z.number(), title: z.string(), dist: z.number() })).optional(),
      pages: z
        .array(z.object({ pageid: z.number().optional(), title: z.string(), missing: z.boolean().optional(), imageinfo: z.array(imageInfoSchema).optional() }))
        .optional(),
    })
    .optional(),
});
type ImageInfo = z.infer<typeof imageInfoSchema>;

/** One Commons API call, with a polite delay and backoff on rate limits and lag. */
async function commons(params: Record<string, string>): Promise<z.infer<typeof responseSchema>> {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...params })}`;
  for (let attempt = 0; ; attempt++) {
    await sleep(DELAY_MS);
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    const body = res.ok ? responseSchema.parse(await res.json()) : null;
    const limited = res.status === 429 || res.status === 503 || body?.error?.code === "maxlag" || body?.error?.code === "ratelimited";
    if (limited && attempt < 5) {
      const wait = Number(res.headers.get("retry-after")) * 1000 || 2 ** attempt * 2000;
      console.warn(`  rate-limited, waiting ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    if (!body) throw new Error(`Commons API ${res.status} for ${url}`);
    if (body.error) throw new Error(`Commons API ${body.error.code}: ${body.error.info}`);
    return body;
  }
}

const meta = (info: ImageInfo, key: string) => String(info.extmetadata?.[key]?.value ?? "").trim();
const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const fileTitle = (title: string) => title.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ");

/** imageinfo for up to 50 titles at once, keyed by title. */
async function imageInfo(titles: string[], thumbWidth: number): Promise<Map<string, ImageInfo>> {
  const out = new Map<string, ImageInfo>();
  for (let i = 0; i < titles.length; i += 50) {
    const body = await commons({
      action: "query",
      prop: "imageinfo",
      iiprop: "url|size|mime|extmetadata",
      iiurlwidth: String(thumbWidth),
      iiextmetadatafilter: "License|LicenseShortName|LicenseUrl|Artist|Credit|ObjectName",
      titles: titles.slice(i, i + 50).join("|"),
    });
    for (const page of body.query?.pages ?? []) {
      const info = page.imageinfo?.[0];
      if (info) out.set(page.title, info);
    }
  }
  return out;
}

/** Why a photo can't be used, or null when it can. */
function rejectReason(info: ImageInfo): string | null {
  if (info.mime !== "image/jpeg" && info.mime !== "image/png" && info.mime !== "image/webp") return "not a photo";
  if (!isOpenPhotoLicence(meta(info, "License"))) return "licence";
  if (info.width < MIN_WIDTH) return "too small";
  if (info.width <= info.height) return "not landscape";
  return null;
}

function attribution(title: string, info: ImageInfo) {
  const licenceUrl = meta(info, "LicenseUrl");
  return {
    title: stripHtml(meta(info, "ObjectName")) || fileTitle(title),
    author: stripHtml(meta(info, "Artist")) || stripHtml(meta(info, "Credit")) || "Unknown author",
    licence: meta(info, "LicenseShortName") || meta(info, "License"),
    ...(licenceUrl ? { licenceUrl: licenceUrl.replace(/^\/\//, "https://") } : {}),
    sourceUrl: info.descriptionurl,
  };
}

// ---- Step 1: find candidates and write the picker ----

/** SAMPLE_POINTS points spread evenly along the trail by distance, start and end included. */
function samplePoints(trail: Trail): Position[] {
  const points = trail.lines.flat();
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) cumulative.push((cumulative[i - 1] ?? 0) + distanceM(points[i - 1] as Position, points[i] as Position));
  const total = cumulative.at(-1) ?? 0;
  return Array.from({ length: SAMPLE_POINTS }, (_, k) => {
    const target = (total * k) / (SAMPLE_POINTS - 1);
    const i = cumulative.findIndex((d) => d >= target);
    return points[i === -1 ? points.length - 1 : i] as Position;
  });
}

/** commonsTitle is the "File:…" page name used in picks; title is the human-readable one. */
const candidateSchema = z.object({
  commonsTitle: z.string(),
  thumb: z.url(),
  width: z.number(),
  height: z.number(),
  distM: z.number(),
  title: z.string(),
  author: z.string(),
  licence: z.string(),
  licenceUrl: z.string().optional(),
  sourceUrl: z.url(),
});
type Candidate = z.infer<typeof candidateSchema>;
const cacheSchema = z.record(z.string(), z.array(candidateSchema));

async function findCandidates(trail: Trail): Promise<Candidate[]> {
  const nearest = new Map<string, number>();
  for (const [lon, lat] of samplePoints(trail)) {
    const body = await commons({ action: "query", list: "geosearch", gscoord: `${lat}|${lon}`, gsradius: String(RADIUS_M), gsnamespace: "6", gslimit: "100" });
    for (const hit of body.query?.geosearch ?? []) nearest.set(hit.title, Math.min(hit.dist, nearest.get(hit.title) ?? Number.POSITIVE_INFINITY));
  }
  const infos = await imageInfo([...nearest.keys()], 330);
  const out: Candidate[] = [];
  const rejected: Record<string, number> = {};
  for (const [title, info] of infos) {
    const why = rejectReason(info);
    if (why) {
      rejected[why] = (rejected[why] ?? 0) + 1;
      continue;
    }
    out.push({ commonsTitle: title, thumb: info.thumburl ?? info.url, width: info.width, height: info.height, distM: Math.round(nearest.get(title) ?? 0), ...attribution(title, info) });
  }
  console.log(`  ${nearest.size} nearby, ${out.length} usable`, rejected);
  return out.sort((a, b) => a.distM - b.distM);
}

/** Small SVG of the route, north up, for the picker. */
function routeSvg(trail: Trail): string {
  const [w, s, e, n] = trail.bbox;
  const midLat = ((s + n) / 2) * (Math.PI / 180);
  const spanX = (e - w) * Math.cos(midLat) || 1e-6;
  const spanY = n - s || 1e-6;
  const scale = 100 / Math.max(spanX, spanY);
  const paths = trail.lines
    .map((line) => line.map(([x, y]) => `${(((x - w) * Math.cos(midLat)) * scale).toFixed(1)},${((n - y) * scale).toFixed(1)}`).join(" "))
    .map((pts) => `<polyline points="${pts}" fill="none" stroke="#b45309" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`)
    .join("");
  return `<svg viewBox="-4 -4 108 108" width="96" height="96" role="img" aria-label="Route of ${escapeHtml(trail.name)}">${paths}</svg>`;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function pickerHtml(rows: { trail: Trail; candidates: Candidate[] }[]): string {
  const body = rows
    .map(({ trail, candidates }) => {
      const cards = candidates
        .map(
          (c) => `<label class="card"><input type="checkbox" data-slug="${trail.slug}" value="${escapeHtml(c.commonsTitle)}"><span class="order"></span>
<img src="${escapeHtml(c.thumb)}" alt="${escapeHtml(c.title)}" loading="lazy">
<span class="meta"><a href="${escapeHtml(c.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(c.title)}</a><br>${escapeHtml(c.author)} · ${escapeHtml(c.licence)} · ${c.width}×${c.height} · ${c.distM} m away</span></label>`,
        )
        .join("\n");
      return `<section><header>${routeSvg(trail)}<div><h2>${escapeHtml(trail.name)}</h2><p>${trail.slug} · ${(trail.lengthM / 1000).toFixed(1)} km · ${candidates.length} candidates</p></div></header><div class="cards">${cards}</div></section>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Trail photo picker</title>
<style>
body{font:14px/1.4 system-ui,sans-serif;margin:0 16px 96px;color:#1c1917;background:#fafaf9}
h1{font-size:20px}h2{font-size:16px;margin:0}header{display:flex;gap:12px;align-items:center;margin-bottom:8px}header p{margin:2px 0;color:#57534e}
header svg{background:#fff;border:1px solid #e7e5e4;border-radius:6px;flex:none}
section{border-top:1px solid #d6d3d1;padding:16px 0}.cards{display:flex;flex-wrap:wrap;gap:10px}
.card{position:relative;width:240px;background:#fff;border:2px solid #e7e5e4;border-radius:8px;overflow:hidden;cursor:pointer}
.card:has(input:checked){border-color:#b45309;box-shadow:0 0 0 2px #fcd34d}.card img{display:block;width:100%;height:150px;object-fit:cover}
.card input{position:absolute;top:8px;left:8px;width:20px;height:20px}.order{position:absolute;top:6px;right:8px;font:700 20px system-ui;color:#fff;text-shadow:0 0 4px #000}
.meta{display:block;padding:6px 8px;font-size:12px;color:#44403c;word-break:break-word}
.bar{position:fixed;left:0;right:0;bottom:0;padding:12px 16px;background:#1c1917;color:#fff;display:flex;gap:12px;align-items:center}
.bar button{font:600 14px system-ui;padding:8px 14px;border:0;border-radius:6px;background:#fcd34d;cursor:pointer}
</style></head><body>
<h1>Trail photo picker</h1>
<p>Tick up to ${MAX_PICKS} photos per trail that really show the trail (the first one ticked is the cover). Then copy the picks, save them to a file and run <code>pnpm data:photos --apply &lt;file&gt;</code>.</p>
${body}
<div class="bar"><button type="button" id="copy">Copy picks</button><span id="status" role="status">0 trails picked</span></div>
<script>
const picks = {};
const status = document.getElementById("status");
function refresh() {
  for (const box of document.querySelectorAll("input[type=checkbox]")) {
    const list = picks[box.dataset.slug] || [];
    const i = list.indexOf(box.value);
    box.checked = i !== -1;
    box.parentElement.querySelector(".order").textContent = i === -1 ? "" : String(i + 1);
  }
  status.textContent = \`\${Object.keys(picks).length} trails picked\`;
}
document.addEventListener("change", (e) => {
  const box = e.target;
  if (!box.dataset?.slug) return;
  picks[box.dataset.slug] ??= [];
  const list = picks[box.dataset.slug];
  if (box.checked && list.length >= ${MAX_PICKS}) { status.textContent = "At most ${MAX_PICKS} per trail"; box.checked = false; return; }
  if (box.checked) list.push(box.value); else list.splice(list.indexOf(box.value), 1);
  if (!list.length) delete picks[box.dataset.slug];
  refresh();
});
document.getElementById("copy").addEventListener("click", async () => {
  const json = JSON.stringify(picks, null, 2);
  try { await navigator.clipboard.writeText(json); status.textContent = \`Copied picks for \${Object.keys(picks).length} trails\`; }
  catch { prompt("Copy the picks:", json); }
});
</script></body></html>
`;
}

async function writePicker(trails: Trail[], fresh: boolean) {
  mkdirSync(".data", { recursive: true });
  const cache = !fresh && existsSync(CACHE) ? cacheSchema.parse(JSON.parse(readFileSync(CACHE, "utf8"))) : {};
  for (const [i, trail] of trails.entries()) {
    if (cache[trail.slug]) continue;
    console.log(`${i + 1}/${trails.length} ${trail.name}`);
    cache[trail.slug] = await findCandidates(trail);
    writeFileSync(CACHE, JSON.stringify(cache));
  }
  const rows = trails.map((trail) => ({ trail, candidates: cache[trail.slug] ?? [] })).filter((r) => r.candidates.length);
  writeFileSync(PICKER, pickerHtml(rows));
  console.log(`\nWrote ${PICKER}: ${rows.length} of ${trails.length} trails have candidates.`);
  console.log("View it with: python3 -m http.server 4174 --directory .data, then open http://localhost:4174/photo-picker.html");
}

// ---- Step 2: apply picks ----
const picksSchema = z.record(z.string(), z.array(z.string().startsWith("File:")).max(MAX_PICKS));

/**
 * Resizes to OUT_WIDTH px JPEG, lowering quality until it's about TARGET_BYTES. sips quality runs
 * high: most photos land near 80 KB at 40-50; very detailed ones (gravel, leaves) stay larger even
 * at the floor of 25, and are kept with a warning rather than made blotchy.
 */
function toJpeg(input: string, output: string) {
  for (const quality of [70, 60, 50, 40, 32, 25]) {
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", String(quality), "--resampleWidth", String(OUT_WIDTH), input, "--out", output], { stdio: "ignore" });
    if (statSync(output).size <= TARGET_BYTES) return;
  }
  console.warn(`  ${output} is ${(statSync(output).size / 1024).toFixed(0)} KB at the lowest quality; consider another photo`);
}

async function applyPicks(path: string, trails: Trail[]) {
  const picks = picksSchema.parse(JSON.parse(readFileSync(path, "utf8")));
  const slugs = new Set(trails.map((t) => t.slug));
  const unknown = Object.keys(picks).filter((slug) => !slugs.has(slug));
  if (unknown.length) throw new Error(`Unknown trail slugs in ${path}: ${unknown.join(", ")}`);

  const photos = trailPhotosSchema.parse(existsSync(PHOTOS_JSON) ? JSON.parse(readFileSync(PHOTOS_JSON, "utf8")) : {});
  const infos = await imageInfo(Object.values(picks).flat(), 1280);
  const tmp = ".data/photo-downloads";
  mkdirSync(tmp, { recursive: true });
  mkdirSync(PHOTOS_DIR, { recursive: true });

  for (const [slug, titles] of Object.entries(picks)) {
    for (const old of readdirSync(PHOTOS_DIR).filter((f) => new RegExp(`^${slug}-\\d\\.jpg$`).test(f))) rmSync(`${PHOTOS_DIR}/${old}`);
    const list: TrailPhoto[] = [];
    for (const [i, title] of titles.entries()) {
      const info = infos.get(title);
      if (!info) throw new Error(`${title} not found on Commons`);
      const why = rejectReason(info);
      if (why) throw new Error(`${title} can't be used: ${why}`);
      await sleep(DELAY_MS);
      const res = await fetch(info.thumburl ?? info.url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error(`Download of ${title} failed: ${res.status}`);
      const raw = `${tmp}/${slug}-${i + 1}`;
      writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
      const name = `${slug}-${i + 1}.jpg`;
      toJpeg(raw, `${PHOTOS_DIR}/${name}`);
      list.push({ file: `/photos/${name}`, ...attribution(title, info) });
      console.log(`${name}  ${(statSync(`${PHOTOS_DIR}/${name}`).size / 1024).toFixed(0)} KB  ${title}`);
    }
    if (list.length) photos[slug] = list;
    else delete photos[slug];
  }
  rmSync(tmp, { recursive: true, force: true });
  const sorted = Object.fromEntries(Object.entries(trailPhotosSchema.parse(photos)).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(PHOTOS_JSON, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`Wrote ${PHOTOS_JSON} (${Object.keys(sorted).length} trails with photos).`);
}

// ---- Main ----
const { trails } = trailFileSchema.parse(JSON.parse(readFileSync(TRAILS, "utf8")));
const applyAt = process.argv.indexOf("--apply");
const picksPath = process.argv[applyAt + 1];
if (applyAt !== -1 && !picksPath) throw new Error("Usage: pnpm data:photos --apply <picks.json>");
(picksPath && applyAt !== -1 ? applyPicks(picksPath, trails) : writePicker(trails, process.argv.includes("--fresh"))).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
