import { Building2Icon, MapPinIcon, UserRoundIcon } from "lucide-react";

import type { ExamCandidate } from "@/features/exam/types";
import { cn } from "@/lib/utils";

export function CandidateSummary({
  candidate,
  className,
  showLocation = false,
}: {
  candidate: ExamCandidate;
  className?: string;
  showLocation?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="hidden text-right sm:block">
        <p className="text-xs font-semibold text-foreground/85">
          {candidate.name}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {candidate.email}
        </p>
      </div>
      {showLocation ? (
        <div className="hidden items-center gap-4 border-l pl-4 xl:flex">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPinIcon aria-hidden="true" className="size-3.5" />
            {candidate.region}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Building2Icon aria-hidden="true" className="size-3.5" />
            {candidate.hub}
          </span>
        </div>
      ) : null}
      <span className="grid size-8 place-items-center rounded-full border bg-muted/60">
        <UserRoundIcon
          aria-hidden="true"
          className="size-4 text-foreground/55"
        />
      </span>
    </div>
  );
}
