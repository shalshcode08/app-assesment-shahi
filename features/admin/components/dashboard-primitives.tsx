import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Chart ink. Marks use a single blue series throughout, so identity never
 * depends on hue; pass/fail status colours always ship with an icon and a text
 * label alongside them.
 */
export const VIZ = {
  axis: "#c3c2b7",
  critical: "#d03b3b",
  good: "#0ca30c",
  grid: "#e1e0d9",
  muted: "#898781",
  series: "#2a78d6",
  seriesSoft: "#cde2fb",
} as const;

/**
 * Accent tints. Chips sit near 1.15:1 against a white card, so the fill reads
 * as a wash; each foreground clears 4.6:1 on its own chip and 5:1 on white.
 */
export const TINT = {
  amber: { bg: "#f9eeda", fg: "#8a6410" },
  blue: { bg: "#e6f0fc", fg: "#2a6fc4" },
  green: { bg: "#e6f2e6", fg: "#2f7a33" },
  teal: { bg: "#e2f2ed", fg: "#1c7c62" },
  violet: { bg: "#ece9f8", fg: "#5b4bb0" },
} as const;

export const TINT_CYCLE = [
  TINT.blue,
  TINT.teal,
  TINT.violet,
  TINT.amber,
  TINT.green,
] as const;

/**
 * One surface treatment for every block on the page: 12px radius, hairline
 * border, 20px padding, no shadow. Consistency here is what separates a
 * dashboard from a pile of cards.
 */
export const SURFACE =
  "rounded-xl border border-border/60 bg-background";

export function Panel({
  action,
  children,
  className,
  description,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  title: string;
}) {
  return (
    <section className={cn(SURFACE, "p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyPlot({ message }: { message: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground">
      {message}
    </div>
  );
}
