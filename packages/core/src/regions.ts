/**
 * Regions the app covers. Adding a region is a config change here, not code (CLAUDE.md > Decisions).
 * bbox is [west, south, east, north] in EPSG:4326 and only speeds up the OSM extract; the state
 * borders decide which trails belong (the box also takes in much of northern Victoria).
 */
export type Region = {
  id: string;
  name: string;
  bbox: [number, number, number, number];
  /** OSM admin_level=4 names; a trail belongs to the region if it starts inside one of these. */
  states: readonly string[];
};

export const REGIONS: readonly Region[] = [
  {
    id: "act-nsw",
    name: "ACT and NSW",
    bbox: [140.99, -37.51, 153.64, -28.15],
    states: ["New South Wales", "Australian Capital Territory", "Jervis Bay Territory"],
  },
];

export const ACTIVE_REGION: Region = REGIONS[0] as Region;
