"use client";

import { useRef, useState, useTransition } from "react";
import {
  CheckIcon,
  FileSpreadsheetIcon,
  TriangleAlertIcon,
  UploadIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  analyzeQuestionWorkbook,
  importQuestionBank,
} from "@/features/admin/actions/import-question-bank";
import { ActionMessage } from "@/features/admin/components/settings-primitives";
import type { AdminTest } from "@/features/admin/data/get-admin-tests";
import {
  INITIAL_QUESTION_IMPORT_STATE,
  type QuestionImportState,
  type WorkbookAnalysis,
} from "@/features/admin/types";

// The sheet the admin is expected to hand over, shown as a sheet rather than
// as a list of rules.
const EXPECTED_COLUMNS = [
  "Question No.",
  "Question",
  "Option A",
  "Option B",
  "Option C",
  "Option D",
  "Correct Answer",
];

const EXAMPLE_ROW = [
  "1",
  "GSM in textiles refers to:",
  "Garment Sewing Measurement",
  "Grams per Square Metre",
  "General Stitch Measurement",
  "Garment Standard Method",
  "B",
];

function StructureExample() {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60 bg-background">
      <table className="w-full min-w-[720px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40">
            {EXPECTED_COLUMNS.map((column) => (
              <th
                className="px-3 py-2 font-semibold whitespace-nowrap text-foreground/75"
                key={column}
                scope="col"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {EXAMPLE_ROW.map((value, index) => (
              <td
                className="px-3 py-2 text-muted-foreground"
                key={EXPECTED_COLUMNS[index]}
              >
                {value}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ParsedPreview({ analysis }: { analysis: WorkbookAnalysis }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background p-3">
      <p className="text-xs text-foreground/80">
        <span className="font-semibold text-foreground">
          {analysis.validCount} question
          {analysis.validCount === 1 ? "" : "s"}
        </span>{" "}
        read from {analysis.fileName}
        {analysis.rejected.length > 0
          ? `, ${analysis.rejected.length} row${
              analysis.rejected.length === 1 ? "" : "s"
            } will be skipped`
          : ""}
        . First {analysis.sample.length} shown below.
      </p>

      <ol className="flex flex-col gap-2">
        {analysis.sample.map((question) => (
          <li
            className="rounded-lg border border-border/60 p-2.5"
            key={question.code}
          >
            <p className="text-xs text-muted-foreground">{question.code}</p>
            <p className="mt-0.5 text-sm text-foreground">{question.question}</p>
            <ul className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {question.options.map((option) => {
                const isCorrect = option.code === question.correct;

                return (
                  <li
                    className={
                      isCorrect
                        ? "flex items-center gap-1.5 rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400"
                        : "flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground"
                    }
                    key={option.code}
                  >
                    {isCorrect ? (
                      <CheckIcon aria-hidden="true" className="size-3" />
                    ) : (
                      <span aria-hidden="true" className="w-3 text-center">
                        {option.code}
                      </span>
                    )}
                    {option.text}
                    {isCorrect ? (
                      <span className="sr-only">(correct answer)</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>

      {analysis.rejected.length > 0 ? (
        <div className="max-h-40 overflow-y-auto rounded-lg bg-amber-500/10 p-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <TriangleAlertIcon aria-hidden="true" className="size-3.5" />
            {analysis.rejected.length} row
            {analysis.rejected.length === 1 ? "" : "s"} will be skipped
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {analysis.rejected.map((row) => (
              <li
                className="text-xs text-amber-700/90 dark:text-amber-400/90"
                key={row.row}
              >
                Row {row.row} ({row.code}) — {row.problems.join("; ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function QuestionUpload({ test }: { test: AdminTest }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [analysis, setAnalysis] = useState<WorkbookAnalysis | null>(null);
  const [result, setResult] = useState<QuestionImportState>(
    INITIAL_QUESTION_IMPORT_STATE,
  );
  const [isPending, startTransition] = useTransition();

  // Replacing is only possible while no trainer has answered from this bank,
  // and there is nothing to decide until the test already holds questions.
  const canReplace = test.attemptCount === 0;
  const [mode, setMode] = useState<"append" | "replace">(
    canReplace ? "replace" : "append",
  );
  const hasChoice = test.questionCount > 0;

  function handleFileChange() {
    setResult(INITIAL_QUESTION_IMPORT_STATE);
    setAnalysis(null);

    const form = formRef.current;

    if (!form) {
      return;
    }

    startTransition(async () => {
      setAnalysis(await analyzeQuestionWorkbook(new FormData(form)));
    });
  }

  function handleImport() {
    const form = formRef.current;

    if (!form) {
      return;
    }

    startTransition(async () => {
      const next = await importQuestionBank(
        INITIAL_QUESTION_IMPORT_STATE,
        new FormData(form),
      );

      setResult(next);

      if (next.status === "success") {
        form.reset();
        setAnalysis(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-4">
      <div className="flex items-start gap-2">
        <FileSpreadsheetIcon
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-green-700/80 dark:text-green-400/80"
        />
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-foreground">
            Upload the question sheet
          </h4>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            One question per row in this layout. Pick the file and check the
            preview before importing.
          </p>
        </div>
      </div>

      <StructureExample />

      <form className="flex flex-col gap-3" ref={formRef}>
        <input name="mode" type="hidden" value={mode} />
        <input name="testId" type="hidden" value={test.id} />

        <Input
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          aria-label="Question sheet"
          className="h-9 py-1.5"
          name="workbook"
          onChange={handleFileChange}
          type="file"
        />
      </form>

      {hasChoice && analysis?.status === "ok" ? (
        <fieldset className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background p-3">
          <legend className="px-1 text-xs font-semibold text-foreground/75">
            This test already has {test.questionCount} question
            {test.questionCount === 1 ? "" : "s"}
          </legend>
          <label className="flex items-center gap-2 text-xs text-foreground/80">
            <input
              checked={mode === "replace"}
              className="size-3.5 accent-primary"
              disabled={!canReplace}
              name="mode-choice"
              onChange={() => setMode("replace")}
              type="radio"
            />
            Replace them with this file
            {canReplace ? null : (
              <span className="text-muted-foreground">
                (not possible — trainers have already answered these questions)
              </span>
            )}
          </label>
          <label className="flex items-center gap-2 text-xs text-foreground/80">
            <input
              checked={mode === "append"}
              className="size-3.5 accent-primary"
              name="mode-choice"
              onChange={() => setMode("append")}
              type="radio"
            />
            Keep them and add these on top
          </label>
        </fieldset>
      ) : null}

      {isPending && !analysis ? (
        <p className="text-xs text-muted-foreground">Reading the sheet…</p>
      ) : null}

      {analysis?.status === "error" ? (
        <ActionMessage state={{ message: analysis.message, status: "error" }} />
      ) : null}

      {analysis?.warnings.map((warning) => (
        <p className="text-xs text-muted-foreground" key={warning}>
          {warning}
        </p>
      ))}

      {analysis?.status === "ok" ? <ParsedPreview analysis={analysis} /> : null}

      <ActionMessage state={result} />

      {analysis?.status === "ok" ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <p className="mr-auto text-xs text-muted-foreground">
            {hasChoice
              ? mode === "replace"
                ? `The ${test.questionCount} question${
                    test.questionCount === 1 ? "" : "s"
                  } already in this test will be removed.`
                : `This test will then hold ${
                    test.questionCount + analysis.validCount
                  } questions.`
              : null}
          </p>
          <Button
            disabled={isPending}
            onClick={handleImport}
            size="lg"
            type="button"
          >
            <UploadIcon aria-hidden="true" />
            {isPending
              ? "Importing"
              : `Import ${analysis.validCount} question${
                  analysis.validCount === 1 ? "" : "s"
                }`}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
