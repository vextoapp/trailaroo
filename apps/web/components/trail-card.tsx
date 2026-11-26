import type { Trail } from "@trailaroo/core";
import { getTrailPhotos } from "@trailaroo/core/trails";
import Link from "next/link";
import { TrailCover } from "./trail-cover";

export type CardTrail = Pick<Trail, "slug" | "osmId" | "name" | "lines" | "bbox">;

/** Golden hour trail card: the trail's first photo, or its drawn route when it has none. */
export function TrailCard({ trail, meta }: { trail: CardTrail; meta: string }) {
  return (
    <article className="pcard">
      <TrailCover trail={trail} photo={getTrailPhotos(trail.osmId)[0]} />
      <div>
        <h3><Link className="title-link" href={`/trails/${trail.slug}`}>{trail.name}</Link></h3>
        <p className="meta num">{meta}</p>
      </div>
    </article>
  );
}

