import { DEFAULT_LOCALE } from "./config";

export type Units = "metric" | "imperial";

/** Format a distance in metres for display, e.g. "8.2 km", "650 m", "5.1 mi". */
export function formatDistance(metres: number, { locale = DEFAULT_LOCALE, units = "metric" as Units } = {}): string {
  if (units === "imperial") {
    const miles = metres / 1609.344;
    return new Intl.NumberFormat(locale, { style: "unit", unit: "mile", maximumFractionDigits: miles < 10 ? 1 : 0 }).format(miles);
  }
  const roundedM = Math.round(metres / 10) * 10;
  if (roundedM < 1000) {
    return new Intl.NumberFormat(locale, { style: "unit", unit: "meter", maximumFractionDigits: 0 }).format(roundedM);
  }
  const km = metres / 1000;
  return new Intl.NumberFormat(locale, { style: "unit", unit: "kilometer", maximumFractionDigits: km < 10 ? 1 : 0 }).format(km);
}
