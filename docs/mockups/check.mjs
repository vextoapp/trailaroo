// Mock-up checks. Run: node docs/mockups/check.mjs
// No dependencies. Exits 1 if any check fails.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const failures = [];
const fail = (check, msg) => failures.push(`${check}: ${msg}`);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = walk(root).filter((f) => /\.(html|css|js|svg)$/.test(f));
const htmlFiles = files.filter((f) => f.endsWith(".html"));
const read = (f) => readFileSync(f, "utf8");
const rel = (f) => relative(root, f);

// ---------- contrast ----------
function luminance(hex) {
  const n = hex.replace("#", "");
  const full = n.length === 3 ? [...n].map((c) => c + c).join("") : n;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const tokensPath = join(root, "tokens.css");
const colourFiles = [tokensPath, join(root, "looks.html")];
if (!existsSync(tokensPath)) {
  fail("contrast", "tokens.css is missing");
} else {
  const css = colourFiles.filter(existsSync).map(read).join("\n");
  const blocks = [...css.matchAll(/(?:\[data-look="([\w-]+)"\])?\[data-theme="(dark|light)"\]\s*\{([^}]*)\}/g)];
  if (blocks.length === 0) fail("contrast", "no [data-theme] colour blocks found in tokens.css");
  const pairs = [
    ["text", "bg", 4.5], ["text", "surface", 4.5], ["text", "surface-2", 4.5],
    ["text-muted", "bg", 4.5], ["text-muted", "surface", 4.5],
    ["accent-contrast", "accent", 4.5], ["accent", "bg", 3], ["accent", "surface", 3],
    ["border", "bg", 3], ["border", "surface", 3], ["focus", "bg", 3], ["focus", "surface", 3],
    ["danger", "surface", 4.5], ["warn", "surface", 4.5], ["ok", "surface", 4.5],
  ];
  for (const [, look = "app", theme, body] of blocks) {
    const hexes = [...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]+)\s*;/g)];
    for (const [, k, hex] of hexes) if (![4, 7].includes(hex.length)) fail("contrast", `${look}/${theme}: --${k} is ${hex}; use 3- or 6-digit hex`);
    const v = Object.fromEntries(hexes.filter((m) => [4, 7].includes(m[2].length)).map((m) => [m[1], m[2]]));
    const extra = Object.keys(v).filter((k) => /^(diff|fam)-/.test(k)).flatMap((k) => [[k, "bg", 3], [k, "surface", 3]]);
    for (const [fg, bg, min] of [...pairs, ...extra]) {
      if (!v[fg] || !v[bg]) { fail("contrast", `${look}/${theme}: --${fg} or --${bg} missing`); continue; }
      const r = contrast(v[fg], v[bg]);
      if (r < min) fail("contrast", `${look}/${theme}: --${fg} on --${bg} is ${r.toFixed(2)}:1, needs ${min}:1`);
    }
  }
}

// ---------- no-external ----------
const forbidden = [
  [/<script[^>]+src=["']https?:/i, "external script"],
  [/<link[^>]+href=["']https?:/i, "external stylesheet or font"],
  [/@import/i, "@import"],
  [/url\(\s*["']?https?:/i, "external url() in CSS"],
  [/<(iframe|img|source|video|audio|embed|object)[^>]+(src|data)=["']https?:/i, "external media"],
  [/\bfetch\(\s*["']https?:/i, "external fetch"],
];
for (const f of files.filter((f) => !f.endsWith("check.mjs"))) {
  const s = read(f);
  for (const [re, what] of forbidden) if (re.test(s)) fail("no-external", `${rel(f)} has an ${what}`);
}

// ---------- links ----------
for (const f of files.filter((f) => /\.(html|css)$/.test(f))) {
  const s = read(f);
  const refs = [...s.matchAll(/(?:href|src)=["']([^"']+)["']/g), ...s.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(https?:|#|mailto:|tel:|data:|javascript:)/.test(ref)) continue;
    const path = ref.split(/[?#]/)[0];
    if (!path) continue;
    if (!existsSync(join(dirname(f), path))) fail("links", `${rel(f)} links to missing ${ref}`);
  }
}

// ---------- maps have a text version ----------
for (const f of htmlFiles) {
  const s = read(f);
  const maps = [...s.matchAll(/<[a-z]+[^>]*class="(?:[^"]*\s)?map(?:\s[^"]*)?"[^>]*>/g)].map((m) => m[0]);
  for (const tag of maps) if (!/aria-label=/.test(tag)) fail("maps", `${rel(f)}: a .map has no aria-label`);
  for (const tag of maps) if (/role="img"/.test(tag)) fail("maps", `${rel(f)}: a .map container has role="img", which hides its buttons from screen readers; use role="region"`);
  if (maps.length && !/data-text-version/.test(s)) fail("maps", `${rel(f)}: has a map but no [data-text-version]`);
}

// ---------- app name only from config ----------
const APP_NAME = read(join(root, "mockups.js")).match(/APP_NAME = "([^"]+)"/)?.[1];
if (!APP_NAME) fail("app-name", "mockups.js has no APP_NAME");
for (const f of htmlFiles) {
  const s = read(f);
  if (s.includes(APP_NAME)) fail("app-name", `${rel(f)} hard-codes the app name; use data-app-name`);
}

// ---------- every alert shows its source and time (CLAUDE.md > Non-negotiables) ----------
for (const f of htmlFiles) {
  const s = read(f);
  for (const m of s.matchAll(/<([a-z]+)\b[^>]*\bdata-alert\b[^>]*>/g)) {
    const tag = m[1];
    const re = new RegExp(`<${tag}\\b|</${tag}>`, "g");
    re.lastIndex = m.index + m[0].length;
    let depth = 1, end = s.length;
    for (let t; depth && (t = re.exec(s)); ) { depth += t[0][1] === "/" ? -1 : 1; if (!depth) end = t.index; }
    const inner = s.slice(m.index, end);
    if (!/<span class="from">[^<]*[A-Za-z][^<]*<\/span>/.test(inner)) fail("alerts", `${rel(f)}: a [data-alert] has no <span class="from"> naming its source`);
    if (!/<time\b[^>]*>[^<]*\d[^<]*<\/time>/.test(inner)) fail("alerts", `${rel(f)}: a [data-alert] has no <time> saying when it was checked`);
  }
  // Alert badges built in script (cardHtml's t.badge): each sample needs a source and a check time.
  for (const m of s.matchAll(/\{[^{}]*(?<=[{,]\s*)(?:state|severity|text|from|checked):[^{}]*\}/g)) {
    if (!/\bfrom:\s*"[^"]*[A-Za-z]/.test(m[0]) || !/\bchecked:\s*"[^"]*\d/.test(m[0])) fail("alerts", `${rel(f)}: an alert badge has no from (source) or checked (time)`);
  }
}

// ---------- screens exist and share the base files ----------
const screens = ["home", "explore", "trail", "record", "saved", "activity", "profile"];
if (existsSync(join(root, "index.html"))) {
  for (const name of screens) {
    const p = join(root, `${name}.html`);
    if (!existsSync(p)) { fail("screens", `${name}.html is missing`); continue; }
    const s = read(p);
    for (const base of ["tokens.css", "mockups.css", "mockups.js"]) if (!s.includes(base)) fail("screens", `${name}.html does not load ${base}`);
  }
}

if (failures.length) {
  console.error(failures.map((l) => `FAIL ${l}`).join("\n"));
  console.error(`\n${failures.length} problem(s).`);
  process.exit(1);
}
console.log(`OK contrast, no-external, links, maps, app-name, alerts, screens (${files.length} files)`);
