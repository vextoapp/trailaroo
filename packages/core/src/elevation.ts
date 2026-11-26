import { distanceM, type Position } from "./geo";

/** Points every `stepM` metres along a line, always including both ends. */
export function sampleLine(line: Position[], stepM: number): { at: Position; distM: number }[] {
  const out: { at: Position; distM: number }[] = [];
  if (!line.length) return out;
  out.push({ at: line[0] as Position, distM: 0 });
  let travelled = 0, nextAt = stepM;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1] as Position, b = line[i] as Position;
    const seg = distanceM(a, b);
    while (seg > 0 && nextAt <= travelled + seg) {
      const f = (nextAt - travelled) / seg;
      out.push({ at: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], distM: nextAt });
      nextAt += stepM;
    }
    travelled += seg;
  }
  const last = line[line.length - 1] as Position;
  if ((out.at(-1)?.distM ?? 0) < travelled) out.push({ at: last, distM: travelled });
  return out;
}

/**
 * Total climb and descent with a hysteresis threshold, so terrain-model noise of a few metres
 * isn't counted as climbing. Only changes larger than `thresholdM` from the last turning point count.
 */
export function climb(elevations: number[], thresholdM = 5): { gainM: number; lossM: number } {
  let gainM = 0, lossM = 0;
  let ref = elevations[0];
  if (ref === undefined) return { gainM, lossM };
  for (const e of elevations) {
    if (e - ref >= thresholdM) { gainM += e - ref; ref = e; }
    else if (ref - e >= thresholdM) { lossM += ref - e; ref = e; }
  }
  // Count what's left since the last turning point, so a slow climb's final few metres aren't lost.
  const end = elevations.at(-1) as number;
  if (end > ref) gainM += end - ref;
  else lossM += ref - end;
  return { gainM: Math.round(gainM), lossM: Math.round(lossM) };
}

/** Resample elevations to `n` evenly spaced points along the total distance (for the profile chart). */
export function resampleProfile(samples: { distM: number; elevM: number }[], n = 120): number[] {
  if (samples.length === 0) return [];
  const total = samples.at(-1)?.distM ?? 0;
  const out: number[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const d = (total * i) / (n - 1);
    while (j < samples.length - 2 && (samples[j + 1]?.distM ?? 0) < d) j++;
    const a = samples[j] as { distM: number; elevM: number }, b = samples[Math.min(j + 1, samples.length - 1)] as { distM: number; elevM: number };
    const f = b.distM > a.distM ? Math.min(1, Math.max(0, (d - a.distM) / (b.distM - a.distM))) : 0;
    out.push(Math.round(a.elevM + (b.elevM - a.elevM) * f));
  }
  return out;
}

export type RouteType = "loop" | "one-way";

/**
 * A route is a loop when OSM says roundtrip=yes or its ends meet (within 300 m, since mapped loops
 * often start and finish at different corners of a car park); otherwise it's mapped one way.
 * Relations store their pieces in any order and with small gaps, so it's a loop when every piece end
 * has another end within 300 m.
 */
export function routeType(lines: Position[][], roundtrip?: string): RouteType {
  if (roundtrip === "yes") return "loop";
  if (roundtrip === "no") return "one-way";
  const ends = lines.flatMap((l) => [l[0], l.at(-1)]).filter((p): p is Position => !!p);
  const loose = ends.some((p, i) => !ends.some((q, j) => j !== i && distanceM(p, q) <= 300));
  return loose ? "one-way" : "loop";
}
