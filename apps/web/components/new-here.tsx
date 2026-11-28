import { APP_NAME, t } from "@trailaroo/core";
import Link from "next/link";

/** A light strip for people who arrive on a shared trail link. Never blocks the trail.
 *  Rendered on the server and hidden before first paint for returning visitors (see the
 *  bootstrap script in app/layout.tsx), so it never pushes the trail down after load. */
export function NewHere() {
  return (
    <div className="newhere" role="note">
      <span>{t("newHere.text", { app: APP_NAME })}</span>
      <Link href="/">{t("newHere.link")}</Link>
    </div>
  );
}
