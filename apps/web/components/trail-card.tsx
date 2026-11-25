import type { Trail } from "@trailaroo/core";
import Link from "next/link";
import { RouteSvg } from "./route-svg";

export type CardTrail = Pick<Trail, "slug" | "name" | "lines" | "bbox">;

/** Golden hour trail card. No photos yet in the live data, so every card uses the drawn cover. */
export function TrailCard({ trail, meta }: { trail: CardTrail; meta: string }) {
  return (
    <article className="pcard">
      <div className="cover drawn"><RouteSvg trail={trail} /></div>
      <div>
        <h3><Link className="title-link" href={`/trails/${trail.slug}`}>{trail.name}</Link></h3>
        <p className="meta num">{meta}</p>
      </div>
    </article>
  );
}

