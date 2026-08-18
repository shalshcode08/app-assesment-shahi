"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  previewQuestionBank,
  type QuestionBankPreview,
} from "@/features/admin/actions/preview-question-bank";
import { Badge } from "@/features/admin/components/settings-primitives";

export function QuestionBankPreviewPanel({ testId }: { testId: string }) {
  const [preview, setPreview] = useState<QuestionBankPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function load(offset: number) {
    startTransition(async () => {
      const result = await previewQuestionBank(testId, offset);

      if ("message" in result) {
        setMessage(result.message);
        return;
      }

      setMessage(null);
      setPreview(result);
    });
  }

  useEffect(() => {
    load(0);
    // The panel only ever previews the test it was opened for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  if (message) {
    return (
      <p className="text-xs text-destructive" role="alert">
        {message}
      </p>
    );
  }

  if (!preview) {
    return <p className="text-xs text-muted-foreground">Loading questions…</p>;
  }

  if (preview.total === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No questions in this test yet.
      </p>
    );
  }

  const from = preview.offset + 1;
  const to = preview.offset + preview.questions.length;

  return (
    <div className="flex flex-col gap-2" data-pending={isPending ? "" : undefined}>
      <ol className="flex flex-col gap-2">
        {preview.questions.map((question) => (
          <li
            className="rounded-lg border border-border/60 bg-background p-3"
            key={question.id}
          >
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">
                {question.externalCode}
              </span>
              {question.difficulty ? <Badge>{question.difficulty}</Badge> : null}
              {question.isActive ? null : <Badge tone="amber">Inactive</Badge>}
            </p>
            <p className="mt-1 text-sm text-foreground">{question.questionText}</p>
            <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {question.options.map((option) => (
                <li
                  className={
                    option.isCorrect
                      ? "flex items-center gap-1.5 rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400"
                      : "flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground"
                  }
                  key={option.code}
                >
                  {option.isCorrect ? (
                    <CheckIcon aria-hidden="true" className="size-3" />
                  ) : (
                    <span aria-hidden="true" className="w-3 text-center">
                      {option.code}
                    </span>
                  )}
                  {option.text}
                  {option.isCorrect ? <span className="sr-only">(correct)</span> : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground tabular-nums">
          Showing {from}–{to} of {preview.total}
        </p>
        <div className="flex items-center gap-1">
          <Button
            disabled={isPending || preview.offset === 0}
            onClick={() => load(preview.offset - preview.pageSize)}
            size="icon-lg"
            type="button"
            variant="outline"
            aria-label="Previous questions"
          >
            <ChevronLeftIcon aria-hidden="true" />
          </Button>
          <Button
            disabled={isPending || to >= preview.total}
            onClick={() => load(preview.offset + preview.pageSize)}
            size="icon-lg"
            type="button"
            variant="outline"
            aria-label="Next questions"
          >
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
