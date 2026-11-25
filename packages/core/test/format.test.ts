import { describe, expect, it } from "vitest";
import { formatDistance } from "../src/format";
import { t } from "../src/i18n";
import { slugify } from "../src/trail";

describe("formatDistance", () => {
  it("shows one decimal under 10 km", () => expect(formatDistance(8240)).toBe("8.2 km"));
  it("shows whole km from 10 km", () => expect(formatDistance(14_020)).toBe("14 km"));
  it("shows metres under 1 km, rounded to 10 m", () => expect(formatDistance(654)).toBe("650 m"));
  it("switches to km when metres round up to 1,000", () => expect(formatDistance(996)).toBe("1 km"));
  it("supports miles", () => expect(formatDistance(8046.72, { units: "imperial" })).toBe("5 mi"));
});

describe("t", () => {
  it("fills placeholders", () => expect(t("explore.count", { count: 48 })).toBe("48 trails"));
  it("leaves unknown placeholders visible", () => expect(t("explore.where")).toBe("Trails near {area}"));
});

describe("slugify", () => {
  it("makes a readable slug with the OSM id", () => expect(slugify("Mt Ainslie Summit Track", 123)).toBe("mt-ainslie-summit-track-123"));
  it("strips accents and symbols", () => expect(slugify("Côté & Co's Walk!", 9)).toBe("cote-and-co-s-walk-9"));
  it("falls back to the id", () => expect(slugify("!!!", 7)).toBe("7"));
});
