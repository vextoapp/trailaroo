# M2 Explore and trail pages: design

Status: draft for approval, 27 Nov 2026. It implements SPEC > Acceptance checks > M2, as scoped below.

## Intent

M1 made the trail data trustworthy. M2 makes the two screens hikers use to choose a walk feel complete: **Explore** and the **trail page**. It also adds the first safety layer, which is **official fire danger and park alerts**, shown honestly with their source and time.

The question M2 answers is "should I walk this, today?", for someone near Canberra or anywhere in NSW, on their phone.

## Goals

1. Explore can find a trail by trail name, place, park or peak. It can filter and sort on everything our data supports, and its map behaves like a real trail map: clusters, "search this area", and a list kept in step with the map.
2. The trail page shows everything we can know without accounts, recordings or offline storage. That covers photos, a richer map, a steepness and surface breakdown, top sights, weather, computed conditions, official alerts, exports and nearby trails.
3. Fire danger, total fire bans and park alerts:
   - are polled every 30 minutes
   - are matched to parks and trails
   - always show their source and time
   - are never shown past their expiry
   - say plainly when the feed itself is out of date
4. Trail pages stay server-rendered with correct titles, previews and structured data. Lighthouse scores 95+ on a mid-range Android over throttled 4G.
5. A hallway test passes: 5 people who've never seen the app can each say what it is and open a trail near them within 30 seconds.

## Scope decision: what M2 builds and what moves (27 Nov 2026)

SPEC's M2 check "every element in the Feature inventory for Explore and Trail page is present" is read as **every element that works without accounts, recordings or offline storage**. Items that need those move to the milestone that unlocks them, and are added to that milestone's checks in SPEC so they aren't lost.

| Moves to | Items |
|---|---|
| M3 Community | Ratings, the "highest rated" and "most reviewed" sorts, rating on cards, the rating filter, reviews and the AI review summary, save to a list (heart on cards), report a problem, community condition reports, community descriptions |
| M4 Record and navigate | Personal time estimate from your pace, start navigation, popular times, community heatmap |
| M5 Offline and install | Download for offline (cards and trail page) |
| M6 Plan and social | Customise route |
| M7 Safety and polish | Shade filter, because no source data exists yet. Revisit with tree cover data |

Everything else in inventory sections 1 (Explore) and 2 (Trail page) is in M2.

## What M2 builds

### Explore

- **Unified search.** One box searches trails, places (towns and suburbs), parks and peaks, with typo tolerance. Results are grouped by kind and ranked by match quality, then by distance from the current location. Picking a trail opens it; picking a place, park or peak moves the location and map there.
- **Place list (decided 27 Nov 2026: built-in list, not Photon).** The nightly data job extracts named places, parks, peaks, lakes, waterfalls and lookouts for the active region from the same OSM extract it already downloads. It writes them to a static file of about 100–200 KB, which the browser loads the first time search is used and searches locally. Cost $0, no third-party calls, and it works offline once loaded. Photon stays in SPEC for going Australia-wide or global. Record this in SPEC > Decisions made.
- **Filters added:**
  - estimated time
  - route type (loop or one-way, from data we already store)
  - features (views, waterfall, lake, river, beach, forest, wildflowers, wildlife, historic, cave)
  - dog policy
  - kid-friendly
  - wheelchair-friendly
  - surface
  - distance from me
  - open or closed (from official closures)
- **Honest filters.** Feature, dog, kid and wheelchair filters only match trails with explicit evidence, such as an OSM tag on the route or a mapped feature within a set distance of it. The chip label says so, for example "Dogs allowed (where tagged)". A trail without data is never shown as "no dogs". Each derived tag stores its source and confidence; the trail page shows these.
- **Sorts added:** "most relevant" (when a search is active) and "newest" (first seen in our data). Closest, shortest and longest already exist.
- **Result cards:** a photo carousel when a trail has 2–3 photos, a mini route map (exists), difficulty, length and estimated time (exist). The rating, save and download controls arrive in M3 and M5.
- **Map view:**
  - clustered trail pins when zoomed out, route lines when zoomed in
  - a "search this area" button after the map moves
  - list and map kept in sync: the list shows the trails in view, and hovering or focusing a card highlights its route
  - side by side on desktop (exists)
- **Last viewed and recent searches** are kept on the device only (local storage) and can be cleared.
- **Location** goes through the existing LocationSource rule:
  - device GPS, asked for only when the person taps "Near me"
  - a home area (default Canberra)
  - a typed place from the place list
  - editable at any time

  The chosen location is kept on the device.

### Trail page

- **Header:** photo carousel (from picked photos), name, park, difficulty, length, climb, estimated time, route type.
- **Description:** generated from data and labelled "Written from map data". It covers the route type, the climb, notable features and the nearest town, and includes how to get there (the start point, plus driving and public transport links).
- **Interactive map:**
  - the route with direction arrows
  - the start point
  - photo pins (photo positions come from Commons, so the picks file stores latitude and longitude)
  - points of interest from OSM within about 200 m of the route: water, toilets, parking, shelters, viewpoints
- **Elevation profile:** add steepness colouring and the maximum grade to the existing scrub profile.
- **Surface:** a breakdown (sealed, gravel, dirt, unknown) by distance, and the map line coloured by surface. This needs the trail pipeline to keep the surface of each OSM way along the route, which it currently drops when stitching.
- **Top sights:** named peaks, viewpoints, waterfalls, lookouts and historic sites near the route from OSM, with a short Wikidata description where one exists (CC0, attributed).
- **Tags with confidence and source:** each derived feature and suitability tag says where it came from, for example "Waterfall: mapped in OpenStreetMap 80 m from the route".
- **3D flyover and photo tour:**
  - The flyover is a camera path along the route over the existing terrain tiles.
  - The photo tour steps through the photos on the map.
  - It respects reduced-motion settings.
  - It's built last and is the first thing to cut if M2 runs long.
- **Weather:**
  - 7-day and hourly forecast, sunrise and sunset, UV, wind, and rain in the last 72 hours
  - from Open-Meteo through our own web server: the browser calls our server, never Open-Meteo, so a visitor's location stays private
  - cached per grid cell (about 0.1°) for an hour
  - credited as CC BY 4.0
- **Conditions:**
  - computed hints: "likely wet underfoot" after heavy rain in the last 72 hours, heat above a threshold, strong wind on exposed routes
  - each hint labelled as computed, with the reason
  - official alerts and closures alongside them (see below)
- **Actions:**
  - share (exists)
  - directions by drive, public transport or walk (links to the device's maps app)
  - export GPX and KML
  - "suggest an edit", which links to the route on openstreetmap.org
  - FIT export moves to M4 with recordings
- **Nearby and similar trails:** nearby means starts within a set distance. Similar means the same family with similar length and climb.
- **Data sources and last-updated date:** extend the existing credits to cover weather, alerts, Wikidata and photos.

### Fire danger and park alerts (safety)

**Sources:**
- NSW RFS fire danger ratings and total fire bans, by fire weather district
- ACT ESA fire danger rating
- NSW NPWS park alerts and closures

The builder confirms the exact machine-readable feed URLs and their terms first, and records them in SPEC > Open data sources. NPWS republishing permission is a separate open item, see "Needs a person" below.

**How it runs (decided 27 Nov 2026: a scheduled Railway job writing a file to R2):**

- **The job:**
  - It's the conditions worker from CLAUDE.md, in `apps/worker` with `WORKER_ROLES=conditions`.
  - It runs on a Railway schedule every 30 minutes and exits when done, so it costs cents a month.
  - Each run fetches every feed and matches alerts to parks (CAPAD names, NPWS park names) and to trails (fire weather district by location).
  - It writes `conditions/alerts.json` to the existing R2 bucket, served at `tiles.trailaroo.com/conditions/alerts.json` with a short cache (60 seconds).
  - The file holds each alert with its source, link, issue time and expiry, plus a fetch time and status for every feed.
- **The app:**
  - reads the file on the trail page and on Explore (for the open or closed filter and map markers)
  - always shows each alert's source and time
  - hides any alert past its expiry, checked in the browser at view time
  - shows "Alerts may be out of date, last checked 2 h ago. Check the official site." with a link when a feed's last good fetch is over 60 minutes old
  - never shows "no alerts" while the file is stale or missing
- **Monitoring:**
  - a failed feed fetch marks that feed as failing in the file and reports to Sentry
  - a Sentry cron monitor (check-in each run) alerts the maintainer when a run is missed
- **Later:** M3's API adds the `/ingest/conditions` endpoint, the Raspberry Pi failover and the `/status` page from SPEC > Hosting. M2's file on R2 is the interim, written so the same worker code can post to the API later.
- **Cost:** a few cents a month on Railway (runs of seconds). R2 writes and reads stay inside the free tier.

#### Rules for alerts (builder check, 27 Nov 2026; my calls, flagged for the maintainer)

- **The latest good fetch of a feed is the truth.**
  - An alert counts as current while it's in that feed's latest successful fetch.
  - If the alert has an end date, it also disappears after that date, checked in the browser.
  - Alerts with no end date (common in NPWS) show until they leave the feed. They're never given an invented lifetime.
- **Park alerts never mark a trail "closed" by guesswork.**
  - **"Closed"** is shown only when an alert names the trail (matched on name within that park) or says the whole park is closed.
  - **Every other alert for a park** shows on all of its trails as "Park alert: check before you go", with the headline, source, time and a link.
  - The Explore filter is **"Hide trails with closures"**. It only hides trails marked "Closed", never ones with a park-wide notice.
  - Until NPWS agrees to republishing, matching uses the headline only.
- **ACT closures:** there's no machine-readable ACT Parks feed known yet.
  - ACT trails show **"Park closures aren't tracked here yet. Check ACT Parks"** with a link. That state looks different from "no alerts".
  - ACT fire danger (ESA) is tracked.
  - Adding an ACT Parks source, if one exists or can be agreed, is a later step and doesn't block M2.
- **Offline:**
  - The service worker caches `alerts.json` and the weather responses for trails the person has opened (network first, falling back to the cache).
  - Offline, the trail page shows the last-known alerts and forecast with "You're offline. Last checked {time} ago", still hiding expired alerts.
  - It never shows "no alerts" from a cache it can't confirm.
  - The offline Playwright test covers this.
- **Who matches what:**
  - The worker matches alerts to **park names** (NPWS) and **fire weather districts** (RFS and ESA), and needs no trail list.
  - The nightly pipeline gives each trail its fire weather district, from district boundaries, and keeps its park name.
  - The browser joins the two at view time.
  - So the worker never goes out of step with the trail data, and it stays small enough for the Raspberry Pi later.
- **Missed-run alerting:** a Sentry cron monitor if the free plan allows one. If not, a free external heartbeat check (Healthchecks.io's free plan), which the worker pings at the end of each run. The maintainer gets an email either way.

### Trail pages, performance, hallway test

- **Server rendering, titles, link previews (Open Graph, with the first photo or a drawn cover) and structured data:** check the existing JSON-LD and add the photo, the park and `TouristTrip` or `Place` fields where valid.
- **Lighthouse 95+:** measured with mobile emulation and throttled 4G on the home, Explore and trail pages. The 200 KB first-load JS budget (excluding MapLibre) still holds. The place list and the weather and alerts panels load after the first paint.
- **Hallway test:** run by the maintainer with 5 people who've never seen the app. The builder supplies a one-page test script and a results template in `docs/`.

## Non-goals

- Accounts, saved lists, ratings, reviews or anything else that needs Postgres (M3)
- Street-address search or Photon
- Showing alerts for states other than NSW and ACT
- The `/status` page, Pi failover and ingest API (M3, after the API exists)
- Weather warnings beyond fire danger and park alerts. BoM warnings are a later source

## Anti-goals (would make M2 a failure even if everything "works")

- **Showing "no alerts" when we simply don't know.** Stale, missing or failing feeds must look different from "all clear".
- **Showing an expired alert, or an alert without its source and time.**
- **A filter that implies a trail doesn't allow dogs, or isn't wheelchair-friendly, because data is missing.**
- **Calling third-party servers from the browser for weather, places or alerts.** Photos and map tiles already come from our own CDN.
- **Blowing the JS budget or the Lighthouse target** by shipping the place list, weather or map extras in first-load JS.
- **New always-on paid services.** The conditions job runs on a schedule. Any PR adding cost states it monthly.

## Constraints (from CLAUDE.md and SPEC)

- Offline-first for anything used on the trail; all strings through i18n; units in metres and seconds, formatted at the edge; WCAG 2.2 AA; every map view has a list or text version (the alert markers and POIs included).
- Every data source attributed where it's shown: OSM, CAPAD, Mapterhorn, Commons, Wikidata, Open-Meteo, RFS, ESA, NPWS.
- Mock-ups lead: new UI (unified search, extra filters, map clusters, the alert and weather panels, the surface and steepness profile, top sights, exports) goes into `docs/mockups/` first.
- Small PRs, one per step, each with CodeRabbit and the post-feature reviews.

## Approaches considered

- **Place search:**
  - **A. Built-in place list (chosen).** $0, offline, private. No street addresses.
  - B. Self-hosted Photon. Full addresses, but about US$10–20 a month always on, against the running-costs decision.
- **Alerts polling:**
  - **A. Scheduled Railway job writing to R2 (chosen).** Polls even when nobody visits, costs cents, and is the conditions-worker design from CLAUDE.md.
  - B. Fetch on page view, with a 30-minute cache. No polling when idle, so a dead feed goes unnoticed. Too weak for safety.
  - C. GitHub Actions on a timer. Free, but runs can be delayed by up to an hour and are turned off after 60 days without repo activity.
- **Weather:** through our web server with a one-hour cache per grid cell (chosen), rather than straight from the browser (a privacy leak) or in the scheduled job (it would need forecasts for every cell, every run, for pages nobody opens).

## Suggested order (one PR each)

1. Mock-ups for all new M2 UI
2. Server rendering and Lighthouse baseline (quick wins; sets the budget)
3. Pipeline: place list, POIs, surface per way, derived tags with source, top sights, photo coordinates
4. Explore: unified search, new filters and sorts, location chooser, last viewed and recent searches
5. Explore map: clusters, "search this area", list and map sync
6. Trail page: header carousel, description, richer map, steepness and surface, top sights, tags, exports, nearby and similar
7. Weather and computed conditions
8. Conditions worker and alerts (the safety piece, with full attention)
9. 3D flyover and photo tour (cut first if needed)
10. Hallway test kit; SPEC ticks; move the deferred items into the M3–M7 checks

## Needs a person (not the builder)

- **NPWS permission to republish park alerts.** SPEC says to ask NPWS. Until they say yes, the builder shows NPWS alerts as a headline and time with a link to the NPWS page, not the full text. The maintainer sends the request.
- **Railway: creating the scheduled worker service** in the VextoApps workspace, and its R2 write credentials (a key scoped to the bucket). The maintainer creates the key and sets the variables.
- **Sentry cron monitor:** confirm the free plan's monitor allowance covers it.
- **The hallway test** with 5 people, and a real-phone check of the M1 gate before M2 starts.

## Left to the builder

- **Libraries:** fuzzy search (small and lazy-loaded), clustering (MapLibre's built-in GeoJSON clustering preferred), and GPX/KML writing (hand-written is fine). Check each with Context7.
- **Thresholds:** POI distance from the route, "nearby" distance, the steepness colour bands, and the computed-condition triggers. Record the chosen values in SPEC.
- **The exact grid size for the weather cache,** and the layout of `alerts.json`, as long as it carries source, link, issue time, expiry, per-feed fetch time and status.
