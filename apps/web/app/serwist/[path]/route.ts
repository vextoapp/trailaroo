import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

const revision = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() || crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  // The installed app opens on /explore, so it and its map overlay work offline from the first launch.
  additionalPrecacheEntries: [
    { url: "/~offline", revision },
    { url: "/explore", revision },
    { url: "/trails.geojson", revision },
  ],
  swSrc: "app/sw.ts",
  useNativeEsbuild: true,
});
