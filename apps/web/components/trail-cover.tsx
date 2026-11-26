import type { Trail, TrailPhoto } from "@trailaroo/core";
import { TILES_URL } from "@/lib/tiles";
import type { Photo } from "./home-photos";
import { RouteSvg } from "./route-svg";

/** A picked Commons photo in the shape PhotoCredit takes. */
export const asPhoto = (p: TrailPhoto): Photo => ({ src: `${TILES_URL}/${p.file}`, alt: p.title, author: p.author, licence: p.licence, page: p.sourceUrl });

/**
 * A trail's cover: its first picked photo, or the drawn route when it has none. On cards the photo
 * is decorative (the title says what it is) and its credit is on the trail page the card links to.
 */
export function TrailCover({ trail, photo, points, className }: { trail: Pick<Trail, "lines" | "bbox">; photo?: TrailPhoto; points?: number; className?: string }) {
  if (!photo) return <div className={["cover drawn", className].filter(Boolean).join(" ")}><RouteSvg trail={trail} points={points} /></div>;
  return (
    <div className={["cover", className].filter(Boolean).join(" ")}>
      {/* biome-ignore lint/performance/noImgElement: photos are pre-sized on our CDN; no image optimiser on the server keeps it small and cheap */}
      <img src={asPhoto(photo).src} alt="" width={1000} height={667} loading="lazy" decoding="async" />
    </div>
  );
}
