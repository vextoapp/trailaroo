import data from "../data/act-trails.json";
import { HOME_AREA } from "./config";
import { distanceM, type Position } from "./geo";
import { type Trail, trailFileSchema } from "./trail";

const file = trailFileSchema.parse(data as unknown);
const home: Position = [HOME_AREA.lon, HOME_AREA.lat];

/** All trails, closest to the home area first. */
export const trails: readonly Trail[] = [...file.trails].sort((a, b) => distanceM(home, a.start) - distanceM(home, b.start));
export const importedAt = file.importedAt;

const bySlug = new Map(trails.map((t) => [t.slug, t]));
export const getTrail = (slug: string): Trail | undefined => bySlug.get(slug);
