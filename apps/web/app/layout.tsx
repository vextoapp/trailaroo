import { SerwistProvider } from "@serwist/turbopack/react";
import { APP_NAME, DEFAULT_LOCALE, SEEN_HOME_KEY, THEME_KEY, t } from "@trailaroo/core";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/site";
import { appBodyFont, appDisplayFont } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: APP_NAME,
  title: { default: `${APP_NAME}: ${t("home.titleTag")}`, template: `%s · ${APP_NAME}` },
  description: t("meta.description"),
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  openGraph: { type: "website", siteName: APP_NAME, locale: "en_AU" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Same values as --bg in docs/mockups/tokens.css.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#14110E" },
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
  ],
};

// Runs before first paint so the page never flashes the wrong theme, and so returning visitors
// never see the "New here?" strip appear and vanish (it hides with html[data-seen-home]).
const themeScript = `(function(){var m,h;try{m=localStorage.getItem(${JSON.stringify(THEME_KEY)});h=localStorage.getItem(${JSON.stringify(SEEN_HOME_KEY)})}catch(e){}var r=document.documentElement,d=m==="light"||m==="dark"?m:(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");r.dataset.theme=d;if(h)r.dataset.seenHome=""})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} className={`${appBodyFont.variable} ${appDisplayFont.variable}`} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static theme bootstrap, no user input */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {/* No reload on reconnect: it would throw away what a person is doing (Chrome can even fire "online"
            while offline, cancelling the link they tapped). Only the offline page reloads (ReloadWhenOnline). */}
        <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === "development"} reloadOnOnline={false}>
          <a className="skip" href="#main">{t("skip")}</a>
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
