"use client";

import { Dialog } from "@base-ui/react/dialog";
import { CircleAlertIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { EXAM_QUESTIONS } from "@/features/exam/constants/exam-questions";
import { cn } from "@/lib/utils";

type SubmitAssessmentDialogProps = {
  answeredCount: number;
  notVisitedCount: number;
  reviewLaterCount: number;
  triggerClassName?: string;
  unansweredCount: number;
};

const summaryItems = [
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

export function SubmitAssessmentDialog({
  answeredCount,
  notVisitedCount,
  reviewLaterCount,
  triggerClassName,
  unansweredCount,
}: SubmitAssessmentDialogProps) {
  const totalQuestionCount = EXAM_QUESTIONS.length;
  const counts = {
    answered: answeredCount,
    notVisited: notVisitedCount,
    reviewLater: reviewLaterCount,
    unanswered: unansweredCount,
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger
        className={cn(
          buttonVariants({ size: "lg" }),
          "h-12 w-full rounded-xl font-semibold",
          triggerClassName,
        )}
      >
        Submit Test
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
          <Dialog.Popup className="w-full max-w-md rounded-xl bg-background px-7 py-7 text-foreground shadow-xl outline-none transition-[opacity,transform] duration-150 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none sm:px-8">
            <Dialog.Title className="text-center text-lg font-semibold">
              Submit assessment?
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-center text-sm text-muted-foreground">
              You have answered {answeredCount} of {totalQuestionCount} questions.
            </Dialog.Description>

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 py-5 sm:gap-x-16 sm:gap-y-8 sm:px-4">
              {summaryItems.map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      item.indicatorClassName,
                    )}
                  />
                  <dt className="text-xs text-muted-foreground">
                    {item.label}:
                  </dt>
                  <dd className="ml-auto text-sm font-semibold tabular-nums">
                    {counts[item.key]}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex items-center justify-center gap-1.5 text-destructive">
              <CircleAlertIcon
                aria-hidden="true"
                className="size-3.5 shrink-0"
              />
              <p className="text-center text-xs leading-5">
                Once submitted, your answers cannot be changed.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Dialog.Close
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-1/2 px-4",
                )}
              >
                Resume
              </Dialog.Close>
              <Dialog.Close
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-1/2 px-5",
                )}
              >
                Submit
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
