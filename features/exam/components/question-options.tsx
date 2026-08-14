"use client";

import type { ExamQuestion } from "@/features/exam/types";
import { cn } from "@/lib/utils";

type QuestionOptionsProps = {
  question: ExamQuestion;
  selectedOptionId?: string;
  onClear: () => void;
  onSelect: (optionId: string) => void;
};

export function QuestionOptions({
  question,
  selectedOptionId,
  onClear,
  onSelect,
}: QuestionOptionsProps) {
  return (
    <fieldset className="grid max-w-3xl gap-3">
      <legend className="sr-only">Choose one answer</legend>
      {question.options.map((option, index) => {
        const isSelected = selectedOptionId === option.id;

        return (
          <label
            key={option.id}
            onClick={(event) => {
              if (!isSelected) {
                return;
              }

              event.preventDefault();
              onClear();
            }}
            className={cn(
              "group flex min-h-16 cursor-pointer items-center gap-4 rounded-xl border bg-background px-4 py-4 transition-[border-color,background-color] hover:border-foreground/25 hover:bg-muted/25 sm:px-5",
              !isSelected &&
                "has-[:focus-visible]:border-foreground/50",
              isSelected &&
                "border-transparent bg-primary/[0.035] hover:border-transparent hover:bg-primary/[0.035]",
            )}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option.id}
              checked={isSelected}
              onChange={() => onSelect(option.id)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-neutral-100 text-sm font-semibold text-foreground/75 transition-colors group-has-checked:bg-primary group-has-checked:text-primary-foreground"
            >
              {String.fromCharCode(65 + index)}
            </span>
            <span className="min-w-0 text-sm leading-5 font-normal text-foreground/75 group-has-checked:text-foreground/90">
              {option.label}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
