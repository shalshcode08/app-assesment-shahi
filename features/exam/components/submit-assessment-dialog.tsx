"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { CircleAlertIcon, LoaderCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { submitGuestAttempt } from "@/features/exam/actions/update-guest-attempt";
import { cn } from "@/lib/utils";

type SubmitAssessmentDialogProps = {
  answeredCount: number;
  notVisitedCount: number;
  reviewLaterCount: number;
  triggerClassName?: string;
  totalQuestionCount: number;
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
  totalQuestionCount,
  triggerClassName,
  unansweredCount,
}: SubmitAssessmentDialogProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string>();
  const [isSubmitting, startSubmitTransition] = useTransition();
  const counts = {
    answered: answeredCount,
    notVisited: notVisitedCount,
    reviewLater: reviewLaterCount,
    unanswered: unansweredCount,
  };

  function handleSubmit() {
    setSubmitError(undefined);
    startSubmitTransition(async () => {
      const result = await submitGuestAttempt();

      if (!result.ok) {
        setSubmitError(result.message);
        return;
      }

      router.replace("/exam/result");
    });
  }

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

            {submitError ? (
              <p
                role="alert"
                className="mt-3 text-center text-xs leading-5 text-destructive"
              >
                {submitError}
              </p>
            ) : null}

            <div className="mt-6 flex items-center gap-3">
              <Dialog.Close
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-1/2 px-4",
                )}
              >
                Resume
              </Dialog.Close>
              <Button
                type="button"
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-1/2 px-5"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircleIcon
                      aria-hidden="true"
                      className="animate-spin"
                    />
                    Submitting
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
