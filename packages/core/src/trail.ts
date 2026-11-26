import { z } from "zod";

const position = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

/** Activity families (SPEC > Activities). M1 imports foot and bike routes. */
export const familySchema = z.enum(["foot", "bike"]);
export type Family = z.infer<typeof familySchema>;

/** The few OSM tags later steps use for difficulty and route type. */
const osmTagsSchema = z
  .object({ sac_scale: z.string(), mtb_scale: z.string(), surface: z.string(), roundtrip: z.string() })
  .partial();

/** Elevation stats from Mapterhorn terrain (pnpm data:trails, step 2). Metres. */
export const statsSchema = z.object({
  gainM: z.number().int().nonnegative(),
  lossM: z.number().int().nonnegative(),
  minM: z.number().int(),
  maxM: z.number().int(),
  routeType: z.enum(["loop", "one-way"]),
  /** 120 elevations evenly spaced along the route, for the profile chart. */
  profile: z.array(z.number().int()).min(2),
});
export type TrailStats = z.infer<typeof statsSchema>;

/** A trail as stored in the seed file. Validated with Zod whenever it's read. */
export const trailSchema = z.object({
  id: z.uuid({ version: "v7" }),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  osmId: z.number().int().positive(),
  name: z.string().min(1),
  family: familySchema,
  lengthM: z.number().positive(),
  start: position,
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  from: z.string().optional(),
  to: z.string().optional(),
  network: z.string().optional(),
  operator: z.string().optional(),
  description: z.string().optional(),
  website: z.url().optional(),
  osmTags: osmTagsSchema.optional(),
  stats: statsSchema.optional(),
  /** The protected area most of the route runs through (CAPAD 2024, CC BY 4.0). */
  park: z.string().optional(),
  /** Simplified for display; lengthM is measured on the full geometry. */
  lines: z.array(z.array(position).min(2)).min(1),
});
export type Trail = z.infer<typeof trailSchema>;

export const trailFileSchema = z.object({
  importedAt: z.iso.date(),
  source: z.string(),
  licence: z.literal("ODbL-1.0"),
  trails: z.array(trailSchema),
});
export type TrailFile = z.infer<typeof trailFileSchema>;

/** URL-safe slug from a trail name and its OSM id, e.g. "mt-ainslie-summit-1234". */
export function slugify(name: string, osmId: number): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return base ? `${base}-${osmId}` : String(osmId);
}

/** "Namadgi" + "National Park" → "Namadgi National Park". Drops CAPAD's internal zone prefixes. */
export function parkName(name: string, type: string): string {
  const kind = type.replace(/^CCA Zone \d /, "").replace(/ \(Commonwealth\)$/, "");
  if (/gazettal in progress|botanic gardens/i.test(kind) || name.toLowerCase().includes(kind.toLowerCase())) return name;
  return `${name} ${kind}`;
}
