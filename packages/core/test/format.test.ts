import { describe, expect, it } from "vitest";
import { formatClimb, formatDistance, formatDuration } from "../src/format";
import { t } from "../src/i18n";
import { ACTIVE_REGION, REGIONS } from "../src/regions";
import { parkName, slugify } from "../src/trail";

describe("formatDistance", () => {
  it("shows one decimal under 10 km", () => expect(formatDistance(8240)).toBe("8.2 km"));
  it("shows whole km from 10 km", () => expect(formatDistance(14_020)).toBe("14 km"));
  it("shows metres under 1 km, rounded to 10 m", () => expect(formatDistance(654)).toBe("650 m"));
  it("switches to km when metres round up to 1,000", () => expect(formatDistance(996)).toBe("1 km"));
  it("supports miles", () => expect(formatDistance(8046.72, { units: "imperial" })).toBe("5 mi"));
});

describe("t", () => {
  it("fills placeholders", () => expect(t("explore.count", { count: 48 })).toBe("48 trails"));
  it("leaves unknown placeholders visible", () => expect(t("explore.where")).toBe("Trails across the {area}"));
});

describe("slugify", () => {
  it("makes a readable slug with the OSM id", () => expect(slugify("Mt Ainslie Summit Track", 123)).toBe("mt-ainslie-summit-track-123"));
  it("strips accents and symbols", () => expect(slugify("Côté & Co's Walk!", 9)).toBe("cote-and-co-s-walk-9"));
  it("falls back to the id", () => expect(slugify("!!!", 7)).toBe("7"));
});

describe("regions", () => {
  it("has a valid bounding box for every region", () => {
    for (const r of REGIONS) {
      const [w, s, e, n] = r.bbox;
      expect(w).toBeLessThan(e);
      expect(s).toBeLessThan(n);
      expect(r.states.length).toBeGreaterThan(0);
    }
  });
  it("launches with the ACT and NSW", () => expect(ACTIVE_REGION.states).toContain("Australian Capital Territory"));
});

describe("formatDuration", () => {
  it("rounds to 5 minutes", () => expect(formatDuration(2380)).toBe("40 min"));
  it("shows hours and minutes", () => expect(formatDuration(8100)).toBe("2 h 15 min"));
  it("drops zero minutes", () => expect(formatDuration(7200)).toBe("2 h"));
  it("never says 0 min", () => expect(formatDuration(30)).toBe("5 min"));
});

describe("formatClimb", () => {
  it("formats metres", () => expect(formatClimb(259.6)).toBe("260 m"));
});

describe("parkName", () => {
  it("joins name and type", () => expect(parkName("Namadgi", "National Park")).toBe("Namadgi National Park"));
  it("drops CAPAD zone prefixes", () => expect(parkName("Cobbora", "CCA Zone 3 State Conservation Area")).toBe("Cobbora State Conservation Area"));
  it("doesn't repeat a type already in the name", () => expect(parkName("Australian National Botanic Gardens", "Botanic Gardens (Commonwealth)")).toBe("Australian National Botanic Gardens"));
  it("drops (Commonwealth)", () => expect(parkName("Booderee", "National Park (Commonwealth)")).toBe("Booderee National Park"));
});
