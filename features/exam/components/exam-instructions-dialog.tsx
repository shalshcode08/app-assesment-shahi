"use client";

import { Dialog } from "@base-ui/react/dialog";
import { LoaderCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

function formatDuration(durationSeconds: number) {
  const totalMinutes = Math.ceil(durationSeconds / 60);

  return `${totalMinutes}-minute`;
}

export function ExamInstructionsDialog({
  open,
  customInstructions,
  errorMessage,
  isPending,
  languageSwitcher,
  maxTabSwitches,
  onProceed,
  durationSeconds,
  questionCount,
  title,
}: {
  customInstructions?: string | null;
  durationSeconds: number;
  errorMessage?: string;
  isPending: boolean;
  languageSwitcher?: React.ReactNode;
  maxTabSwitches?: number | null;
  open: boolean;
  onProceed: () => void;
  questionCount: number;
  title: string;
}) {
  // A tab-switch allowance ends the attempt on its own, so the rule is stated
  // plainly instead of the softer default warning.
  const tabRule =
    typeof maxTabSwitches === "number"
      ? maxTabSwitches === 0
        ? "Leaving this tab even once will submit your assessment automatically. Submitted answers cannot be changed."
        : `Browser tab changes are recorded. Leaving this tab more than ${maxTabSwitches} time${maxTabSwitches === 1 ? "" : "s"} will submit your assessment automatically. Submitted answers cannot be changed.`
      : "Browser tab changes may be recorded. Submitted answers cannot be changed.";

  const instructions = [
    `The assessment contains ${questionCount} single-choice questions and has a ${formatDuration(durationSeconds)} time limit.`,
    "The timer begins when you proceed and continues until the assessment is submitted.",
    "You can move between questions and mark any question for review before submitting.",
    tabRule,
    // Anything the admin wrote for this test is appended as its own points.
    ...(customInstructions ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  ];

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
          <Dialog.Popup className="w-full max-w-lg rounded-xl bg-background px-6 py-7 text-foreground shadow-xl outline-none transition-[opacity,transform] duration-150 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none sm:px-8">
            <Dialog.Title className="text-center text-lg font-semibold">
              Assessment instructions
            </Dialog.Title>
            <Dialog.Description className="mt-1.5 text-center text-sm text-muted-foreground">
              {title}
            </Dialog.Description>

            {languageSwitcher ? (
              <div className="mt-4 flex justify-center">{languageSwitcher}</div>
            ) : null}

            <ol className="mt-6 grid gap-3.5 border-y py-5">
              {instructions.map((instruction, index) => (
                <li
                  key={instruction}
                  className="flex items-start gap-3 text-sm leading-5 text-foreground/75"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-6 shrink-0 place-items-center rounded-full bg-neutral-100 text-xs font-semibold text-foreground/65"
                  >
                    {index + 1}
                  </span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>

            {errorMessage ? (
              <p
                role="alert"
                className="mt-4 text-center text-xs leading-5 text-destructive"
              >
                {errorMessage}
              </p>
            ) : null}

            <Button
              type="button"
              size="lg"
              className="mt-6 h-11 w-full font-semibold"
              onClick={onProceed}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
                  Starting assessment
                </>
              ) : (
                "Proceed to Test"
              )}
            </Button>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
