import type { Family } from "./trail";

export type Difficulty = "easy" | "moderate" | "hard" | "veryhard";
const ORDER: Difficulty[] = ["easy", "moderate", "hard", "veryhard"];
const atLeast = (d: Difficulty, floor: Difficulty) => (ORDER.indexOf(d) < ORDER.indexOf(floor) ? floor : d);

/**
 * Difficulty per activity family (SPEC > Activities). Walks use "effort kilometres": distance plus
 * 0.8 km for every 100 m of climb (Naismith's rule), raised by the OSM sac_scale where tagged.
 * Bike trails use mtb:scale where tagged, otherwise distance and climb.
 */
export function difficulty(family: Family, lengthM: number, gainM: number, tags: { sac_scale?: string; mtb_scale?: string } = {}): Difficulty {
  const km = lengthM / 1000;
  if (family === "bike") {
    const scale = Number.parseInt(tags.mtb_scale ?? "", 10);
    if (Number.isFinite(scale)) {
      if (scale <= 1) return "easy";
      if (scale === 2) return "moderate";
      if (scale === 3) return "hard";
      return "veryhard";
    }
    if (km < 10 && gainM < 200) return "easy";
    if (km < 30 && gainM < 600) return "moderate";
    if (km < 60 && gainM < 1200) return "hard";
    return "veryhard";
  }
  const effortKm = km + (gainM / 100) * 0.8;
  let d: Difficulty = "veryhard";
  if (effortKm < 6 && gainM < 150) d = "easy";
  else if (effortKm < 14) d = "moderate";
  else if (effortKm < 25) d = "hard";
  const sac = tags.sac_scale ?? "";
  if (sac === "mountain_hiking" || sac === "demanding_mountain_hiking") d = atLeast(d, "hard");
  if (sac.startsWith("alpine") || sac === "difficult_alpine_hiking") d = "veryhard";
  return d;
}

/** Estimated moving time in seconds. Walks: 4.5 km/h plus 10 min per 100 m up. Bikes: 12 km/h plus 6 min per 100 m up. */
export function estimateTimeS(family: Family, lengthM: number, gainM: number): number {
  const hours = family === "bike" ? lengthM / 12_000 + gainM / 1000 : lengthM / 4500 + gainM / 600;
  return Math.round(hours * 3600);
}
