import { type Difficulty, t } from "@trailaroo/core";

/** Difficulty in colour, shape and word, so colour is never the only signal (SPEC > Accessibility). */
export function DifficultyBadge({ level }: { level: Difficulty }) {
  return (
    <span className="difficulty" data-level={level}>
      <svg aria-hidden="true"><use href={`/icons.svg#d-${level}`} /></svg>
      {t(`difficulty.${level}`)}
    </span>
  );
}
