import localFont from "next/font/local";

// Self-hosted, Latin-only variable fonts (OFL) from Fontsource. No calls to font servers.
// Names differ from the mock-ups' "Public Sans"/"Fraunces" @font-face rules on purpose: font names are
// case-insensitive, and a clash makes the browser download the mock-ups' large TTF files too.
export const appBodyFont = localFont({
  src: "../node_modules/@fontsource-variable/public-sans/files/public-sans-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-public-sans",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

// Headlines only. The "full" file keeps the SOFT axis the Golden hour look uses.
export const appDisplayFont = localFont({
  src: "../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2",
  weight: "100 900",
  variable: "--font-fraunces",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});
