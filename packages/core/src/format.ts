import { DEFAULT_LOCALE } from "./config";
import { t } from "./i18n";

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

/** Format a duration in seconds as an estimate, e.g. "2 h 15 min", "40 min". Rounded to 5 minutes. */
export function formatDuration(seconds: number): string {
  const mins = Math.max(5, Math.round(seconds / 300) * 5);
  const h = Math.floor(mins / 60), m = mins % 60;
  if (!h) return t("duration.m", { m });
  return m ? t("duration.hm", { h, m }) : t("duration.h", { h });
}

/** Format a climb in metres, e.g. "260 m". */
export function formatClimb(metres: number, { locale = DEFAULT_LOCALE } = {}): string {
  return new Intl.NumberFormat(locale, { style: "unit", unit: "meter", maximumFractionDigits: 0 }).format(Math.round(metres));
}
