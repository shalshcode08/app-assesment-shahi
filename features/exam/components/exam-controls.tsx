"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FlagIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EXAM_QUESTIONS } from "@/features/exam/constants/exam-questions";
import { cn } from "@/lib/utils";

type ExamControlsProps = {
  currentQuestionIndex: number;
  isFlagged: boolean;
  onMarkForReview: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onQuestionNext: () => void;
  className?: string;
};

export function ExamControls({
  className,
  currentQuestionIndex,
  isFlagged,
  onMarkForReview,
  onNext,
  onPrevious,
  onQuestionNext,
}: ExamControlsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3",
        className,
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        onClick={onPrevious}
        disabled={currentQuestionIndex === 0}
        aria-label="Previous question"
        className="size-10 rounded-full"
      >
        <ChevronLeftIcon aria-hidden="true" />
      </Button>

      <div className="col-span-3 row-start-2 flex flex-wrap items-center justify-center gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onMarkForReview}
          className={cn("px-4", isFlagged && "bg-muted text-foreground")}
        >
          <FlagIcon aria-hidden="true" />
          {isFlagged ? "Marked for Review & Next" : "Mark for Review"}
        </Button>
        <Button
          type="button"
          size="lg"
          className="min-w-32 px-4"
          onClick={onNext}
        >
          Save & Next
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        onClick={onQuestionNext}
        disabled={currentQuestionIndex === EXAM_QUESTIONS.length - 1}
        aria-label="Next question"
        className="col-start-3 row-start-1 size-10 rounded-full"
      >
        <ChevronRightIcon aria-hidden="true" />
      </Button>
    </div>
  );
}
