import { describe, expect, it } from "vitest";
import { difficulty, estimateTimeS } from "../src/difficulty";
import { climb, resampleProfile, routeType, sampleLine } from "../src/elevation";
import type { Position } from "../src/geo";

describe("climb", () => {
  it("counts a steady climb and descent", () => expect(climb([100, 150, 200, 150, 100])).toEqual({ gainM: 100, lossM: 100 }));
  it("ignores wobble smaller than the threshold (only the net end change counts)", () => expect(climb([100, 103, 99, 102, 100, 104])).toEqual({ gainM: 4, lossM: 0 }));
  it("still counts a slow climb made of small steps", () => expect(climb([100, 103, 106, 109, 112, 115])).toEqual({ gainM: 15, lossM: 0 }));
  it("handles an empty profile", () => expect(climb([])).toEqual({ gainM: 0, lossM: 0 }));
});

describe("sampleLine", () => {
  const line: Position[] = [[149, -35], [149, -35.009]]; // about 1 km north-south
  it("samples every step and keeps both ends", () => {
    const s = sampleLine(line, 250);
    expect(s[0]?.distM).toBe(0);
    expect(s.length).toBe(6); // 0, 250, 500, 750, 1000 and the end (~1001 m)
    expect(s.at(-1)?.at).toEqual(line[1]);
  });
});

describe("resampleProfile", () => {
  it("interpolates to a fixed number of points", () => {
    const p = resampleProfile([{ distM: 0, elevM: 100 }, { distM: 1000, elevM: 200 }], 5);
    expect(p).toEqual([100, 125, 150, 175, 200]);
  });
});

describe("routeType", () => {
  it("calls a route whose ends meet a loop", () => expect(routeType([[[149, -35], [149.01, -35], [149, -35.0005]]])).toBe("loop"));
  it("calls an open route one way", () => expect(routeType([[[149, -35], [149.05, -35]]])).toBe("one-way"));
  it("treats ends 250 m apart as a loop (car-park corners)", () => expect(routeType([[[149, -35], [149.02, -35], [149.002, -35.001]]])).toBe("loop"));
  it("trusts roundtrip=no over nearby ends", () => expect(routeType([[[149, -35], [149.01, -35], [149, -35.0005]]], "no")).toBe("one-way"));
  it("calls a two-piece loop a loop even when the pieces are stored out of order", () =>
    expect(routeType([[[149, -35], [149.02, -35]], [[149, -35], [149.01, -34.99], [149.02, -35]]])).toBe("loop"));
  it("calls an out-and-back with a side branch one way", () =>
    expect(routeType([[[149, -35], [149.02, -35]], [[149.01, -35], [149.01, -35.02]]])).toBe("one-way"));
});

describe("difficulty", () => {
  it("rates a short flat walk easy", () => expect(difficulty("foot", 2600, 10)).toBe("easy"));
  it("rates a summit walk with real climb moderate", () => expect(difficulty("foot", 5200, 260)).toBe("moderate"));
  it("rates a long climbing day hard", () => expect(difficulty("foot", 14000, 810)).toBe("hard"));
  it("raises a mountain_hiking track to at least hard", () => expect(difficulty("foot", 3000, 100, { sac_scale: "mountain_hiking" })).toBe("hard"));
  it("uses mtb:scale for bikes when tagged", () => expect(difficulty("bike", 5000, 50, { mtb_scale: "3" })).toBe("hard"));
  it("falls back to distance and climb for untagged bikes", () => expect(difficulty("bike", 25000, 400)).toBe("moderate"));
});

describe("estimateTimeS", () => {
  it("walks 9 km with 300 m climb in about 2 h 30 min", () => expect(estimateTimeS("foot", 9000, 300)).toBe(9000));
  it("rides 24 km flat in about 2 h", () => expect(estimateTimeS("bike", 24000, 0)).toBe(7200));
});
