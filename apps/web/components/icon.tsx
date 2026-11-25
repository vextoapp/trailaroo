/** An icon from the shared sprite (docs/mockups/icons.svg). Decorative unless labelled by its parent. */
export function Icon({ id, small = false, className = "" }: { id: string; small?: boolean; className?: string }) {
  return (
    <svg className={`${small ? "icon-s" : "icon"} ${className}`.trim()} aria-hidden="true">
      <use href={`/icons.svg#${id}`} />
    </svg>
  );
}
