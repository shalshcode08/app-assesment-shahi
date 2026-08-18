"use client";

import { useActionState, useState } from "react";
import {
  ArchiveIcon,
  BookOpenIcon,
  ClipboardListIcon,
  ClockIcon,
  EyeOffIcon,
  LanguagesIcon,
  ListChecksIcon,
  PencilIcon,
  PlusIcon,
  ScanEyeIcon,
  SendIcon,
  TargetIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteTest, setTestStatus } from "@/features/admin/actions/manage-tests";
import { SURFACE } from "@/features/admin/components/dashboard-primitives";
import { QuestionBankPreviewPanel } from "@/features/admin/components/question-bank-preview";
import { QuestionUpload } from "@/features/admin/components/question-upload";
import {
  Badge,
  ConfirmButton,
  DismissibleNote,
  SubmitButton,
} from "@/features/admin/components/settings-primitives";
import { TestForm } from "@/features/admin/components/test-form";
import { TestLanguages } from "@/features/admin/components/test-languages";
import type { AdminTest } from "@/features/admin/data/get-admin-tests";
import { cn } from "@/lib/utils";
import {
  INITIAL_ADMIN_ACTION_STATE,
  type AdminActionState,
} from "@/features/admin/types";

const STATUS_TONE = {
  archived: "slate",
  draft: "amber",
  published: "green",
} as const;

const STATUS_LABEL = {
  archived: "Archived",
  draft: "Draft",
  published: "Live",
} as const;

// The accent enters from the left edge and is gone by the middle of the card,
// so the status registers on a scan without tinting the content. Gradients set
// a background image, so the card keeps its own white underneath. The live card
// is the only one lifted off the page.
const STATUS_SURFACE = {
  archived: "bg-linear-to-r from-muted/60 to-40% to-transparent",
  draft:
    "border-amber-600/25 bg-linear-to-r from-amber-500/[0.10] to-45% to-transparent",
  published:
    "border-green-700/25 bg-linear-to-r from-green-500/[0.09] to-45% to-transparent shadow-sm",
} as const;

function StatusForm({
  children,
  status,
  testId,
}: {
  children: React.ReactNode;
  status: "archived" | "draft" | "published";
  testId: string;
}) {
  const [state, formAction] = useActionState(
    setTestStatus,
    INITIAL_ADMIN_ACTION_STATE,
  );
  // Dismissal is remembered by identity: the next action returns a fresh state
  // object, so a new refusal shows itself without an effect resetting anything.
  const [dismissed, setDismissed] = useState<AdminActionState | null>(null);
  const isDismissed = dismissed === state;

  return (
    <form action={formAction} className="contents">
      <input name="status" type="hidden" value={status} />
      <input name="testId" type="hidden" value={testId} />
      <SubmitButton pendingLabel="Working" size="lg" variant="outline">
        {children}
      </SubmitButton>
      {state.status === "error" && !isDismissed ? (
        <DismissibleNote
          className="basis-full"
          onDismiss={() => setDismissed(state)}
        >
          {state.message}
        </DismissibleNote>
      ) : null}
    </form>
  );
}

function DeleteTestForm({ testId }: { testId: string }) {
  const [state, formAction] = useActionState(
    deleteTest,
    INITIAL_ADMIN_ACTION_STATE,
  );
  // Dismissal is remembered by identity: the next action returns a fresh state
  // object, so a new refusal shows itself without an effect resetting anything.
  const [dismissed, setDismissed] = useState<AdminActionState | null>(null);
  const isDismissed = dismissed === state;

  return (
    <form action={formAction} className="relative">
      <input name="testId" type="hidden" value={testId} />
      <ConfirmButton
        aria-label="Delete test"
        confirmLabel="Delete?"
        size="icon-lg"
        variant="ghost"
      >
        <Trash2Icon aria-hidden="true" />
      </ConfirmButton>
      {state.status === "error" && !isDismissed ? (
        <DismissibleNote
          className="absolute top-full right-0 z-10 mt-1 w-64"
          onDismiss={() => setDismissed(state)}
        >
          {state.message}
        </DismissibleNote>
      ) : null}
    </form>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ClockIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon aria-hidden="true" className="size-3.5" />
        {label}
      </span>
      <span className="mt-0.5 block text-sm font-medium text-foreground tabular-nums">
        {value}
      </span>
    </div>
  );
}

function TestCard({
  liveTitle,
  test,
}: {
  liveTitle: string | null;
  test: AdminTest;
}) {
  const [panel, setPanel] = useState<
    "none" | "edit" | "languages" | "preview" | "upload"
  >("none");
  const shortfall = test.questionsPerAttempt - test.readyQuestionCount;

  return (
    // cn() resolves the conflict: SURFACE carries bg-background and a neutral
    // border, and the status classes must win over both.
    <section className={cn(SURFACE, STATUS_SURFACE[test.status], "p-4")}>
      <div className="flex flex-wrap items-start gap-2">
        <ClipboardListIcon
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-blue-600/80 dark:text-blue-400/80"
        />
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
            {test.title}
            <Badge tone={STATUS_TONE[test.status]}>
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-current"
              />
              {STATUS_LABEL[test.status]}
            </Badge>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {test.attemptCount} attempt{test.attemptCount === 1 ? "" : "s"} so
            far · {test.questionCount} question
            {test.questionCount === 1 ? "" : "s"} in the bank
            {test.readyQuestionCount !== test.questionCount
              ? ` (${test.readyQuestionCount} ready to serve)`
              : ""}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Button
            onClick={() => setPanel(panel === "upload" ? "none" : "upload")}
            size="lg"
            type="button"
            variant="outline"
          >
            <UploadIcon aria-hidden="true" />
            Questions
          </Button>
          <Button
            disabled={test.questionCount === 0}
            onClick={() => setPanel(panel === "preview" ? "none" : "preview")}
            size="lg"
            type="button"
            variant="outline"
          >
            <ListChecksIcon aria-hidden="true" />
            Preview bank
          </Button>
          <Button
            onClick={() => setPanel(panel === "languages" ? "none" : "languages")}
            size="lg"
            type="button"
            variant="outline"
          >
            <LanguagesIcon aria-hidden="true" />
            Languages
            {test.languages.length > 0 ? ` (${test.languages.length})` : ""}
          </Button>
          <Button
            aria-label={`Edit ${test.title}`}
            onClick={() => setPanel(panel === "edit" ? "none" : "edit")}
            size="icon-lg"
            type="button"
            variant="ghost"
          >
            <PencilIcon aria-hidden="true" />
          </Button>
          <DeleteTestForm testId={test.id} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/50 pt-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat
          icon={ClockIcon}
          label="Total time"
          value={`${Math.round(test.durationSeconds / 60)} min`}
        />
        <Stat
          icon={BookOpenIcon}
          label="Questions served"
          value={test.questionsPerAttempt.toString()}
        />
        <Stat
          icon={TargetIcon}
          label="Pass mark"
          value={`${test.passingPercentage}%`}
        />
        <Stat
          icon={ScanEyeIcon}
          label="Tab switches"
          value={
            test.maxTabSwitches === null
              ? "No limit"
              : test.maxTabSwitches.toString()
          }
        />
        <Stat
          icon={ClipboardListIcon}
          label="Attempts allowed"
          value={test.maximumAttemptsPerEmail.toString()}
        />
        <Stat
          icon={EyeOffIcon}
          label="Shuffling"
          value={
            [
              test.shuffleQuestions ? "Questions" : null,
              test.shuffleOptions ? "Options" : null,
            ]
              .filter(Boolean)
              .join(" + ") || "Off"
          }
        />
      </div>

      {shortfall > 0 ? (
        <p className="mt-3 rounded-lg bg-amber-500/10 px-2.5 py-2 text-xs leading-5 text-amber-700 dark:text-amber-400">
          This test serves {test.questionsPerAttempt} questions but only{" "}
          {test.readyQuestionCount} are ready. Upload at least {shortfall} more
          before publishing.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
        {test.status === "published" ? (
          <>
            <StatusForm status="draft" testId={test.id}>
              <EyeOffIcon aria-hidden="true" />
              Take offline
            </StatusForm>
            <StatusForm status="archived" testId={test.id}>
              <ArchiveIcon aria-hidden="true" />
              Archive
            </StatusForm>
          </>
        ) : (
          <StatusForm status="published" testId={test.id}>
            <SendIcon aria-hidden="true" />
            Publish as the live test
          </StatusForm>
        )}
        <p className="text-xs text-muted-foreground">
          {test.status === "published"
            ? "Trainers signing in now start this test."
            : liveTitle
              ? `Only one test can be live. Publishing this one archives “${liveTitle}”.`
              : "No test is live right now. Publishing makes this the one trainers get."}
        </p>
      </div>

      {panel === "edit" ? (
        <div className="mt-3">
          <TestForm onDone={() => setPanel("none")} test={test} />
        </div>
      ) : null}

      {panel === "upload" ? (
        <div className="mt-3">
          <QuestionUpload test={test} />
        </div>
      ) : null}

      {panel === "languages" ? (
        <div className="mt-3">
          <TestLanguages test={test} />
        </div>
      ) : null}

      {panel === "preview" ? (
        <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 p-4">
          <QuestionBankPreviewPanel testId={test.id} />
        </div>
      ) : null}
    </section>
  );
}

export function TestsManager({ tests }: { tests: AdminTest[] }) {
  const [isCreating, setIsCreating] = useState(false);
  const live = tests.find((test) => test.status === "published") ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className={`${SURFACE} flex flex-wrap items-center gap-3 p-4`}>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ClipboardListIcon
              aria-hidden="true"
              className="size-4 text-blue-600 dark:text-blue-400"
            />
            Tests
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Configure the assessment, upload its question sheet, then publish it.
            Exactly one test is live at a time —{" "}
            {live ? (
              <>
                trainers signing in now get{" "}
                <span className="font-medium text-foreground">{live.title}</span>
              </>
            ) : (
              "nothing is live right now, so trainers cannot start an assessment"
            )}
            .
          </p>
        </div>
        <Button
          className="ml-auto"
          onClick={() => setIsCreating((creating) => !creating)}
          size="lg"
          type="button"
        >
          <PlusIcon aria-hidden="true" />
          New test
        </Button>
      </div>

      {isCreating ? <TestForm onDone={() => setIsCreating(false)} /> : null}

      {tests.length === 0 && !isCreating ? (
        <p className={`${SURFACE} p-6 text-center text-sm text-muted-foreground`}>
          No tests yet. Create one, upload its questions, and publish it.
        </p>
      ) : null}

      {tests.map((test) => (
        <TestCard key={test.id} liveTitle={live?.title ?? null} test={test} />
      ))}
    </div>
  );
}
