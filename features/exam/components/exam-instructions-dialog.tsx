"use client";

import { Dialog } from "@base-ui/react/dialog";

import { Button } from "@/components/ui/button";
import {
  EXAM_QUESTIONS,
  EXAM_TITLE,
} from "@/features/exam/constants/exam-questions";

const instructions = [
  `The assessment contains ${EXAM_QUESTIONS.length} single-choice questions and has a 30-minute time limit.`,
  "The timer begins when you proceed and continues until the assessment is submitted.",
  "You can move between questions and mark any question for review before submitting.",
  "Browser tab changes may be recorded. Submitted answers cannot be changed.",
] as const;

export function ExamInstructionsDialog({
  open,
  onProceed,
}: {
  open: boolean;
  onProceed: () => void;
}) {
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
              {EXAM_TITLE}
            </Dialog.Description>

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

            <Button
              type="button"
              size="lg"
              className="mt-6 h-11 w-full font-semibold"
              onClick={onProceed}
            >
              Proceed to Test
            </Button>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
