import { HOME_AREA, t } from "@trailaroo/core";
import { Icon } from "./icon";

/** Says plainly what this early build does and doesn't show (CLAUDE.md > Non-negotiables: safety info). */
export function PreviewBanner() {
  return (
    <div className="notice preview-banner" data-severity="warning" role="note">
      <Icon id="i-info" />
      <p>{t("preview.banner", { area: HOME_AREA.name })}</p>
    </div>
  );
}
