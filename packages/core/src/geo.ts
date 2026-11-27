/** Geometry helpers. Coordinates are [lon, lat] in EPSG:4326; distances in metres. */
export type Position = [lon: number, lat: number];

const EARTH_RADIUS_M = 6_371_008.8;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance between two points, in metres. */
export function distanceM(a: Position, b: Position): number {
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Length of a line, in metres. */
export function lineLengthM(line: Position[]): number {
  let total = 0;
  for (let i = 1; i < line.length; i++) total += distanceM(line[i - 1] as Position, line[i] as Position);
  return total;
}

/** Length of a multi-line, in metres. */
export function multiLineLengthM(lines: Position[][]): number {
  return lines.reduce((sum, l) => sum + lineLengthM(l), 0);
}

/** Bounding box [west, south, east, north] of a multi-line. */
export function bbox(lines: Position[][]): [number, number, number, number] {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const line of lines) for (const [x, y] of line) {
    if (x < w) w = x;
    if (x > e) e = x;
    if (y < s) s = y;
    if (y > n) n = y;
  }
  return [w, s, e, n];
}

/**
 * Douglas–Peucker simplification with a tolerance in metres, for display only.
 * Uses a local equirectangular projection, which is accurate enough at trail scale.
 */
export function simplify(line: Position[], toleranceM: number): Position[] {
  if (line.length <= 2) return line;
  const lat0 = rad(line[0]?.[1] ?? 0);
  const xy = line.map(([lon, lat]) => [rad(lon) * Math.cos(lat0) * EARTH_RADIUS_M, rad(lat) * EARTH_RADIUS_M] as const);
  const keep = new Uint8Array(line.length);
  keep[0] = keep[line.length - 1] = 1;
  const stack: [number, number][] = [[0, line.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop() as [number, number];
    const [ax, ay] = xy[i] as readonly [number, number];
    const [bx, by] = xy[j] as readonly [number, number];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let maxD = 0, maxK = -1;
    for (let k = i + 1; k < j; k++) {
      const [px, py] = xy[k] as readonly [number, number];
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d > maxD) { maxD = d; maxK = k; }
    }
    if (maxD > toleranceM && maxK > 0) {
      keep[maxK] = 1;
      stack.push([i, maxK], [maxK, j]);
    }
  }
  return line.filter((_, k) => keep[k]);
}

/**
 * Join way segments into as few continuous lines as possible, flipping segments
 * where needed. OSM route relations list ways in any direction and sometimes out of order.
 */
export function stitch(segments: Position[][]): Position[][] {
  const same = (a: Position | undefined, b: Position | undefined) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
  const rest = segments.filter((s) => s.length >= 2).map((s) => [...s]);
  const out: Position[][] = [];
  while (rest.length) {
    let line = rest.shift() as Position[];
    let grew = true;
    while (grew) {
      grew = false;
      for (let i = 0; i < rest.length; i++) {
        const s = rest[i] as Position[];
        const head = line[0], tail = line[line.length - 1];
        if (same(tail, s[0])) line = [...line, ...s.slice(1)];
        else if (same(tail, s[s.length - 1])) line = [...line, ...s.slice(0, -1).reverse()];
        else if (same(head, s[s.length - 1])) line = [...s.slice(0, -1), ...line];
        else if (same(head, s[0])) line = [...s.slice(1).reverse(), ...line];
        else continue;
        rest.splice(i, 1);
        grew = true;
        break;
      }
    }
    out.push(line);
  }
  return out;
}

/**
 * Put the pieces stitch() leaves (where OSM has gaps) into walking order, flipping any stored
 * backwards, so the elevation profile and the map scrub follow the route. Starts at the loosest
 * end (furthest from any other piece), then always steps to the nearest unused piece end. The
 * longest piece keeps its mapped direction, so the route isn't turned around (a summit walk stays uphill).
 */
export function orderPieces(lines: Position[][]): Position[][] {
  if (lines.length < 2) return lines;
  const ends = (l: Position[]) => [l[0] as Position, l[l.length - 1] as Position];
  const gap = (p: Position, i: number) => Math.min(...lines.filter((_, j) => j !== i).flatMap((l) => ends(l).map((q) => distanceM(p, q))));
  let start = 0, flipStart = false, loosest = -1;
  for (const [i, l] of lines.entries()) for (const [k, p] of ends(l).entries()) {
    const g = gap(p, i);
    if (g > loosest) { loosest = g; start = i; flipStart = k === 1; }
  }
  const rest = lines.filter((_, i) => i !== start);
  const first = lines[start] as Position[];
  const out = [flipStart ? [...first].reverse() : first];
  while (rest.length) {
    const tail = out[out.length - 1]?.at(-1) as Position;
    let best = 0, flip = false, nearest = Infinity;
    for (const [i, l] of rest.entries()) for (const [k, p] of ends(l).entries()) {
      const d = distanceM(tail, p);
      if (d < nearest) { nearest = d; best = i; flip = k === 1; }
    }
    const next = rest.splice(best, 1)[0] as Position[];
    out.push(flip ? [...next].reverse() : next);
  }
  const longest = lines.reduce((a, b) => (b.length > a.length ? b : a));
  return out.includes(longest) ? out : out.reverse().map((l) => [...l].reverse());
}

/**
 * The unmapped distance in a route split into pieces: the shortest straight links that would join
 * every piece, in metres. Pieces that share a point, or where one ends on the other (a junction), count as joined.
 */
export function gapsM(lines: Position[][]): number {
  const toPiece = (p: Position, line: Position[]) => Math.min(...line.map((q) => distanceM(p, q)));
  const key = ([x, y]: Position) => `${x},${y}`;
  const link = (a: Position[], b: Position[]) => {
    const bPoints = new Set(b.map(key));
    if (a.some((p) => bPoints.has(key(p)))) return 0; // they cross or touch at a shared OSM node
    return Math.min(toPiece(a[0] as Position, b), toPiece(a.at(-1) as Position, b), toPiece(b[0] as Position, a), toPiece(b.at(-1) as Position, a));
  };
  // Prim's minimum spanning tree over the pieces.
  const joined = lines.slice(0, 1);
  const rest = lines.slice(1);
  let total = 0;
  while (rest.length) {
    let best = Infinity, pick = 0;
    for (const [k, b] of rest.entries()) for (const a of joined) {
      const d = link(a, b);
      if (d < best) { best = d; pick = k; }
    }
    joined.push(...rest.splice(pick, 1));
    total += best;
  }
  return total;
}

/** Ray-casting test: is the point inside a polygon ring? */
function inRing([x, y]: Position, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as Position;
    const [xj, yj] = ring[j] as Position;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Is the point inside a GeoJSON MultiPolygon (outer rings minus their holes)? */
export function inMultiPolygon(point: Position, polygons: Position[][][]): boolean {
  return polygons.some(([outer, ...holes]) => !!outer && inRing(point, outer) && !holes.some((h) => inRing(point, h)));
}

/** The point `fraction` (0–1) of the way along a multi-line, measured by distance. */
export function pointAlong(lines: Position[][], fraction: number): Position | undefined {
  const total = multiLineLengthM(lines);
  let left = Math.min(1, Math.max(0, fraction)) * total;
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1] as Position, b = line[i] as Position;
      const seg = distanceM(a, b);
      if (left <= seg) {
        const f = seg ? left / seg : 0;
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      }
      left -= seg;
    }
  }
  return lines.at(-1)?.at(-1);
}
