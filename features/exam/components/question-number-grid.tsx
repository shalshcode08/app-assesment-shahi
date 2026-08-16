"use client";

import type { ExamQuestion } from "@/features/exam/types";
import { cn } from "@/lib/utils";

type QuestionNumberGridProps = {
  answeredQuestionIds: Set<string>;
  className?: string;
  currentQuestionIndex: number;
  flaggedQuestionIds: Set<string>;
  onQuestionSelect: (index: number) => void;
  questions: ExamQuestion[];
  visitedQuestionIds: Set<string>;
};

export function QuestionNumberGrid({
  answeredQuestionIds,
  className,
  currentQuestionIndex,
  flaggedQuestionIds,
  onQuestionSelect,
  questions,
  visitedQuestionIds,
}: QuestionNumberGridProps) {
  return (
    <div
      className={cn("grid grid-cols-5 gap-x-2 gap-y-4", className)}
      aria-label="Assessment questions"
    >
      {questions.map((question, index) => {
        const isCurrent = index === currentQuestionIndex;
        const isAnswered = answeredQuestionIds.has(question.id);
        const isFlagged = flaggedQuestionIds.has(question.id);
        const isVisited = visitedQuestionIds.has(question.id);

        return (
          <button
            key={question.id}
            type="button"
            onClick={() => onQuestionSelect(index)}
            aria-current={isCurrent ? "step" : undefined}
            aria-label={`Go to question ${index + 1}${
              isAnswered ? ", answered" : ""
            }${isFlagged ? ", review later" : ""}${
              isVisited && !isAnswered ? ", unanswered" : ""
            }${!isVisited ? ", not visited" : ""}`}
            className={cn(
              "relative grid size-11 place-items-center justify-self-center rounded-full border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              isCurrent &&
                "border-primary bg-background text-primary hover:bg-primary/5",
              !isCurrent &&
                isFlagged &&
                "border-orange-500 bg-orange-500 text-white hover:bg-orange-600",
              !isCurrent &&
                !isFlagged &&
                isAnswered &&
                "border-green-600 bg-green-600 text-white hover:bg-green-700",
              !isCurrent &&
                !isFlagged &&
                !isAnswered &&
                isVisited &&
                "border-neutral-300 bg-neutral-300 text-neutral-800 hover:bg-neutral-400",
              !isCurrent &&
                !isFlagged &&
                !isAnswered &&
                !isVisited &&
                "border-neutral-300 bg-background text-muted-foreground hover:bg-neutral-50",
            )}
          >
            {index + 1}
            {isCurrent && isFlagged ? (
              <span
                aria-hidden="true"
                className="absolute top-1 right-1 size-1.5 rounded-full bg-orange-300"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
