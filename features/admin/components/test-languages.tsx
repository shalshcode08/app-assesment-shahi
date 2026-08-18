"use client";

import { useActionState, useState } from "react";
import { LanguagesIcon, PlusIcon, Trash2Icon, UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteTestLanguage,
  importQuestionTranslations,
  saveTestLanguage,
} from "@/features/admin/actions/manage-test-languages";
import {
  ActionMessage,
  Badge,
  ConfirmButton,
  DismissibleNote,
  SubmitButton,
} from "@/features/admin/components/settings-primitives";
import type {
  AdminTest,
  AdminTestLanguage,
} from "@/features/admin/data/get-admin-tests";
import {
  INITIAL_ADMIN_ACTION_STATE,
  INITIAL_QUESTION_IMPORT_STATE,
  type AdminActionState,
} from "@/features/admin/types";

function AddLanguageForm({ testId }: { testId: string }) {
  const [state, formAction] = useActionState(
    saveTestLanguage,
    INITIAL_ADMIN_ACTION_STATE,
  );

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center gap-2"
      key={state.status === "success" ? state.message : "form"}
    >
      <input name="languageId" type="hidden" value="" />
      <input name="testId" type="hidden" value={testId} />
      <Input
        aria-invalid={Boolean(state.errors?.name)}
        aria-label="Language name"
        className="h-9 w-full max-w-56"
        maxLength={60}
        name="name"
        placeholder="Hindi, Kannada, Tamil…"
        required
      />
      <SubmitButton pendingLabel="Adding" size="lg" variant="outline">
        <PlusIcon aria-hidden="true" />
        Add language
      </SubmitButton>
      {state.status === "error" ? (
        <span className="basis-full text-xs text-destructive" role="alert">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

function DeleteLanguageForm({ language }: { language: AdminTestLanguage }) {
  const [state, formAction] = useActionState(
    deleteTestLanguage,
    INITIAL_ADMIN_ACTION_STATE,
  );
  const [dismissed, setDismissed] = useState<AdminActionState | null>(null);

  return (
    <form action={formAction} className="relative">
      <input name="languageId" type="hidden" value={language.id} />
      <ConfirmButton
        aria-label={`Remove ${language.name}`}
        confirmLabel="Remove?"
        size="icon-lg"
        variant="ghost"
      >
        <Trash2Icon aria-hidden="true" />
      </ConfirmButton>
      {state.status === "error" && dismissed !== state ? (
        <DismissibleNote
          className="absolute top-full right-0 z-10 mt-1 w-60"
          onDismiss={() => setDismissed(state)}
        >
          {state.message}
        </DismissibleNote>
      ) : null}
    </form>
  );
}

function LanguageRow({
  language,
  questionCount,
}: {
  language: AdminTestLanguage;
  questionCount: number;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [state, formAction] = useActionState(
    importQuestionTranslations,
    INITIAL_QUESTION_IMPORT_STATE,
  );
  const missing = questionCount - language.translatedCount;

  return (
    <li className="rounded-lg border border-border/60 bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {language.name}
        </span>
        {language.translatedCount === 0 ? (
          <Badge tone="amber">No questions yet</Badge>
        ) : missing > 0 ? (
          <Badge tone="amber">
            {language.translatedCount} of {questionCount} translated
          </Badge>
        ) : (
          <Badge tone="green">All {questionCount} translated</Badge>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button
            onClick={() => setIsUploading((open) => !open)}
            size="lg"
            type="button"
            variant="outline"
          >
            <UploadIcon aria-hidden="true" />
            {language.translatedCount === 0 ? "Upload sheet" : "Replace sheet"}
          </Button>
          <DeleteLanguageForm language={language} />
        </div>
      </div>

      {isUploading ? (
        <form action={formAction} className="mt-3 flex flex-col gap-2">
          <input name="languageId" type="hidden" value={language.id} />
          <p className="text-xs leading-5 text-muted-foreground">
            The same sheet as the original, translated: same Question No. and
            same Correct Answer on every row, with the question and options in{" "}
            {language.name}. Rows are matched by question number, so the answer
            key and marks stay as they are.
          </p>
          <Input
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            aria-label={`${language.name} question sheet`}
            className="h-9 py-1.5"
            name="workbook"
            required
            type="file"
          />
          <ActionMessage state={state} />
          <div className="flex justify-end">
            <SubmitButton pendingLabel="Uploading" size="lg">
              <UploadIcon aria-hidden="true" />
              Upload {language.name} sheet
            </SubmitButton>
          </div>
        </form>
      ) : null}
    </li>
  );
}

export function TestLanguages({ test }: { test: AdminTest }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-4">
      <div className="flex items-start gap-2">
        <LanguagesIcon
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-violet-700/80 dark:text-violet-400/80"
        />
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-foreground">Languages</h4>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Offer this test in more than one language. Add the language, then
            upload the same question sheet translated — it becomes another
            wording of the same questions, not a second test.
          </p>
        </div>
      </div>

      {test.questionCount === 0 ? (
        <p className="rounded-lg bg-amber-500/10 px-2.5 py-2 text-xs leading-5 text-amber-700 dark:text-amber-400">
          Upload the original question sheet first. Translations are matched to
          it by question number.
        </p>
      ) : (
        <>
          {test.languages.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {test.languages.map((language) => (
                <LanguageRow
                  key={language.id}
                  language={language}
                  questionCount={test.questionCount}
                />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              No extra languages yet. The test is served in the language of the
              original sheet.
            </p>
          )}

          <AddLanguageForm testId={test.id} />
        </>
      )}
    </div>
  );
}
