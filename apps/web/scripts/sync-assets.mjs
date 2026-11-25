// Copies shared assets from the approved mock-ups into public/, so the app and the
// mock-ups use the same icons and font (CLAUDE.md > Design reference).
import { cpSync, mkdirSync } from "node:fs";

const mockups = new URL("../../../docs/mockups/", import.meta.url);
const pub = new URL("../public/", import.meta.url);
mkdirSync(new URL("fonts/", pub), { recursive: true });
cpSync(new URL("icons.svg", mockups), new URL("icons.svg", pub));
cpSync(new URL("fonts/PublicSans-Variable.ttf", mockups), new URL("fonts/PublicSans-Variable.ttf", pub));
cpSync(new URL("fonts/OFL.txt", mockups), new URL("fonts/OFL.txt", pub));
