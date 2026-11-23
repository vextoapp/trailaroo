# Design: mock-ups and project CLAUDE.md

Date: 23 Nov 2026 · Status: approved

## Intent

Real hikers in the ACT and NSW use Open Trails on the trail, and an open-source community of developers maintains it. The mock-ups are the agreed design reference both audiences build against, so the look is settled before M0 and nobody restyles screens later (SPEC > Design system and UX).

## Goals

- Six screens: Explore, Trail page, Record, Saved, Activity, Profile.
- Each shown on mobile (390 px) and desktop (1280 px), in dark and light.
- Clickable: tabs and desktop sidebar move between screens; filter chips toggle; Explore flips list ⇄ map; the Trail page elevation profile scrubs and highlights the matching point on the map; Record has start, pause, pocket mode and a gap-repair banner.
- A shared `tokens.css` (colour, type, spacing, radius, six activity-family colours) named so M0 can feed it into Tailwind.
- Lead with the "on foot" family (best ACT data at launch); all six families still appear in chips, filters and icons.

## Non-goals

- No app code, real maps, live data or backend.
- No screens beyond the six (route builder, For you as its own page, settings sub-pages).

## Anti-goals

- Anything that reads as a copy of AllTrails.
- Upsell or engagement patterns.
- Meaning carried by colour alone (difficulty = colour + shape + word).
- Small text on the Record screen.
- Mock-ups calling third-party services (map tiles, fonts, analytics).

## Approaches considered

1. **Plain HTML/CSS + shared tokens + small vanilla JS** (picked). No build step; anyone opens the files or GitHub Pages serves them; tokens carry straight into M0.
2. HTML with Tailwind CDN. Closer to the stack, but class-heavy markup is harder for non-developers to review and the CDN setup is thrown away in M0.
3. React/Storybook prototype. Effectively app code before the plan is approved; ruled out.

## Decisions

- Work tracked in GitHub Issues + a GitHub Project board, not Linear (contributors must see it). Project rule overrides the global one.
- Railway workspace: VextoApps (Pro). Maintainers deploy; contributors use preview deploys.
- Work lands on `main` (user's choice), small commits, ask before pushing.

## Structure

```
docs/mockups/
  index.html        gallery: each screen in phone + desktop frames, theme switch (dark / light / system)
  looks.html        two-look comparison (eucalyptus vs signal-orange), checkpoint before the rest
  tokens.css        design tokens
  mockups.css       shared components (cards, chips, bottom sheet, stats row, map controls, elevation chart, rating summary, condition badge)
  mockups.js        theme, navigation, small interactions
  fonts/            self-hosted open-licence fonts (download needs user's OK)
  explore.html  trail.html  record.html  saved.html  activity.html  profile.html
```

Each screen is one responsive page; the gallery frames it at both widths via iframes.

## Content

- Real ACT trail names (Mt Ainslie, Gibraltar Peak, Booroomba Rocks, Mt Tennent, Square Rock, Red Hill), stats labelled as sample data.
- Maps and photos are drawn SVG/gradient placeholders.
- Fire danger and park alerts always show source and time; attribution line on every map.

## Builder's calls

- Font choice within each look; exact token values (checked for WCAG AA contrast by script).
- Copy and sample numbers.

## Verification

Open every screen at both widths and both themes in the browser; script contrast check; then web-design-guidelines and code-simplifier passes.
