"use client";

import { useId } from "react";
import { InfoIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type QuestionStatusSummaryProps = {
  answeredCount: number;
  notVisitedCount: number;
  reviewLaterCount: number;
  unansweredCount: number;
};

const statusItems = [
  { key: "answered", label: "Answered", indicatorClassName: "bg-green-500" },
  {
    key: "reviewLater",
    label: "Review Later",
    indicatorClassName: "bg-orange-500",
  },
  {
    key: "unanswered",
    label: "Unanswered",
    indicatorClassName: "bg-neutral-300",
  },
  {
    key: "notVisited",
    label: "Not Visited",
    indicatorClassName: "border border-neutral-300 bg-white",
  },
] as const;

export function QuestionStatusSummary({
  answeredCount,
  notVisitedCount,
  reviewLaterCount,
  unansweredCount,
}: QuestionStatusSummaryProps) {
  const tooltipId = useId();
  const counts = {
    answered: answeredCount,
    notVisited: notVisitedCount,
    reviewLater: reviewLaterCount,
    unanswered: unansweredCount,
  };

  return (
    <div className="group relative flex justify-start">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="View question status summary"
        aria-describedby={tooltipId}
        className="text-neutral-400 hover:bg-transparent hover:text-neutral-600"
      >
        <InfoIcon aria-hidden="true" className="size-3.5" />
      </Button>

      <div
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute top-full left-0 z-20 mt-1.5 w-52 -translate-y-1 rounded-lg border border-neutral-200 bg-background p-3 opacity-0 shadow-md transition-[opacity,transform] duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
      >
        <p className="mb-2 text-xs font-semibold text-foreground">
          Question status
        </p>
        <dl className="space-y-2">
          {statusItems.map((item) => (
            <div key={item.key} className="flex items-center gap-2 text-xs">
              <span
                aria-hidden="true"
                className={`size-2.5 shrink-0 rounded-full ${item.indicatorClassName}`}
              />
              <dt className="flex-1 text-muted-foreground">{item.label}</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {counts[item.key]}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
