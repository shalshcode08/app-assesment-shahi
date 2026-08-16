import Link from "next/link";
import {
  Building2Icon,
  CircleCheckIcon,
  CircleXIcon,
  Clock3Icon,
  EyeIcon,
  MapPinIcon,
  TargetIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";

import type { TrainerRow } from "@/features/admin/data/get-admin-trainers";
import { TINT, VIZ } from "@/features/admin/components/dashboard-primitives";

function HeadCell({
  align = "center",
  className,
  icon: Icon,
  label,
}: {
  align?: "left" | "center";
  className?: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <th
      scope="col"
      className={`py-3 text-xs font-semibold text-foreground/75 ${className ?? "px-3"}`}
    >
      <span
        className={`flex items-center gap-1.5 ${align === "center" ? "justify-center" : ""}`}
      >
        <Icon aria-hidden="true" className="size-3.5 text-muted-foreground" />
        {label}
      </span>
    </th>
  );
}

/** Status carries an icon and a word, never colour alone. */
function StatusBadge({
  qualified,
  status,
}: {
  qualified: boolean | null;
  status: string;
}) {
  if (status !== "submitted") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
        <Clock3Icon aria-hidden="true" className="size-3.5" />
        {status === "in_progress" ? "In progress" : "Not started"}
      </span>
    );
  }

  return qualified ? (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
      style={{ backgroundColor: TINT.green.bg, color: VIZ.good }}
    >
      <CircleCheckIcon aria-hidden="true" className="size-3.5" />
      Qualified
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
      style={{ backgroundColor: "#fbeaea", color: VIZ.critical }}
    >
      <CircleXIcon aria-hidden="true" className="size-3.5" />
      Not qualified
    </span>
  );
}

export function TrainerTable({ trainers }: { trainers: TrainerRow[] }) {
  if (trainers.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-border/60 text-sm text-muted-foreground">
        No trainers match these filters.
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full min-w-[940px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40">
            <HeadCell
              align="left"
              icon={UserRoundIcon}
              label="Trainer name & email"
              className="px-5"
            />
            <HeadCell icon={MapPinIcon} label="State" />
            <HeadCell icon={Building2Icon} label="Skill centre" />
            <HeadCell icon={TargetIcon} label="Score" />
            <HeadCell icon={CircleCheckIcon} label="Status" />
            <HeadCell icon={EyeIcon} label="Action" className="px-5" />
          </tr>
        </thead>
        <tbody>
          {trainers.map((trainer) => (
            <tr
              key={trainer.attemptId}
              className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
            >
              <td className="px-5 py-4">
                <span className="block font-medium text-foreground">
                  {trainer.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {trainer.email}
                </span>
              </td>
              <td className="px-3 py-4 text-center text-foreground/80">
                {trainer.region}
              </td>
              <td className="px-3 py-4 text-center text-foreground/80">
                {trainer.hub}
              </td>
              <td className="px-3 py-4 text-center tabular-nums">
                {trainer.status === "submitted" ? (
                  <>
                    <span className="font-medium text-foreground">
                      {trainer.scoreObtained ?? 0}/{trainer.maximumScore ?? 0}
                    </span>
                    <span className="ml-1.5 text-muted-foreground">
                      (
                      {trainer.scorePercentage === null
                        ? "—"
                        : `${Math.round(trainer.scorePercentage)}%`}
                      )
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-4 text-center">
                <StatusBadge
                  qualified={trainer.qualified}
                  status={trainer.status}
                />
              </td>
              <td className="px-5 py-4 text-center">
                <Link
                  href={`/admin/trainers/${trainer.attemptId}`}
                  style={{
                    backgroundColor: TINT.blue.bg,
                    color: TINT.blue.fg,
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                >
                  <EyeIcon aria-hidden="true" className="size-3.5" />
                  View report
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
