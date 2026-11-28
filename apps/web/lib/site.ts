/** The public address of the site, for absolute links in metadata and JSON-LD. */
/** No trailing slash, so `${SITE_URL}/path` never doubles it. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** Size of the link-preview image at /trails/{slug}/cover.png. */
export const OG_SIZE = { width: 1200, height: 630 };
