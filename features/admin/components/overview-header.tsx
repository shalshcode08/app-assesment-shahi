import { ChartColumnIcon } from "lucide-react";

import { RefreshButton } from "@/features/admin/components/refresh-button";
import { SURFACE } from "@/features/admin/components/dashboard-primitives";

function formatGeneratedAt(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
}

export function OverviewHeader({
  generatedAt,
  subtitle,
}: {
  generatedAt: string;
  subtitle: string;
}) {
  return (
    <section className={`${SURFACE} p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            <ChartColumnIcon aria-hidden="true" className="size-3.5" />
            Admin Management Portal
          </span>
          <h1 className="mt-3 text-lg font-semibold tracking-[-0.01em] text-foreground">
            Trainer Analytics Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Updated {formatGeneratedAt(generatedAt)}
          </span>
          <RefreshButton />
        </div>
      </div>
    </section>
  );
}
