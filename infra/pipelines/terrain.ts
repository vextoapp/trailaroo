/**
 * Elevation from Mapterhorn terrain (https://mapterhorn.com, © Mapterhorn and its sources).
 * Reads only the zoom-12 tiles a route touches from Mapterhorn's public PMTiles by range request,
 * caches them in .data/terrain, and decodes Terrarium-encoded WebP with sharp. Pipeline only.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PMTiles } from "pmtiles";
import sharp from "sharp";
import type { Position } from "../../packages/core/src/geo";

const URL_PLANET = "https://download.mapterhorn.com/planet.pmtiles";
const Z = 12;
const CACHE = ".data/terrain";
mkdirSync(CACHE, { recursive: true });
const archive = new PMTiles(URL_PLANET);
type Tile = { size: number; data: Buffer; channels: number };
const tiles = new Map<string, Promise<Tile | null>>();

async function loadTile(x: number, y: number): Promise<Tile | null> {
  const file = `${CACHE}/${Z}-${x}-${y}.webp`;
  let bytes: Buffer;
  if (existsSync(file)) bytes = readFileSync(file);
  else {
    const res = await archive.getZxy(Z, x, y);
    if (!res) return null;
    bytes = Buffer.from(res.data);
    writeFileSync(file, bytes);
  }
  const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
  return { size: info.width, data, channels: info.channels };
}

const tile = (x: number, y: number) => {
  const key = `${x}/${y}`;
  let t = tiles.get(key);
  if (!t) { t = loadTile(x, y); tiles.set(key, t); }
  return t;
};

/** Terrarium: metres = R * 256 + G + B / 256 - 32768. */
function pixel(t: Tile, px: number, py: number): number {
  const i = (Math.min(t.size - 1, Math.max(0, py)) * t.size + Math.min(t.size - 1, Math.max(0, px))) * t.channels;
  return (t.data[i] as number) * 256 + (t.data[i + 1] as number) + (t.data[i + 2] as number) / 256 - 32768;
}

/** Elevation in metres at a point, bilinearly interpolated. Null where there's no terrain tile. */
export async function elevationAt([lon, lat]: Position): Promise<number | null> {
  const n = 2 ** Z;
  const fx = ((lon + 180) / 360) * n;
  const s = Math.sin((lat * Math.PI) / 180);
  const fy = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n;
  const x = Math.floor(fx), y = Math.floor(fy);
  const t = await tile(x, y);
  if (!t) return null;
  const px = (fx - x) * t.size - 0.5, py = (fy - y) * t.size - 0.5;
  const x0 = Math.floor(px), y0 = Math.floor(py), dx = px - x0, dy = py - y0;
  const top = pixel(t, x0, y0) * (1 - dx) + pixel(t, x0 + 1, y0) * dx;
  const bottom = pixel(t, x0, y0 + 1) * (1 - dx) + pixel(t, x0 + 1, y0 + 1) * dx;
  return top * (1 - dy) + bottom * dy;
}
