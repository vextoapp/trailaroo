// Copies shared assets from the approved mock-ups into public/, so the app and the
// mock-ups use the same icons and home photos (CLAUDE.md > Design reference).
import { cpSync, mkdirSync } from "node:fs";

const mockups = new URL("../../../docs/mockups/", import.meta.url);
const pub = new URL("../public/", import.meta.url);
cpSync(new URL("icons.svg", mockups), new URL("icons.svg", pub));
// Home page photos (Wikimedia Commons, credited in components/home-photos.ts).
mkdirSync(new URL("photos/home/", pub), { recursive: true });
for (const id of ["gudgenby", "wetlands-view", "mulligans-echidna", "pine-island", "ainslie-lookout"]) {
  cpSync(new URL(`photos/${id}.jpg`, mockups), new URL(`photos/home/${id}.jpg`, pub));
}
