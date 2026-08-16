import { EXAM_QUESTIONS } from "@/features/exam/constants/exam-questions";
import { EXAM_RESULT } from "@/features/exam/constants/exam-result";
import { cn } from "@/lib/utils";

export function ResultAnswerReview() {
  return (
    <section aria-labelledby="answer-review-title" className="mt-8 sm:mt-10">
      <div className="mb-4">
        <h2 id="answer-review-title" className="text-lg font-semibold">
          Answer review
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review each submitted response against the correct answer.
        </p>
      </div>

      <div className="grid gap-3 rounded-xl bg-background p-2 sm:p-3">
        {EXAM_QUESTIONS.map((question, questionIndex) => {
          const correctOptionId = EXAM_RESULT.correctOptionIds[question.id];
          const selectedOptionId = EXAM_RESULT.selectedOptionIds[question.id];
          const isAnswered = Boolean(selectedOptionId);
          const isCorrect = selectedOptionId === correctOptionId;
          const questionStatus = isCorrect
            ? "Correct"
            : isAnswered
              ? "Incorrect"
              : "Unattempted";

          return (
            <article
              key={question.id}
              className="rounded-lg border border-neutral-200 bg-background p-4 sm:p-5"
            >
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
                <h3 className="grid max-w-5xl min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2 text-base leading-6 font-medium text-foreground/90">
                  <span className="font-semibold text-foreground">
                    Q{questionIndex + 1}.
                  </span>
                  <span>{question.prompt}</span>
                </h3>
                <span
                  className={cn(
                    "inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                    isCorrect && "bg-green-50 text-green-700",
                    isAnswered && !isCorrect && "bg-red-50 text-red-700",
                    !isAnswered && "bg-neutral-100 text-neutral-600",
                  )}
                >
                  {questionStatus}
                </span>
              </div>

              <ul
                className="mt-4 grid gap-2"
                aria-label={`Question ${question.id} options`}
              >
                {question.options.map((option, optionIndex) => {
                  const isCorrectOption = option.id === correctOptionId;
                  const isSelectedOption = option.id === selectedOptionId;
                  const isSelectedIncorrect =
                    isSelectedOption && !isCorrectOption;

                  return (
                    <li
                      key={option.id}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-lg border px-3.5 py-2.5",
                        isCorrectOption && "border-green-500 bg-green-50",
                        isSelectedIncorrect && "border-red-500 bg-red-50",
                        !isCorrectOption &&
                          !isSelectedIncorrect &&
                          "border-neutral-200 bg-background",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-full bg-neutral-100 text-xs font-semibold text-foreground/60",
                          isCorrectOption &&
                            "bg-green-600 text-white",
                          isSelectedIncorrect && "bg-red-600 text-white",
                        )}
                      >
                        {String.fromCharCode(65 + optionIndex)}
                      </span>

                      <div className="min-w-0">
                        <p className="text-sm leading-5 text-foreground/80">
                          {option.label}
                        </p>
                        {isCorrectOption ? (
                          <p className="mt-0.5 text-xs font-medium text-green-700">
                            {isSelectedOption
                              ? "Your answer · Correct answer"
                              : "Correct answer"}
                          </p>
                        ) : isSelectedIncorrect ? (
                          <p className="mt-0.5 text-xs font-medium text-red-700">
                            Your answer · Incorrect
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
