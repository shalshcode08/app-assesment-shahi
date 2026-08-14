import { cn } from "@/lib/utils";

const QUESTION_STATUSES = [
  { label: "Answered", indicatorClassName: "bg-green-500" },
  { label: "Review Later", indicatorClassName: "bg-orange-500" },
  {
    label: "Not Visited",
    indicatorClassName: "border-2 border-neutral-300 bg-background",
  },
  { label: "Unanswered", indicatorClassName: "bg-neutral-300" },
] as const;

export function QuestionStatusLegend() {
  return (
    <ul
      aria-label="Question status legend"
      className="mx-auto grid w-fit grid-cols-[max-content_max-content] gap-x-16 gap-y-3"
    >
      {QUESTION_STATUSES.map((status) => (
        <li
          key={status.label}
          className="flex items-center gap-2 text-xs text-foreground/70"
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-3.5 shrink-0 rounded-full",
              status.indicatorClassName,
            )}
          />
          {status.label}
        </li>
      ))}
    </ul>
  );
}
