import photoData from "../data/trail-photos.json";
import data from "../data/trails.json";
import { HOME_AREA } from "./config";
import { type Difficulty, difficulty, estimateTimeS } from "./difficulty";
import { distanceM, type Position } from "./geo";
import { type Trail, type TrailPhoto, trailFileSchema, trailPhotosSchema } from "./trail";

const file = trailFileSchema.parse(data as unknown);
const home: Position = [HOME_AREA.lon, HOME_AREA.lat];

/** All trails, closest to the home area first. */
export const trails: readonly Trail[] = [...file.trails].sort((a, b) => distanceM(home, a.start) - distanceM(home, b.start));
export const importedAt = file.importedAt;

const bySlug = new Map(trails.map((trail) => [trail.slug, trail]));
export const getTrail = (slug: string): Trail | undefined => bySlug.get(slug);

/** Difficulty and estimated time, derived from the stored stats so the models can change without re-importing. */
export function trailFacts(trail: Trail): { difficulty: Difficulty; timeS: number } | undefined {
  if (!trail.stats) return undefined;
  return {
    difficulty: difficulty(trail.family, trail.lengthM, trail.stats.gainM, trail.osmTags),
    timeS: estimateTimeS(trail.family, trail.lengthM, trail.stats.gainM),
  };
}

const photos = trailPhotosSchema.parse(photoData as unknown);
/** Picked photos for a trail, best first; empty when it has none (the app draws a route cover). */
export const getTrailPhotos = (slug: string): readonly TrailPhoto[] => photos[slug] ?? [];
