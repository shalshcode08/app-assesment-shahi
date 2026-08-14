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
        className="size-11 rounded-full lg:size-10"
      >
        <ChevronLeftIcon aria-hidden="true" />
      </Button>

      <div className="col-span-3 row-start-2 grid grid-cols-2 gap-2 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:flex lg:flex-wrap lg:items-center lg:justify-center">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onMarkForReview}
          className={cn(
            "h-11 w-full min-w-0 px-2 lg:h-9 lg:w-auto lg:px-4",
            isFlagged && "bg-muted text-foreground",
          )}
        >
          <FlagIcon aria-hidden="true" />
          <span className="lg:hidden">
            {isFlagged ? "Marked & Next" : "Review & Next"}
          </span>
          <span className="hidden lg:inline">
            {isFlagged ? "Marked for Review & Next" : "Mark for Review"}
          </span>
        </Button>
        <Button
          type="button"
          size="lg"
          className="h-11 w-full min-w-0 px-2 lg:h-9 lg:w-auto lg:min-w-32 lg:px-4"
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
        className="col-start-3 row-start-1 size-11 rounded-full lg:size-10"
      >
        <ChevronRightIcon aria-hidden="true" />
      </Button>
    </div>
  );
}
