import type { Position, Trail } from "@trailaroo/core";

const BOX = 100, PAD = 8;

/** The trail's real route, drawn to fit a square. Used for drawn covers when a trail has no photo. */
export function RouteSvg({ trail }: { trail: Pick<Trail, "lines" | "bbox"> }) {
  const [w, s, e, n] = trail.bbox;
  const kx = Math.cos(((s + n) / 2) * (Math.PI / 180));
  const spanX = Math.max((e - w) * kx, 1e-9), spanY = Math.max(n - s, 1e-9);
  const scale = (BOX - 2 * PAD) / Math.max(spanX, spanY);
  const ox = (BOX - spanX * scale) / 2, oy = (BOX - spanY * scale) / 2;
  const pt = ([lon, lat]: Position) => `${(ox + (lon - w) * kx * scale).toFixed(1)} ${(oy + (n - lat) * scale).toFixed(1)}`;
  // About 120 points per line is plenty at card size.
  const d = trail.lines.map((l) => { const step = Math.max(1, Math.floor(l.length / 120)); return `M${l.filter((_, i) => i % step === 0 || i === l.length - 1).map(pt).join("L")}`; }).join("");
  return (
    <svg viewBox={`0 0 ${BOX} ${BOX}`} aria-hidden="true">
      <path className="route-casing" d={d} />
      <path className="route" d={d} />
    </svg>
  );
}
