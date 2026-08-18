"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LanguagesIcon, LoaderCircleIcon } from "lucide-react";

import { setGuestAttemptLanguage } from "@/features/exam/actions/update-guest-attempt";
import type { ExamLanguage } from "@/features/exam/types";

const ORIGINAL = "original";

/**
 * Switching language re-reads the attempt, so the questions come back in the
 * new wording with the same ids — answers, flags, and the timer are untouched.
 */
export function LanguageSwitcher({
  className,
  languages,
  originalLabel = "English",
  selectedLanguageId,
}: {
  className?: string;
  languages: ExamLanguage[];
  originalLabel?: string;
  selectedLanguageId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (languages.length === 0) {
    return null;
  }

  function change(value: string) {
    startTransition(async () => {
      const result = await setGuestAttemptLanguage(
        value === ORIGINAL ? null : value,
      );

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <label
      className={`inline-flex items-center gap-1.5 rounded-lg border bg-background px-2 py-1 text-xs ${className ?? ""}`}
    >
      {isPending ? (
        <LoaderCircleIcon
          aria-hidden="true"
          className="size-3.5 animate-spin text-muted-foreground"
        />
      ) : (
        <LanguagesIcon
          aria-hidden="true"
          className="size-3.5 text-muted-foreground"
        />
      )}
      <span className="sr-only">Question language</span>
      <select
        className="cursor-pointer bg-transparent pr-1 font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        disabled={isPending}
        onChange={(event) => change(event.target.value)}
        value={selectedLanguageId ?? ORIGINAL}
      >
        <option value={ORIGINAL}>{originalLabel}</option>
        {languages.map((language) => (
          <option key={language.id} value={language.id}>
            {language.name}
          </option>
        ))}
      </select>
    </label>
  );
}
