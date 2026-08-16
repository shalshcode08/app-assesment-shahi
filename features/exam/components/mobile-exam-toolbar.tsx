"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ListChecksIcon, XIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { QuestionNumberGrid } from "@/features/exam/components/question-number-grid";
import { QuestionStatusLegend } from "@/features/exam/components/question-status-legend";
import { SubmitAssessmentDialog } from "@/features/exam/components/submit-assessment-dialog";
import type { ExamQuestion } from "@/features/exam/types";
import { cn } from "@/lib/utils";

type MobileExamToolbarProps = {
  answeredCount: number;
  answeredQuestionIds: Set<string>;
  completion: number;
  currentQuestionIndex: number;
  flaggedQuestionIds: Set<string>;
  notVisitedCount: number;
  onQuestionSelect: (index: number) => void;
  questions: ExamQuestion[];
  reviewLaterCount: number;
  unansweredCount: number;
  visitedQuestionIds: Set<string>;
};

export function MobileExamToolbar({
  answeredCount,
  answeredQuestionIds,
  completion,
  currentQuestionIndex,
  flaggedQuestionIds,
  notVisitedCount,
  onQuestionSelect,
  questions,
  reviewLaterCount,
  unansweredCount,
  visitedQuestionIds,
}: MobileExamToolbarProps) {
  const [isQuestionSheetOpen, setIsQuestionSheetOpen] = useState(false);

  const selectQuestion = (index: number) => {
    onQuestionSelect(index);
    setIsQuestionSheetOpen(false);
  };

  return (
    <div className="sticky top-0 z-20 border-b bg-neutral-100 px-4 py-3 lg:hidden">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground/80">
          Question {currentQuestionIndex + 1} of {questions.length}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {completion}% complete
        </span>
      </div>

      <div
        aria-label="Assessment completion"
        aria-valuemax={questions.length}
        aria-valuemin={0}
        aria-valuenow={answeredCount}
        className="mt-2 h-1.5 overflow-hidden rounded-full border border-neutral-300 bg-background"
        role="progressbar"
      >
        <div
          className="h-full bg-primary transition-[width] duration-200"
          style={{ width: `${completion}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Dialog.Root
          open={isQuestionSheetOpen}
          onOpenChange={setIsQuestionSheetOpen}
        >
          <Dialog.Trigger
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-11 w-full bg-background",
            )}
          >
            <ListChecksIcon aria-hidden="true" />
            Questions
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
            <Dialog.Viewport className="fixed inset-0 z-50 flex items-end">
              <Dialog.Popup className="max-h-[82dvh] w-full overflow-y-auto rounded-t-2xl bg-background px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-foreground shadow-2xl outline-none transition-[opacity,transform] duration-200 data-ending-style:translate-y-4 data-ending-style:opacity-0 data-starting-style:translate-y-4 data-starting-style:opacity-0 motion-reduce:transition-none">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Dialog.Title className="text-base font-semibold">
                      Questions
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 text-xs text-muted-foreground">
                      {answeredCount} of {questions.length} answered
                    </Dialog.Description>
                  </div>
                  <Dialog.Close
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        aria-label="Close question navigation"
                        className="-mt-1 -mr-2 size-11"
                      />
                    }
                  >
                    <XIcon aria-hidden="true" />
                  </Dialog.Close>
                </div>

                <div className="mt-5 border-y py-4">
                  <QuestionStatusLegend />
                </div>

                <QuestionNumberGrid
                  className="mt-6 grid-cols-5"
                  answeredQuestionIds={answeredQuestionIds}
                  currentQuestionIndex={currentQuestionIndex}
                  flaggedQuestionIds={flaggedQuestionIds}
                  onQuestionSelect={selectQuestion}
                  questions={questions}
                  visitedQuestionIds={visitedQuestionIds}
                />
              </Dialog.Popup>
            </Dialog.Viewport>
          </Dialog.Portal>
        </Dialog.Root>

        <SubmitAssessmentDialog
          answeredCount={answeredCount}
          notVisitedCount={notVisitedCount}
          reviewLaterCount={reviewLaterCount}
          totalQuestionCount={questions.length}
          triggerClassName="h-11 rounded-lg"
          unansweredCount={unansweredCount}
        />
      </div>
    </div>
  );
}
