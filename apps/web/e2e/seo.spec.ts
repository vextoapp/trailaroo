import { expect, test } from "@playwright/test";
import { APP_NAME } from "../../../packages/core/src/config";

// Reads the raw server HTML (no JavaScript runs), the way link previews and search engines see it.
test("Trail pages are server-rendered with a title, link previews and JSON-LD", async ({ request }) => {
  const trails = [
    { slug: "black-mountain-summit-walk-11325858", park: "Black Mountain Nature Reserve" },
    { slug: "forty-foot-falls-walking-track-659628", park: undefined },
  ];
  for (const { slug, park } of trails) {
    const html = await (await request.get(`/trails/${slug}`)).text();
    expect(html).toMatch(/<h1[^>]*>[^<]+<\/h1>/);
    expect(html).toContain(` · ${APP_NAME}</title>`);
    for (const p of ["og:title", "og:description", "og:image", "og:url"]) expect(html).toContain(`property="${p}"`);
    for (const n of ["twitter:card", "twitter:image"]) expect(html).toContain(`name="${n}"`);
    expect(html).toContain('rel="canonical"');

    const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1];
    expect(json).toBeDefined();
    const ld = JSON.parse(json ?? "{}");
    expect(ld["@type"]).toBe("TouristAttraction");
    expect(ld).toMatchObject({ name: expect.any(String), description: expect.any(String), url: expect.stringContaining(`/trails/${slug}`), image: expect.stringContaining(`/trails/${slug}/cover.png`) });
    if (park) expect(ld.containedInPlace).toEqual({ "@type": "Park", name: park });
    else expect(ld.containedInPlace).toBeUndefined();

    expect(html).toContain(`property="og:image" content="${ld.image}"`); // one image URL for previews and JSON-LD
    const img = await request.get(new URL(ld.image).pathname);
    expect(img.status()).toBe(200);
    expect(img.headers()["content-type"]).toBe("image/png");
  }
});
