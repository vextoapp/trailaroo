"use client";
import { formatClimb, formatDistance, type Position, pointAlong, t } from "@trailaroo/core";
import { type CSSProperties, useEffect, useMemo, useState } from "react";

const W = 600, H = 110, PAD = 6;
export const SCRUB_EVENT = "trail:scrub";

/**
 * The elevation profile. Drag (or use the arrow keys) along it and a dot follows the route on the
 * map (TrailMap listens for SCRUB_EVENT). The table below is the text version.
 */
export function ElevationProfile({ profile, lengthM, lines }: { profile: number[]; lengthM: number; lines: Position[][] }) {
  const [at, setAt] = useState(0);
  const lo = Math.min(...profile), hi = Math.max(...profile), span = Math.max(hi - lo, 20);
  const { line, area } = useMemo(() => {
    const xy = profile.map((e, i) => [(i / (profile.length - 1)) * W, H - PAD - ((e - lo) / span) * (H - 2 * PAD)]);
    const l = `M${xy.map(([x, y]) => `${x?.toFixed(1)} ${y?.toFixed(1)}`).join("L")}`;
    return { line: l, area: `${l}L${W} ${H}L0 ${H}Z` };
  }, [profile, lo, span]);
  const heightAt = (fraction: number) => profile[Math.round(fraction * (profile.length - 1))] ?? lo;
  const f = at / 1000;
  const elev = heightAt(f);
  const dist = formatDistance(f * lengthM);
  const readout = t("profile.readout", { distance: dist, elevation: formatClimb(elev) });

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(SCRUB_EVENT, { detail: at > 0 ? pointAlong(lines, f) : null }));
  }, [at, f, lines]);

  const rows = Array.from({ length: 11 }, (_, i) => i / 10);
  return (
    <div className="scrub-profile elevation" style={{ "--f": f } as CSSProperties}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <path className="area" d={area} />
        <path className="line" d={line} />
      </svg>
      <span className="scrub-cursor" />
      <input
        type="range" min={0} max={1000} value={at}
        onChange={(e) => setAt(e.target.valueAsNumber)}
        aria-label={t("profile.label")}
        aria-valuetext={readout}
      />
      <div className="elev-axis num" aria-hidden="true"><span>{formatClimb(lo)}–{formatClimb(hi)}</span><span>{formatDistance(lengthM)}</span></div>
      <span className="scrub-readout num" aria-hidden="true">{at > 0 ? readout : t("profile.hint")}</span>
      <details className="text-version">
        <summary>{t("profile.table")}</summary>
        <table>
          <thead><tr><th>{t("profile.distance")}</th><th>{t("profile.height")}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r}><td className="num">{formatDistance(r * lengthM)}</td><td className="num">{formatClimb(heightAt(r))}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
