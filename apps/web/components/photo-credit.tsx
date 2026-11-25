import { t } from "@trailaroo/core";
import type { Photo } from "./home-photos";

/** Credit line every reused photo needs (author, licence, link to the original). */
export function PhotoCredit({ photo, className = "credit" }: { photo: Photo; className?: string }) {
  return (
    <span className={className}>
      {t("photo.credit")} <a href={photo.page}>{photo.author}</a>, {photo.licence}
    </span>
  );
}
