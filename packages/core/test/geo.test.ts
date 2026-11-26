import { describe, expect, it } from "vitest";
import { bbox, distanceM, gapsM, inMultiPolygon, lineLengthM, multiLineLengthM, orderPieces, type Position, pointAlong, simplify, stitch } from "../src/geo";

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

describe("inMultiPolygon", () => {
  const square: Position[] = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
  const hole: Position[] = [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]];
  const shape = [[square, hole], [[[20, 20], [30, 20], [30, 30], [20, 30], [20, 20]]]] as Position[][][];
  it("finds a point inside the first polygon", () => expect(inMultiPolygon([2, 2], shape)).toBe(true));
  it("finds a point inside the second polygon", () => expect(inMultiPolygon([25, 25], shape)).toBe(true));
  it("excludes a point in a hole", () => expect(inMultiPolygon([5, 5], shape)).toBe(false));
  it("excludes a point outside every polygon", () => expect(inMultiPolygon([15, 15], shape)).toBe(false));
});

describe("pointAlong", () => {
  const line: Position[] = [[149, -35], [149, -35.01], [149, -35.02]];
  it("finds the start and end", () => {
    expect(pointAlong([line], 0)).toEqual([149, -35]);
    expect(pointAlong([line], 1)?.[1]).toBeCloseTo(-35.02, 6);
  });
  it("finds the halfway point", () => expect(pointAlong([line], 0.5)?.[1]).toBeCloseTo(-35.01, 6));
  it("carries on into the next piece of a multi-line", () => {
    const second: Position[] = [[149.1, -35], [149.1, -35.02]];
    expect(pointAlong([line, second], 0.75)?.[0]).toBeCloseTo(149.1, 6);
  });
});

describe("orderPieces", () => {
  // Three pieces of a walk heading east, stored out of order and with the middle one reversed.
  const p1: Position[] = [[149, -35], [149.01, -35]];
  const p2: Position[] = [[149.011, -35], [149.02, -35]];
  const p3: Position[] = [[149.021, -35], [149.03, -35]];
  const rev = (l: Position[]) => [...l].reverse();
  it("puts pieces in walking order and flips the ones stored backwards", () =>
    expect(orderPieces([p3, rev(p2), p1])).toEqual([p1, p2, p3]));
  it("starts from a loose end, not from the middle", () =>
    expect(orderPieces([p2, p3, p1])).toEqual([p1, p2, p3]));
  it("keeps the longest piece's mapped direction", () => {
    const long: Position[] = [[149.021, -35], [149.025, -35], [149.03, -35]];
    expect(orderPieces([rev(long), p1, p2])).toEqual([rev(long), rev(p2), rev(p1)]);
  });
  it("leaves a single piece alone", () => expect(orderPieces([p2])).toEqual([p2]));
});

describe("gapsM", () => {
  it("adds the shortest links needed to join every piece", () => {
    const gaps = gapsM([[[149, -35], [149.01, -35]], [[149.03, -35], [149.04, -35]], [[149.02, -35], [149.03, -35]]]);
    expect(gaps).toBeCloseTo(distanceM([149.01, -35], [149.02, -35]), 6);
  });
  it("counts a piece that meets another mid-way, at a junction, as joined", () => {
    const main: Position[] = [[149, -35], [149.01, -35], [149.02, -35]];
    const spur: Position[] = [[149.01, -35], [149.01, -35.01]];
    expect(gapsM([main, spur])).toBe(0);
  });
  it("is zero for one piece", () => expect(gapsM([[[149, -35], [149.01, -35]]])).toBe(0));
});
