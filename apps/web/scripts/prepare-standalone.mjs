// next build's standalone output leaves out static files and public/; copy them in so
// `pnpm start` (and the Docker image) serve a complete app.
import { cpSync } from "node:fs";

const app = new URL("../", import.meta.url);
const out = new URL(".next/standalone/apps/web/", app);
cpSync(new URL(".next/static/", app), new URL(".next/static/", out), { recursive: true });
cpSync(new URL("public/", app), new URL("public/", out), { recursive: true });
