# M2 plan 1: mock-ups and baseline. Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every new M2 screen and state is drawn in the Golden hour mock-ups, trail pages give correct link previews and structured data, and a Lighthouse baseline is recorded before M2 code lands.

**Architecture:** Mock-ups stay plain HTML/CSS/JS in `docs/mockups/`, extending `explore.html` and `trail.html` and reusing `mockups.css` components (chip, notice, sheet, rows, hscroll, pcard). Alternate states (search open, alert states) are switched with the existing `data-set="key=value"` mechanism in `mockups.js`, which sets `<body data-key="value">`; CSS shows the matching block. The app fix adds a build-time Open Graph image per trail (`opengraph-image.tsx`) and richer JSON-LD, pinned by a Playwright test that reads the server HTML.

**Tech Stack:** HTML, CSS, vanilla JS (mock-ups); Next.js 16.4 App Router metadata API and `next/og` `ImageResponse`; Playwright; Lighthouse CLI.

**Spec:** `docs/superpowers/specs/2026-11-27-m2-explore-trail-pages-design.md` (suggested order steps 1 and 2), plus `docs/SPEC.md` > Feature inventory sections 1 and 2.

## Global Constraints

- One PR: the design doc, this plan, the mock-ups and the baseline fixes. Branch `claude/cool-carson-3df9ed`. Ask before pushing and before merging.
- `node docs/mockups/check.mjs` passes (contrast, no-external, links, maps, app-name, screens), plus the new `alerts` check from Task 1.
- No third-party requests from mock-ups. Plain `<a href>` links to official sites (RFS, ESA, NPWS, ACT Parks, OSM, Wikidata, Open-Meteo) are allowed.
- WCAG 2.2 AA: touch targets ≥ 44 px, visible focus, every map has a text version, nothing conveyed by colour alone (steepness and surface bands also have words).
- Safety copy, verbatim from the design:
  - stale: "Alerts may be out of date, last checked 2 h ago. Check the official site."
  - offline: "You're offline. Last checked {time} ago"
  - ACT: "Park closures aren't tracked here yet. Check ACT Parks"
  - park alert: "Park alert: check before you go"
  - Explore filter: "Hide trails with closures"
- Every alert shows its source and time. No state ever says "no alerts" unless the feed is fresh; the current-and-clear state says "No alerts from NSW NPWS" with the check time.
- Honest filter labels: "Dogs allowed (where tagged)", "Kid-friendly (where tagged)", "Wheelchair-friendly (where tagged)".
- The generated description is labelled "Written from map data".
- Weather is credited "Open-Meteo, CC BY 4.0"; Wikidata text is credited "Wikidata, CC0".
- M3+ items already in the mock-ups (ratings, reviews, save, popular times, download, personal time) stay: the mock-ups are the full vision. Don't add new M3+ UI.
- App code: TypeScript strict, no `any`, strings through `t()` in `@trailaroo/core`, app name from `APP_NAME`.
- en-AU spelling, km and m, 12-hour times ("9:30 am").

## Review Focus

1. A phone at 320 px with the unified search results open: groups and the location chooser must not scroll sideways → Task 4 browser pass at 320 px.
2. Keyboard user in search results: results are a list of links/buttons reachable by Tab, Escape closes the panel → Task 2 uses a `<dialog>`-free panel of real links plus a close button; Task 4 walks it by keyboard.
3. Alert state switcher read by a screen reader: each state is one `role="note"` block with source and time inside it, not split across siblings → Task 1 `alerts` check asserts every `[data-alert]` contains a `.src`.
4. A trail with no park and no photo shared on a chat app: the preview must still have a title, description and an image → Task 5 test covers a trail without a park.
5. JSON-LD with a trail name containing `<` or quotes: must stay valid JSON in the HTML → Task 5 keeps the existing `<` escape; the test parses the JSON-LD with `JSON.parse`.

---

### Task 1: Alerts check in `check.mjs`

**Files:**
- Modify: `docs/mockups/check.mjs` (new check block before "screens exist")

**Interfaces:**
- Produces: the rule "every element with `data-alert` contains an element with class `src`, and that `.src` text contains a digit (a time or date)". Tasks 2 and 3 mark every alert and closure notice with `data-alert="<state>"`.

- [ ] **Step 1:** Add the `alerts` check: for each HTML file, find each element opening with `data-alert` and its matching close (a simple depth-tracking scan on the same tag name is enough), fail `alerts: <file>: a [data-alert] has no .src with a time` when no `class="src"` with a digit is inside it. Add `alerts` to the final OK line.
- [ ] **Step 2:** Add a temporary `<div data-alert="x" role="note">test</div>` to `trail.html`, run `node docs/mockups/check.mjs`, expect `FAIL alerts: trail.html: ...`. Remove it.
- [ ] **Step 3:** Run `node docs/mockups/check.mjs`. Expected: `OK contrast, no-external, links, maps, app-name, alerts, screens`.

### Task 2: Explore mock-up

**Files:**
- Modify: `docs/mockups/explore.html`, `docs/mockups/trail-helpers.js` (`cardHtml`), `docs/mockups/mockups.css` (shared pieces only: `.carousel`, `.cluster`, `.badge-alert`)

**Interfaces:**
- Consumes: `data-set`, `data-open-sheet`, `data-toggle`, `.chip[aria-pressed]` from `mockups.js`; `window.Dir` from `trail-helpers.js`.
- Produces: `.carousel` (photos with prev/next buttons and "1 of 3" counter) used again by Task 3's header.

- [ ] **Step 1: Unified search.** Replace the "Where" input's placeholder with "Trail, place, park or peak". Add a results panel `#search-panel` shown when `body[data-search="open"]` (open on input focus via `data-set="search=open"`; a close button sets `search=closed`). Two states inside it, switched by `body[data-q]`:
  - empty (`data-q="empty"`): "Near me" button (with "Uses your location only when you tap"), "Recent searches" (3 rows, "Clear" button) and "Last viewed" (3 trail rows, "Clear" button), with the note "Kept on this device only".
  - typed (`data-q="typed"`, query "tidbin"): groups with headings Trails (2 rows: name, park, distance), Places (1: "Tidbinbilla, ACT"), Parks (1: "Tidbinbilla Nature Reserve"), Peaks (1: "Tidbinbilla Peak, 1,615 m"). A typo row: "Showing results for tidbinbilla".
- [ ] **Step 2: Location chooser.** In the results bar, add "Near Canberra · Change" opening `<dialog class="sheet" id="location-sheet">` with rows: "Use my location" (GPS, asked now), "Home area: Canberra" (selected), and a search field "Type a town or suburb". Footer note: "Your location stays on this device."
- [ ] **Step 3: Filters.** Keep the length, climb and difficulty rows. Add a "Filters" chip with a count ("Filters · 2") that opens `<dialog class="sheet" id="filters-sheet">` with groups, each a `.chips.wrap` `role="group"`:
  - Time: Under 1 h, 1 to 3 h, 3 h or more
  - Route type: Loop, One way
  - Features: Views, Waterfall, Lake, River, Beach, Forest, Wildflowers, Wildlife, Historic, Cave
  - Suitable for: Dogs allowed (where tagged), Kid-friendly (where tagged), Wheelchair-friendly (where tagged), with the note "Only trails where the map data says so. A trail without data isn't marked either way."
  - Surface: Sealed, Gravel, Dirt
  - Distance from me: Within 10 km, 25 km, 50 km, 100 km
  - Closures: a switch-style chip "Hide trails with closures" with the note "Hides trails NSW NPWS lists as closed. Park-wide notices still show."
  - Footer: "Clear all" and "Show 18 trails".
  Add "Most relevant" and "Newest" to the sort select.
- [ ] **Step 4: Card carousel and alert badges.** In `cardHtml`, when `t.photos.length > 1`, render the cover as `.carousel` with the photos, prev/next buttons (`aria-label="Previous photo of {name}"`, 44 px), and "1 of N"; a small script on the page moves between them (no autoplay). Add a `badge` field to two sample trails in `explore.html`'s script (not in `data.js`): one "Closed" (danger, `data-alert="closed"`, `.src` "NSW NPWS, 9:30 am"), one "Park alert" (warning, `data-alert="park"`, same source style).
- [ ] **Step 5: Map clusters and "search this area".** Over the existing map image add an SVG overlay with 4 cluster circles showing counts (e.g. 12, 7, 5, 3) and 3 single pins; one pin highlighted to show the hovered card. Add a floating "Search this area" button at the top centre of the map. Update the map's `aria-label` to say clusters are listed in the results.
- [ ] **Step 6:** Run `node docs/mockups/check.mjs`. Expected: all OK. Commit: `docs(mockups): M2 Explore: unified search, location, filters, clusters, card carousel`.

### Task 3: Trail page mock-up

**Files:**
- Modify: `docs/mockups/trail.html` (and `mockups.css` only if a piece is shared)

**Interfaces:**
- Consumes: `.carousel` from Task 2; `data-alert` rule from Task 1.

- [ ] **Step 1: Header carousel.** Make `.hero` a `.carousel` of 3 photos (`gibraltar-roo`, `tidbinbilla`, `namadgi-trail`) with prev/next and "1 of 3"; the credit line updates per photo.
- [ ] **Step 2: Official alerts states.** In `.safety`, add a mock-up-only switcher above the notices: a `.segmented` labelled "Mock-up: alert state" with buttons Current, Park alert, Closed, Out of date, Offline, ACT (`data-set="alerts=current|park|closed|stale|offline|act"`), default `current`. Each state is one block with `data-alert` and `role="note"`, shown when `body[data-alerts]` matches:
  - current: fire danger "Moderate" with "No total fire ban" (src "NSW RFS, updated 9:30 am today") and "No alerts from NSW NPWS for this park" (src "NSW NPWS, checked 9:30 am today").
  - park: "Park alert: check before you go" with the headline "Track works on the Mountain Creek fire trail" and a link "Read it on the NPWS site" (src "NSW NPWS, posted 22 Nov, checked 9:30 am").
  - closed: danger notice "Closed. Gibraltar Peak track is closed for track repairs" (src "NSW NPWS, posted 25 Nov, until 12 Dec").
  - stale: warning "Alerts may be out of date, last checked 2 h ago. Check the official site." with links to NPWS and RFS (src "Last good check 7:30 am").
  - offline: "You're offline. Last checked 3 h ago" above the last-known fire danger (src "NSW RFS, updated 6:30 am").
  - act: ACT ESA fire danger (src "ACT Emergency Services Agency, updated 9:30 am today") plus a neutral notice "Park closures aren't tracked here yet. Check ACT Parks" with the link; visually distinct from the current state (no tick icon, muted border).
  Remove the "Gates close at 6 pm" ACT Parks notice (contradicts the ACT state). Keep the sunset notice.
- [ ] **Step 3: Description.** Replace the club-written About text with a generated one (route type, climb, notable features, nearest town), labelled `.byline` "Written from map data. <a href=…openstreetmap.org…>Suggest an edit on OpenStreetMap</a>". "Getting there" names the start point and has Drive, Public transport and Walk links (same as the directions sheet).
- [ ] **Step 4: Map.** Add a photo pin, and a "Colour the route by" `.segmented` under the map: Plain, Steepness, Surface (`data-set="routecolour=…"`), each swapping the route stroke classes. Add a POI line to the "Route in words" text version: "Along the way: parking and toilets at the start, water tank at 1.1 km, lookout at 4.1 km. Points of interest from OpenStreetMap within 200 m of the route."
- [ ] **Step 5: Steepness and surface.** Under the elevation profile, add a legend with words for the bands (Flat under 5%, Moderate 5 to 10%, Steep 10 to 15%, Very steep over 15%; sample bands, final values recorded in SPEC in plan 4) and "Steepest: 14% for 300 m, at 3.6 km". Change the surface breakdown to Sealed, Gravel, Dirt, Unknown with distances ("Dirt 5.0 km, 61%").
- [ ] **Step 6: Top sights and tags.** Top sights: each card gets a one-line Wikidata description where it exists and its source ("From OpenStreetMap" / "Description from Wikidata, CC0"). Tags ("What it's like"): each tag states its source, e.g. "Waterfall: mapped in OpenStreetMap 80 m from the route", "Dogs: not allowed, tagged on the route in OpenStreetMap", "Views: lookout mapped at 4.1 km". Remove vote counts from these tags (votes are M3).
- [ ] **Step 7: Weather and conditions.** Weather: add "Rain in the last 72 hours: 14 mm" and a "Hour by hour" `data-toggle` panel (12 hours: time, icon, temperature, rain chance, wind) as a table; header credit "Open-Meteo, CC BY 4.0, updated 10:00 am". Conditions: three computed hints (wet underfoot, heat over 32°, strong wind on the exposed summit), each with a "Computed" label and its reason in `.src`; keep the community report (M3 vision).
- [ ] **Step 8: Actions and lists.** More sheet: "Export GPX or KML" (FIT moves to M4) and "Suggest an edit on OpenStreetMap". Add "Similar trails" after "Nearby trails" (2 rows, same family, similar length and climb, with the reason "Similar length and climb"). Add Wikidata, Wikimedia Commons, NSW RFS and NSW NPWS rows to "About this data".
- [ ] **Step 9:** Run `node docs/mockups/check.mjs`. Expected: all OK. Commit: `docs(mockups): M2 trail page: carousel, alert states, description, steepness, surface, sights, weather`.

### Task 4: Browser pass on the mock-ups

**Files:** none new (fixes go back into Tasks 2 and 3's files)

- [ ] **Step 1:** Serve `python3 -m http.server 4173 --directory docs/mockups` and open `explore.html` and `trail.html` at 320, 390 and 1280 px, dark and light.
- [ ] **Step 2:** Check: no sideways scroll at 320 px with the search panel and each sheet open; every alert state reads with its source; keyboard Tab reaches the carousel buttons, search rows, sheets (Escape closes), and the state switcher; no console errors.
- [ ] **Step 3:** Fix what fails, re-run `check.mjs`, commit: `docs(mockups): M2 fixes from browser pass` (only if there were fixes). Take screenshots for the PR.

### Task 5: Trail page previews and structured data

**Files:**
- Create: `apps/web/app/(app)/trails/[slug]/opengraph-image.tsx`
- Create: `apps/web/e2e/seo.spec.ts`
- Modify: `apps/web/app/(app)/trails/[slug]/page.tsx` (`generateMetadata`, `jsonLd`)
- Modify: `packages/core` i18n strings if new copy is needed (`og.alt`)

**Interfaces:**
- Produces: `/trails/{slug}/opengraph-image` (PNG, 1200×630), linked automatically by Next as `og:image` and `twitter:image`.

- [ ] **Step 1: Write the failing test** `apps/web/e2e/seo.spec.ts`, using `page.request.get` (raw server HTML, no JS):

```ts
test("Trail pages are server-rendered with title, previews and JSON-LD", async ({ request }) => {
  for (const slug of ["black-mountain-summit-walk-11325858", NO_PARK_SLUG]) {
    const html = await (await request.get(`/trails/${slug}`)).text();
    // <h1> and <title> are in the HTML, not added by JS
    expect(html).toMatch(/<h1[^>]*>[^<]+<\/h1>/);
    expect(html).toMatch(/<title>[^<]+ · Trailaroo<\/title>/); // APP_NAME imported, not literal
    for (const p of ["og:title", "og:description", "og:image", "og:url"]) expect(html).toContain(`property="${p}"`);
    for (const n of ["twitter:card", "twitter:image"]) expect(html).toContain(`name="${n}"`);
    expect(html).toContain('rel="canonical"');
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1]);
    expect(ld["@type"]).toBe("TouristAttraction");
    expect(ld).toMatchObject({ name: expect.any(String), url: expect.stringContaining(`/trails/${slug}`), image: expect.stringContaining("opengraph-image"), description: expect.any(String) });
    if (slug.startsWith("black-mountain")) expect(ld.containedInPlace).toEqual({ "@type": "Park", name: "Black Mountain Nature Reserve" });
    else expect(ld.containedInPlace).toBeUndefined();
    const img = await request.get(new URL(ld.image).pathname);
    expect(img.headers()["content-type"]).toBe("image/png");
  }
});
```
  `NO_PARK_SLUG` is the first trail in `/trails.geojson` without a `park` property (look it up in the test). Import `APP_NAME` from `@trailaroo/core` for the title check.
- [ ] **Step 2:** `pnpm build && pnpm e2e -- seo.spec.ts`. Expected: FAIL on `og:image` (no image today).
- [ ] **Step 3: Implement `opengraph-image.tsx`** exporting `alt`, `size = { width: 1200, height: 630 }`, `contentType = "image/png"` and `generateStaticParams` matching the page. Draw the Golden hour drawn cover: dark green gradient (the `.cover.drawn` colours), the route from `RouteSvg`'s projection as an inline `<svg>` path in wattle, the trail name, park and "8.2 km · 520 m climb", and `APP_NAME`. Use `ImageResponse`'s default font (no font files). If the trail has a picked photo, place it as the background `<img>` from `TILES_URL` instead of the gradient. Export the projection helper from `components/route-svg.tsx` so both share it (no copy).
- [ ] **Step 4: Update `generateMetadata`** to add `twitter: { card: "summary_large_image" }` (Next fills title, description and image from openGraph). **Update `jsonLd`** to add `url` (absolute, from `metadataBase`), `description` (same as meta), `image` (absolute URL of the OG image), and `containedInPlace: { "@type": "Park", name }` when `trail.park` is set.
- [ ] **Step 5:** `pnpm build && pnpm e2e -- seo.spec.ts`, then `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e`. Expected: all PASS. Open one OG image in the browser and check it looks right in both a park and no-park trail.
- [ ] **Step 6:** Commit: `feat(web): trail link previews with a drawn route image, richer JSON-LD`.

### Task 6: Lighthouse baseline

**Files:**
- Create: `docs/perf/2026-11-28-m2-baseline.md`

- [ ] **Step 1:** `pnpm build && PORT=3200 pnpm start` (background). Lighthouse CLI is fetched with `npx lighthouse@<exact current version>`; ask before the first download. Use Playwright's Chromium via `CHROME_PATH`.
- [ ] **Step 2:** For `/`, `/explore` and `/trails/black-mountain-summit-walk-11325858`, run 3 times each with Lighthouse's default mobile config (Moto G Power emulation, simulated slow 4G): `npx lighthouse@<v> <url> --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=<scratchpad>/<page>-<n>.json --chrome-flags="--headless=new"`. Take the median performance run.
- [ ] **Step 3:** From each median report, record: the four scores, LCP, TBT, CLS, and first-load JS = sum of `transferSize` for `resourceType === "Script"` in `network-requests`, minus the MapLibre chunk (the script whose source contains `maplibre`; it loads after interaction on Explore and the trail page). State the method in the doc.
- [ ] **Step 4:** Write the doc: a table per page against the targets (95+ each; under 200 KB JS), what's under target and the likely cause, and a note that Lighthouse 12+ no longer has a PWA category (SPEC's "Lighthouse PWA score" check needs rewording; flag, don't change SPEC here).
- [ ] **Step 5:** Commit: `docs(perf): M2 Lighthouse and JS baseline`.

### Task 7: Reviews, PR

- [ ] **Step 1:** Run code-simplifier on the Task 5 code, web-design-guidelines on the changed mock-ups and the OG image, and `/code-review`. Fix what's real; note the rest.
- [ ] **Step 2:** Ask the user, then push and open the PR: summary, screenshots from Task 4, the baseline table from Task 6, and "No new running costs".
- [ ] **Step 3:** Wait for CI green, comment `@coderabbitai review`, fix findings. Ask before merging.
