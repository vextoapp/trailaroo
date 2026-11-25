# Trailaroo

Free, open, community-driven trail app (AllTrails alternative). Installable PWA, with a Capacitor app-store wrapper added in M8.
The full product spec is docs/SPEC.md. Read the relevant section before starting any task. Decisions are in SPEC > Risks and open questions > Decisions made.

## Who it's for
- Hikers in the ACT and NSW using it on the trail: offline, accurate safety info and honest recording come first.
- Open-source contributors maintaining it: a fresh clone runs with one command, decisions are written down in public, and this file only holds rules every contributor needs.
- Success means both: real hikers rely on it, and people other than the founder keep it going.

## Decisions (do not change without asking)
- Work is tracked in GitHub Issues and a GitHub Project board (milestones M0–M8, one label per activity family). Not Linear.
- Railway workspace: VextoApps (Pro). Maintainers deploy; contributors use PR preview deploys. Confirm the workspace before creating anything on Railway.
- Running costs stay near zero until launch (SPEC > Decisions > Running costs): only the services the current milestone needs, free tiers first, and any PR adding a paid service or always-on process states its monthly cost.
- Licence: AGPL-3.0, public repo. Data: ODbL dump of the trail database; community text CC BY-SA.
- Launch region: ACT + NSW first, then Australia, then global. Region list is config, not code.
- Activities: all 20 AllTrails activities, grouped into 6 families (SPEC > Activities). Difficulty, routing and recording presets are per family.
- Background GPS: web records screen-on only. Keep all GPS access behind one LocationSource interface so a native Capacitor source can plug in at M8.
- App name is one config value (APP_NAME); never hard-code it.
- Conditions worker must run on Railway (amd64) or a Raspberry Pi 3 B+ (arm64, 1 GB RAM): WORKER_ROLES env var, outbound-only ingest via device token, heartbeat with 45-minute Railway failover, under 300 MB RAM (SPEC > Hosting > Raspberry Pi conditions worker).

## Non-negotiables
- Every feature is free. Never add paywalls, upsells or ad trackers.
- Offline-first: anything used on the trail must work in flight mode.
- Privacy by default: recordings private, privacy zones, no third-party analytics.
- Accessibility: WCAG 2.2 AA. Every map view has a list or text version.
- Never call tile.openstreetmap.org, public Overpass or public Nominatim from the app. Use our own services.
- Attribute every data source wherever data is shown (SPEC > Open data sources).
- Safety info (closures, fire danger, alerts) is never hidden, cached past its expiry, or shown without its source and time.

## Stack
- Monorepo: pnpm + Turborepo. apps/web, apps/api, apps/worker, packages/db, packages/core, packages/ui, infra/pipelines.
- Web: Next.js (App Router) + TypeScript (strict) + Tailwind + Radix-based components; MapLibre GL JS + PMTiles; Serwist service worker; Dexie (IndexedDB); TanStack Query.
- API: Hono on Node, Zod schemas, OpenAPI generated; public read API.
- DB: Postgres 16 + PostGIS; Drizzle ORM and migrations; UUIDv7 ids.
- Jobs: BullMQ on Redis (imports, stats, tiles, feeds, notifications, overdue alerts).
- Auth: Better Auth (passkeys, email magic link, Google; Apple in M8).
- Storage: Cloudflare R2 (PMTiles, terrain, photos) behind CDN.
- Self-hosted services: Photon (place search), BRouter (routing, one profile per activity family).
- Hosting: Railway (web, api, worker, Postgres, Redis, Photon, BRouter). Each service arrives in the milestone that first needs it; M0 is the web app alone.
- Errors: Sentry. Email: Resend. Analytics: cookieless, first-party (Umami or Plausible).

## Conventions
- TypeScript strict; no `any`. Zod at every boundary.
- Every client write goes through the offline outbox with an idempotency key.
- Geometry in EPSG:4326; distances in metres; times in seconds; format at the edge. Units and locale from user settings (en-AU default).
- All user-facing strings through i18n.
- Secrets only in env vars; keep .env.example current; never commit .env.
- Tests: Vitest for logic, Playwright for flows (including an offline flow and a recording flow with mocked GPS), axe checks in CI.
- Performance budget: under 200 KB JS on first load excluding MapLibre; Lighthouse 95+.
- One milestone at a time, small PRs. Use plan mode before each milestone. Tick the acceptance checks in docs/SPEC.md when done; record any changed decision in SPEC.

## Design reference
- docs/mockups/ is the approved look. docs/mockups/tokens.css is the source for the M0 design tokens.
- Change the mock-ups first, then the app, so they never drift apart.
- View: python3 -m http.server 4173 --directory docs/mockups, then open http://localhost:4173. Opening the file from disk hides the icons, because browsers block the shared icon file there. Check: node docs/mockups/check.mjs.

## Commands
- node docs/mockups/check.mjs (mock-up checks: contrast, no external calls, links; works before M0)
- pnpm dev / pnpm test / pnpm lint / pnpm typecheck / pnpm e2e
- pnpm db:migrate / pnpm db:seed (loads ACT sample data)
