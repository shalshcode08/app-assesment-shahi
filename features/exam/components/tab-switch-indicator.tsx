import { EyeIcon, EyeOffIcon } from "lucide-react";

/**
 * A quiet, always-visible reading of the rule. It stays neutral while the
 * candidate is within their allowance and turns amber on the last one, so the
 * limit is never a surprise at the moment it is enforced.
 */
export function TabSwitchIndicator({
  className,
  count,
  limit,
}: {
  className?: string;
  count: number;
  limit: number | null;
}) {
  if (limit === null && count === 0) {
    return null;
  }

  const isLast = limit !== null && count >= limit;
  const Icon = count === 0 ? EyeIcon : EyeOffIcon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium tabular-nums ${
        isLast
          ? "bg-amber-500/12 text-amber-700 dark:text-amber-400"
          : "bg-muted text-muted-foreground"
      } ${className ?? ""}`}
      title="Leaving this tab is recorded"
    >
      <Icon aria-hidden="true" className="size-3.5" />
      <span className="sr-only">Tab switches used: </span>
      {limit === null ? (
        <>
          {count} tab switch{count === 1 ? "" : "es"}
        </>
      ) : (
        <>
          {count}/{limit} tab switches
        </>
      )}
    </span>
  );
}
