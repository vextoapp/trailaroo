# Kickoff: getting Trailaroo into Claude Code

## 1. Set up (about 30 minutes)

1. Create a **public** GitHub repo (for example `open-trails`).
2. Copy in the files from this pack:
   - `CLAUDE.md` → repo root
   - `docs/SPEC.md` → `docs/SPEC.md`
   - `docs/KICKOFF.md` → `docs/KICKOFF.md`
3. Create the M0 accounts from SPEC > "Accounts and keys to set up": Railway, a domain, Resend, Sentry, a Google OAuth client and the Apple Developer Program. Keep the keys handy; Claude Code will create `.env.example` and tell you where each one goes.
4. Open the repo in Claude Code.

## 2. Session prompts, in order

Run each step in its own session, starting in **plan mode**. Review the plan before letting it build.

1. **Design first:** "Read CLAUDE.md and docs/SPEC.md, especially Design system, Activities and Feature inventory. Create clickable HTML mock-ups in docs/mockups/ for Explore, Trail page, Record, Saved, Activity and Profile, mobile and desktop, dark and light. Don't write app code yet."
   Iterate until you like the look.
2. **M0:** "Plan M0 from docs/SPEC.md > Build order, then build it: monorepo, CI (lint, typecheck, tests, axe, Lighthouse), Postgres + PostGIS via Docker Compose, the Drizzle schema from Data model, Better Auth, design tokens and components matching the approved mock-ups, LICENSE (AGPL-3.0), CONTRIBUTING.md, CODE_OF_CONDUCT.md, docs/ATTRIBUTION.md, and Railway deploys for previews and production. Stop when the M0 acceptance checks pass and tick them in SPEC."
3. **M1:** "Plan and build M1 for the ACT and NSW: OSM import into PostGIS, trails from route relations for every activity family, stats from Mapterhorn terrain, CAPAD parks, the Protomaps extract and our trail overlay as PMTiles on R2, BRouter with one profile per activity family, and a Photon index. Include pnpm db:seed with 50 real ACT trails across several activities."
4. **M2 to M8:** "Plan M<n> from docs/SPEC.md, build it, run its acceptance checks, and tick them in SPEC."
5. **Raspberry Pi (after M3):** "Using SPEC > Hosting > Raspberry Pi conditions worker, write docs/PI_SETUP.md with step-by-step setup for my Pi 3 B+, and make sure the worker image builds for arm64. Add the heartbeat, failover and /status page if they aren't built yet."

## 3. Between milestones

- Test each **gate** yourself on a real phone (iPhone and Android) before starting the next phase.
- If you change a decision, ask Claude Code to update the "Decisions made" table in SPEC and CLAUDE.md, so later sessions don't undo it.
- Keep sessions to one milestone. Long sessions drift; the spec and CLAUDE.md are what carry context between them.
