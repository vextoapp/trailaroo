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
