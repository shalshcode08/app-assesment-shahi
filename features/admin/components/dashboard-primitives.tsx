import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Chart ink. Blue stays the default single series, so a lone chart never asks
 * the reader to decode a hue. Where a chart genuinely carries two or more
 * meanings at once it draws from CATEGORICAL, and every such chart ships a
 * legend; pass/fail status colours always travel with an icon and a word.
 */
export const VIZ = {
  axis: "#c3c2b7",
  critical: "#d03b3b",
  criticalSoft: "#fbeaea",
  good: "#0ca30c",
  goodSoft: "#dcf1dc",
  grid: "#e1e0d9",
  muted: "#898781",
  series: "#2a78d6",
  seriesDeep: "#1b558f",
  seriesSoft: "#cde2fb",
  warn: "#c9821a",
  warnSoft: "#fbeedb",
} as const;

/** Categorical ink for charts that carry more than one series at a time. */
export const CATEGORICAL = [
  "#2a78d6",
  "#1c7c62",
  "#5b4bb0",
  "#c9821a",
  "#b5476b",
  "#357a9e",
] as const;

/**
 * Accent tints. Chips sit near 1.15:1 against a white card, so the fill reads
 * as a wash; each foreground clears 4.6:1 on its own chip and 5:1 on white.
 */
export const TINT = {
  amber: { bg: "#f9eeda", fg: "#8a6410" },
  blue: { bg: "#e6f0fc", fg: "#2a6fc4" },
  green: { bg: "#e6f2e6", fg: "#2f7a33" },
  red: { bg: "#fbeaea", fg: "#b23232" },
  rose: { bg: "#f9e8ee", fg: "#9c3457" },
  slate: { bg: "#eceef1", fg: "#4b5563" },
  teal: { bg: "#e2f2ed", fg: "#1c7c62" },
  violet: { bg: "#ece9f8", fg: "#5b4bb0" },
} as const;

export type Tint = (typeof TINT)[keyof typeof TINT];

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
export const SURFACE = "rounded-xl border border-border/60 bg-background";

export function formatDuration(totalSeconds: number | null) {
  if (totalSeconds === null || Number.isNaN(totalSeconds)) {
    return "—";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function formatPercent(value: number | null, digits = 0) {
  return value === null ? "—" : `${value.toFixed(digits)}%`;
}

export function formatNumber(value: number | null, digits = 1) {
  return value === null ? "—" : value.toFixed(digits);
}

export function Panel({
  action,
  children,
  className,
  description,
  icon: Icon,
  title,
  tint,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  icon?: LucideIcon;
  title: string;
  tint?: Tint;
}) {
  return (
    <section className={cn(SURFACE, "flex min-w-0 flex-col p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon ? (
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: (tint ?? TINT.blue).bg,
                color: (tint ?? TINT.blue).fg,
              }}
            >
              <Icon className="size-4" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-foreground">{title}</h2>
            {description ? (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
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

/** A single headline number, with the unit of measure spelled out under it. */
export function StatTile({
  hint,
  icon: Icon,
  label,
  meter,
  tint = TINT.blue,
  value,
}: {
  hint: string;
  icon?: LucideIcon;
  label: string;
  /** 0–100. Draws a hairline bar under the value for share-of-total figures. */
  meter?: number | null;
  tint?: Tint;
  value: string;
}) {
  return (
    <div className={cn(SURFACE, "min-w-0 p-4")}>
      <div className="flex items-center gap-2">
        {Icon ? (
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: tint.bg, color: tint.fg }}
          >
            <Icon className="size-3.5" />
          </span>
        ) : null}
        <p className="truncate text-xs font-medium text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-2.5 text-2xl font-semibold tracking-[-0.02em] text-foreground tabular-nums">
        {value}
      </p>
      {meter !== undefined && meter !== null ? (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: tint.fg,
              width: `${Math.max(0, Math.min(100, meter))}%`,
            }}
          />
        </div>
      ) : null}
      <p className="mt-1.5 text-xs leading-4 text-muted-foreground/85">{hint}</p>
    </div>
  );
}

/** Label/value pairs for the dense read-out inside an expanded chart. */
export function StatGrid({
  items,
}: {
  items: { hint?: string; label: string; value: string }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-background p-3.5">
          <dt className="truncate text-xs text-muted-foreground">
            {item.label}
          </dt>
          <dd className="mt-1 text-base font-semibold text-foreground tabular-nums">
            {item.value}
          </dd>
          {item.hint ? (
            <dd className="mt-0.5 text-xs text-muted-foreground/85">
              {item.hint}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

/** Legend for any chart where more than one colour is load-bearing. */
export function Legend({
  items,
}: {
  items: { color: string; icon?: LucideIcon; label: string }[];
}) {
  return (
    <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          {item.icon ? (
            <item.icon
              aria-hidden="true"
              className="size-3.5"
              style={{ color: item.color }}
            />
          ) : (
            <span
              aria-hidden="true"
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: item.color }}
            />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Compact read-out table for the numbers behind an expanded chart. */
export function DataTable({
  columns,
  rows,
}: {
  columns: { align?: "left" | "right"; key: string; label: string }[];
  rows: { cells: Record<string, ReactNode>; key: string }[];
}) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40 text-xs font-semibold text-foreground/75">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "px-4 py-2.5",
                  column.align === "right" && "text-right",
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className="border-b border-border/40 last:border-0"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "px-4 py-2.5 text-foreground/85 tabular-nums",
                    column.align === "right" && "text-right",
                  )}
                >
                  {row.cells[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
