"use client";

import { useActionState, useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveTest } from "@/features/admin/actions/manage-tests";
import {
  ActionMessage,
  SubmitButton,
} from "@/features/admin/components/settings-primitives";
import type { AdminTest } from "@/features/admin/data/get-admin-tests";
import { INITIAL_ADMIN_ACTION_STATE } from "@/features/admin/types";

/** `datetime-local` wants "YYYY-MM-DDTHH:mm" in local time. */
function toLocalInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function SettingField({
  children,
  description,
  error,
  htmlFor,
  label,
}: {
  children: ReactNode;
  description?: string;
  error?: string[];
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-xs font-semibold text-foreground/75"
        htmlFor={htmlFor}
      >
        {label}
      </label>
      {children}
      {error?.length ? (
        <p className="text-xs text-destructive" role="alert">
          {error[0]}
        </p>
      ) : description ? (
        <p className="text-xs leading-4 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function Toggle({
  defaultChecked,
  description,
  label,
  name,
}: {
  defaultChecked: boolean;
  description: string;
  label: string;
  name: string;
}) {
  return (
    <label className="flex items-start gap-2 rounded-lg border border-border/60 p-3">
      <input
        className="mt-0.5 size-3.5 accent-primary"
        defaultChecked={defaultChecked}
        name={name}
        type="checkbox"
      />
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-foreground/80">
          {label}
        </span>
        <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}

export function TestForm({
  onDone,
  test,
}: {
  onDone: () => void;
  test?: AdminTest;
}) {
  const [state, formAction] = useActionState(
    saveTest,
    INITIAL_ADMIN_ACTION_STATE,
  );

  useEffect(() => {
    if (state.status === "success") {
      onDone();
    }
  }, [onDone, state]);

  const fieldId = (name: string) => `${test?.id ?? "new"}-${name}`;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/20 p-4"
    >
      <input name="testId" type="hidden" value={test?.id ?? ""} />

      <SettingField
        error={state.errors?.title}
        htmlFor={fieldId("title")}
        label="Test name"
      >
        <Input
          aria-invalid={Boolean(state.errors?.title)}
          className="h-9 max-w-md"
          defaultValue={test?.title ?? ""}
          id={fieldId("title")}
          maxLength={160}
          name="title"
          placeholder="Trainer Competency Assessment"
          required
        />
      </SettingField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SettingField
          description="Countdown shown to the candidate."
          error={state.errors?.durationMinutes}
          htmlFor={fieldId("durationMinutes")}
          label="Total time (minutes)"
        >
          <Input
            className="h-9"
            defaultValue={test ? Math.round(test.durationSeconds / 60) : 30}
            id={fieldId("durationMinutes")}
            inputMode="numeric"
            min={1}
            name="durationMinutes"
            required
            type="number"
          />
        </SettingField>

        <SettingField
          description="Sampled from the bank for each trainer."
          error={state.errors?.questionsPerAttempt}
          htmlFor={fieldId("questionsPerAttempt")}
          label="Questions per candidate"
        >
          <Input
            className="h-9"
            defaultValue={test?.questionsPerAttempt ?? 50}
            id={fieldId("questionsPerAttempt")}
            inputMode="numeric"
            min={1}
            name="questionsPerAttempt"
            required
            type="number"
          />
        </SettingField>

        <SettingField
          description="Score needed to qualify."
          error={state.errors?.passingPercentage}
          htmlFor={fieldId("passingPercentage")}
          label="Passing threshold (%)"
        >
          <Input
            className="h-9"
            defaultValue={test?.passingPercentage ?? 70}
            id={fieldId("passingPercentage")}
            inputMode="decimal"
            max={100}
            min={0}
            name="passingPercentage"
            required
            step="0.5"
            type="number"
          />
        </SettingField>

        <SettingField
          description="How many times one email may sit this test."
          error={state.errors?.maxAttempts}
          htmlFor={fieldId("maxAttempts")}
          label="Attempts per trainer"
        >
          <Input
            className="h-9"
            defaultValue={test?.maximumAttemptsPerEmail ?? 1}
            id={fieldId("maxAttempts")}
            inputMode="numeric"
            min={1}
            name="maxAttempts"
            required
            type="number"
          />
        </SettingField>

        <SettingField
          description="Leave blank for no limit. Switches are always recorded."
          error={state.errors?.maxTabSwitches}
          htmlFor={fieldId("maxTabSwitches")}
          label="Tab switches allowed"
        >
          <Input
            className="h-9"
            defaultValue={test?.maxTabSwitches ?? ""}
            id={fieldId("maxTabSwitches")}
            inputMode="numeric"
            min={0}
            name="maxTabSwitches"
            placeholder="No limit"
            type="number"
          />
        </SettingField>

        <SettingField
          description="Optional. Trainers cannot start before this."
          error={state.errors?.availableFrom}
          htmlFor={fieldId("availableFrom")}
          label="Opens"
        >
          <Input
            className="h-9"
            defaultValue={toLocalInputValue(test?.availableFrom ?? null)}
            id={fieldId("availableFrom")}
            name="availableFrom"
            type="datetime-local"
          />
        </SettingField>

        <SettingField
          description="Optional. No new attempts after this."
          error={state.errors?.availableUntil}
          htmlFor={fieldId("availableUntil")}
          label="Closes"
        >
          <Input
            className="h-9"
            defaultValue={toLocalInputValue(test?.availableUntil ?? null)}
            id={fieldId("availableUntil")}
            name="availableUntil"
            type="datetime-local"
          />
        </SettingField>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Toggle
          defaultChecked={test?.shuffleQuestions ?? true}
          description="Each trainer sees the sampled questions in a different order."
          label="Shuffle questions"
          name="shuffleQuestions"
        />
        <Toggle
          defaultChecked={test?.shuffleOptions ?? true}
          description="Answer options are reordered per trainer."
          label="Shuffle options"
          name="shuffleOptions"
        />
      </div>

      <SettingField
        description="Shown in the dialog before the timer starts. Leave blank to use the standard instructions."
        error={state.errors?.instructions}
        htmlFor={fieldId("instructions")}
        label="Instructions (optional)"
      >
        <textarea
          className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          defaultValue={test?.instructions ?? ""}
          id={fieldId("instructions")}
          maxLength={4000}
          name="instructions"
        />
      </SettingField>

      <ActionMessage state={state} />

      <div className="flex items-center justify-end gap-2">
        <Button onClick={onDone} size="lg" type="button" variant="ghost">
          Cancel
        </Button>
        <SubmitButton pendingLabel="Saving" size="lg">
          {test ? "Save settings" : "Create test"}
        </SubmitButton>
      </div>
    </form>
  );
}
