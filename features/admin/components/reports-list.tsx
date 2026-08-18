"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BuildingIcon,
  CalendarIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  ListChecksIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SURFACE } from "@/features/admin/components/dashboard-primitives";
import { REPORTS, type ReportId } from "@/features/admin/reports";

const ICONS: Record<ReportId, LucideIcon> = {
  attempts: FileSpreadsheetIcon,
  centres: BuildingIcon,
  questions: ListChecksIcon,
  trainers: UsersIcon,
};

export function ReportsList({
  counts,
  from,
  to,
}: {
  counts: Record<ReportId, number>;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // The range lives in the URL so the row counts on each card are counts for
  // the range the download will actually use.
  function apply(next: { from?: string; to?: string }) {
    const params = new URLSearchParams();
    const nextFrom = next.from ?? from;
    const nextTo = next.to ?? to;

    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);

    startTransition(() => {
      router.push(`/admin/reports${params.size ? `?${params}` : ""}`);
    });
  }

  function hrefFor(report: ReportId) {
    const params = new URLSearchParams({ report });

    if (from) params.set("from", from);
    if (to) params.set("to", to);

    return `/admin/reports/export?${params.toString()}`;
  }

  const hasRange = Boolean(from || to);

  return (
    <div className="flex flex-col gap-3" data-pending={isPending ? "" : undefined}>
      <div className={`${SURFACE} flex flex-wrap items-end gap-3 p-4`}>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CalendarIcon
              aria-hidden="true"
              className="size-4 text-blue-600 dark:text-blue-400"
            />
            Date range
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Optional. Filters every report by the day the attempt was submitted.
            Leave blank for everything on record.
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            From
            <Input
              className="h-9 w-40"
              max={to || undefined}
              defaultValue={from}
              onChange={(event) => apply({ from: event.target.value })}
              type="date"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            To
            <Input
              className="h-9 w-40"
              min={from || undefined}
              defaultValue={to}
              onChange={(event) => apply({ to: event.target.value })}
              type="date"
            />
          </label>
          {hasRange ? (
            <Button
              onClick={() => apply({ from: "", to: "" })}
              size="lg"
              type="button"
              variant="ghost"
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {REPORTS.map((report) => {
          const Icon = ICONS[report.id];
          const count = counts[report.id];

          return (
            <section className={`${SURFACE} flex flex-col p-4`} key={report.id}>
              <div className="flex items-start gap-2">
                <Icon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-green-700/80 dark:text-green-400/80"
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-foreground">
                    {report.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {report.description}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                {report.useCase}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {count} row{count === 1 ? "" : "s"}
                  {hasRange ? " in this range" : ""} ·{" "}
                  {report.columns.length} columns
                </span>
                {count === 0 ? (
                  // An anchor cannot be disabled, so an empty report gets a
                  // real button that goes nowhere.
                  <Button disabled size="lg" type="button" variant="outline">
                    <DownloadIcon aria-hidden="true" />
                    Download Excel
                  </Button>
                ) : (
                  <Button
                    nativeButton={false}
                    render={<a download href={hrefFor(report.id)} />}
                    size="lg"
                    variant="outline"
                  >
                    <DownloadIcon aria-hidden="true" />
                    Download Excel
                  </Button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
