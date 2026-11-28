/** The one place the app name lives (CLAUDE.md > Decisions). */
export const APP_NAME = "Trailaroo";

/** Default map view and "near" reference until the user shares a location: Canberra CBD; Explore's map opens on bbox. */
export const HOME_AREA = { name: "Canberra", lon: 149.13, lat: -35.2809, bbox: [148.76, -35.93, 149.4, -35.12] } as const;

export const DEFAULT_LOCALE = "en-AU";

/** localStorage key for the chosen theme. */
export const THEME_KEY = "theme";
/** Local-storage key set once a visitor has seen home or Explore; trail pages then hide "New here?". */
export const SEEN_HOME_KEY = "seen-home";
