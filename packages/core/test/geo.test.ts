import { describe, expect, it } from "vitest";
import { bbox, distanceM, lineLengthM, multiLineLengthM, type Position, simplify, stitch } from "../src/geo";

describe("distanceM", () => {
  it("measures Mt Ainslie summit to Parliament House at about 5.1 km", () => {
    // Mt Ainslie lookout and Parliament House flagpole, both well-known points.
    const d = distanceM([149.1573, -35.2706], [149.1244, -35.3082]);
    expect(d).toBeGreaterThan(5050);
    expect(d).toBeLessThan(5250);
  });
  it("is zero for the same point", () => {
    expect(distanceM([149, -35], [149, -35])).toBe(0);
  });
  it("gives about 111.2 km for one degree of latitude", () => {
    expect(distanceM([149, -35], [149, -36])).toBeCloseTo(111_195, -2);
  });
});

describe("line lengths", () => {
  const line: Position[] = [[149, -35], [149, -35.001], [149, -35.002]];
  it("adds segment lengths", () => {
    expect(lineLengthM(line)).toBeCloseTo(222.4, 0);
  });
  it("adds lines in a multi-line", () => {
    expect(multiLineLengthM([line, line])).toBeCloseTo(444.8, 0);
  });
  it("is zero for a single point", () => {
    expect(lineLengthM([[149, -35]])).toBe(0);
  });
});

describe("bbox", () => {
  it("covers every point", () => {
    expect(bbox([[[149, -35], [149.2, -35.3]], [[148.9, -35.1]]])).toEqual([148.9, -35.3, 149.2, -35]);
  });
});

describe("simplify", () => {
  it("drops points that sit on a straight line", () => {
    const straight: Position[] = Array.from({ length: 11 }, (_, i) => [149 + i * 0.001, -35]);
    expect(simplify(straight, 1)).toEqual([straight[0], straight[10]]);
  });
  it("keeps a corner bigger than the tolerance", () => {
    const corner: Position[] = [[149, -35], [149.001, -35.001], [149.002, -35]];
    expect(simplify(corner, 5)).toHaveLength(3);
  });
  it("leaves two-point lines alone", () => {
    const two: Position[] = [[149, -35], [149.1, -35]];
    expect(simplify(two, 100)).toEqual(two);
  });
});

describe("stitch", () => {
  const a: Position = [0, 0], b: Position = [1, 0], c: Position = [2, 0], d: Position = [3, 0];
  it("joins segments end to end", () => {
    expect(stitch([[a, b], [b, c], [c, d]])).toEqual([[a, b, c, d]]);
  });
  it("flips reversed and out-of-order segments", () => {
    expect(stitch([[c, d], [b, a], [c, b]])).toEqual([[a, b, c, d]]);
  });
  it("keeps disconnected pieces separate", () => {
    expect(stitch([[a, b], [c, d]])).toEqual([[a, b], [c, d]]);
  });
  it("ignores empty or one-point segments", () => {
    expect(stitch([[a], [], [a, b]])).toEqual([[a, b]]);
  });
});
