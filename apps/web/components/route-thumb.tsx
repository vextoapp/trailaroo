import { type Position, simplify, type Trail } from "@trailaroo/core";

const W = 800, H = 450, PAD = 40;

/** A small, map-free drawing of the real route for cards. Server-rendered SVG, no tiles. */
export function RouteThumb({ trail }: { trail: Pick<Trail, "lines" | "bbox"> }) {
  const [w, s, e, n] = trail.bbox;
  const kx = Math.cos(((s + n) / 2) * (Math.PI / 180));
  const spanX = Math.max((e - w) * kx, 1e-6), spanY = Math.max(n - s, 1e-6);
  const scale = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY);
  const ox = (W - spanX * scale) / 2, oy = (H - spanY * scale) / 2;
  const px = ([lon, lat]: Position): [string, string] => [(ox + (lon - w) * kx * scale).toFixed(1), (oy + (n - lat) * scale).toFixed(1)];
  // Simplify to about 2 px on screen so thumbnails stay light.
  const tolM = (2 / scale) * 111_320;
  const d = trail.lines.map((l) => `M${simplify(l, tolM).map((p) => px(p).join(" ")).join("L")}`).join("");
  const start = trail.lines[0]?.[0];
  const pin = start && px(start);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <use href="/icons.svg#terrain" className="terrain" y="-80" />
      <path className="route-casing" d={d} />
      <path className="route" d={d} />
      {pin && <circle className="pin-start" cx={pin[0]} cy={pin[1]} r="13" />}
    </svg>
  );
}
