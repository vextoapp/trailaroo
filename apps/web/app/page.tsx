import { distanceM, formatDistance, HOME_AREA, t } from "@trailaroo/core";
import { trails } from "@trailaroo/core/trails";
import { RouteThumb } from "@/components/route-thumb";
import { ExploreView, type TrailCard } from "./explore-view";

export default function ExplorePage() {
  const cards: TrailCard[] = trails.map((trail) => ({
    slug: trail.slug,
    name: trail.name,
    length: formatDistance(trail.lengthM),
    away: t("explore.away", { distance: formatDistance(distanceM([HOME_AREA.lon, HOME_AREA.lat], trail.start)) }),
    place: trail.operator ?? trail.network,
    thumb: <RouteThumb trail={trail} />,
  }));
  return <ExploreView cards={cards} />;
}
