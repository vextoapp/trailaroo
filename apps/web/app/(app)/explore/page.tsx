import { distanceM, formatDistance, HOME_AREA, t } from "@trailaroo/core";
import { trails } from "@trailaroo/core/trails";
import type { Metadata } from "next";
import { RouteSvg } from "@/components/route-svg";
import { SeenHome } from "@/components/seen-home";
import { type ExploreCard, ExploreView } from "../explore-view";

export const metadata: Metadata = { title: t("explore.title") };

export default function ExplorePage() {
  const home: [number, number] = [HOME_AREA.lon, HOME_AREA.lat];
  const cards: ExploreCard[] = trails.map((trail) => ({
    slug: trail.slug,
    name: trail.name,
    lengthM: trail.lengthM,
    family: trail.family,
    meta: [t(`family.${trail.family}`), t("explore.away", { distance: formatDistance(distanceM(home, trail.start)) }), formatDistance(trail.lengthM)].join(" · "),
    cover: <RouteSvg trail={trail} points={28} />,
  }));
  return (
    <>
      <SeenHome />
      <ExploreView cards={cards} />
    </>
  );
}
