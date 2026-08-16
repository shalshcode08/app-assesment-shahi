import {
  Building2Icon,
  CircleCheckIcon,
  CircleXIcon,
  MailIcon,
  MapPinIcon,
  UserRoundIcon,
} from "lucide-react";

import type { ExamCandidate } from "@/features/exam/types";
import { cn } from "@/lib/utils";

type ResultCandidateOverviewProps = {
  candidate: ExamCandidate;
  correctAnswerCount: number;
  incorrectAnswerCount: number;
  isQualified: boolean;
  passingPercentage: number;
  scorePercentage: number;
};

export function ResultCandidateOverview({
  candidate,
  correctAnswerCount,
  incorrectAnswerCount,
  isQualified,
  passingPercentage,
  scorePercentage,
}: ResultCandidateOverviewProps) {
  const ResultIcon = isQualified ? CircleCheckIcon : CircleXIcon;

  return (
    <section aria-label="Candidate result summary">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
        <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-5 sm:col-span-2 lg:col-span-1 lg:min-h-48">
          <p className="text-sm font-semibold text-slate-600">
            Candidate details
          </p>

          <div className="mt-5 flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-slate-800 text-white">
              <UserRoundIcon aria-hidden="true" className="size-5" />
            </span>
            <h2 className="min-w-0 text-xl font-semibold text-foreground">
              {candidate.name}
            </h2>
          </div>

          <dl className="mt-6 grid gap-x-5 gap-y-4 sm:grid-cols-3 lg:mt-auto lg:pt-6">
            <div className="flex min-w-0 items-start gap-2.5">
              <MailIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-slate-500"
              />
              <div className="min-w-0">
                <dt className="text-[11px] text-slate-500">Email address</dt>
                <dd className="mt-0.5 truncate text-sm font-medium text-slate-800">
                  {candidate.email}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPinIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-slate-500"
              />
              <div>
                <dt className="text-[11px] text-slate-500">State / Region</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-800">
                  {candidate.region}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Building2Icon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-slate-500"
              />
              <div>
                <dt className="text-[11px] text-slate-500">
                  Training Center / Hub
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-800">
                  {candidate.hub}
                </dd>
              </div>
            </div>
          </dl>
        </div>

        <div className="flex min-h-40 w-full flex-col rounded-xl border border-[#d8e0ea] bg-[#f1f4f8] p-5 lg:min-h-48">
          <p className="text-sm font-semibold text-[#52657a]">
            Final score
          </p>
          <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
            <p className="text-4xl font-semibold tracking-[-0.025em] text-[#1f344d] tabular-nums">
              {scorePercentage}%
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs font-medium text-[#52657a]">
              <span>{correctAnswerCount} correct</span>
              <span aria-hidden="true" className="h-3 w-px bg-[#bac6d3]" />
              <span>{incorrectAnswerCount} incorrect</span>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "flex min-h-40 w-full flex-col rounded-xl border p-5 text-white lg:min-h-48",
            isQualified
              ? "border-green-600 bg-green-600"
              : "border-red-600 bg-red-600",
          )}
        >
          <p className="text-sm font-semibold text-white/85">
            Result status
          </p>
          <div className="flex flex-1 flex-col items-center justify-center py-3 text-center">
            <ResultIcon aria-hidden="true" className="size-12" />
            <p className="mt-3 text-xl font-semibold text-white">
              {isQualified ? "Qualified" : "Not qualified"}
            </p>
            <p className="mt-1.5 text-xs font-medium text-white/80">
              Required score: {passingPercentage}%
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
