import { z } from "zod";

const position = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

/** A trail as stored in the seed file. Validated with Zod whenever it's read. */
export const trailSchema = z.object({
  id: z.uuid({ version: "v7" }),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  osmId: z.number().int().positive(),
  name: z.string().min(1),
  lengthM: z.number().positive(),
  start: position,
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  from: z.string().optional(),
  to: z.string().optional(),
  network: z.string().optional(),
  operator: z.string().optional(),
  description: z.string().optional(),
  website: z.url().optional(),
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
