# Trailaroo

A free, open, community-driven trail app: find, plan, record and share hikes, rides and more. It's an installable web app (PWA) built on open data, with every feature free. Think AllTrails, but open.

- **Status:** M0, first trails live: ACT walking routes as a list, map and trail pages, installable, early preview.
- **Spec:** [docs/SPEC.md](docs/SPEC.md)
- **How we build:** [docs/KICKOFF.md](docs/KICKOFF.md) and [CLAUDE.md](CLAUDE.md)
- **Launch region:** ACT and NSW, Australia, then the rest of Australia, then global
- **Licence:** AGPL-3.0 (code), ODbL (trail data). Map data © OpenStreetMap contributors.

## Run it

You need Node 24 and pnpm 10 (`corepack enable` sets up pnpm).

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000. That's all: trail data and the ACT map are in the repo, and no database or accounts are needed yet.

Checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build && pnpm e2e` for the browser tests (the first run needs `pnpm --filter @trailaroo/web exec playwright install chromium`).

Maintainers refresh the trail data with `pnpm data:trails` (needs `osmium-tool` and the Geofabrik Australia extract in `.data/`; see the script header).
