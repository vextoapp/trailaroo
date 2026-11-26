import { distanceM, formatClimb, formatDistance, formatDuration, HOME_AREA, t } from "@trailaroo/core";
import { trailFacts, trails } from "@trailaroo/core/trails";
import type { Metadata } from "next";
import { RouteSvg } from "@/components/route-svg";
import { SeenHome } from "@/components/seen-home";
import { type ExploreCard, ExploreView } from "../explore-view";

export const metadata: Metadata = { title: t("explore.title") };

export default function ExplorePage() {
  const home: [number, number] = [HOME_AREA.lon, HOME_AREA.lat];
  const cards: ExploreCard[] = trails.map((trail) => {
    const facts = trailFacts(trail);
    const awayM = distanceM(home, trail.start);
    return {
      slug: trail.slug,
      name: trail.name,
      lengthM: trail.lengthM,
      gainM: trail.stats?.gainM ?? Number.POSITIVE_INFINITY, // no climb data sorts last, not "flattest"
      awayM,
      family: trail.family,
      difficulty: facts?.difficulty,
      facts: [formatDistance(trail.lengthM), trail.stats && t("explore.climb", { climb: formatClimb(trail.stats.gainM) }), facts && formatDuration(facts.timeS)].filter(Boolean).join(" · "),
      meta: [t(`family.${trail.family}`), t("explore.away", { distance: formatDistance(awayM) })].join(" · "),
      cover: <RouteSvg trail={trail} points={28} />,
    };
  });
  return (
    <>
      <SeenHome />
      <ExploreView cards={cards} />
    </>
  );
}
