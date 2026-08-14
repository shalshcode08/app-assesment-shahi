"use client";

import { useEffect, useState } from "react";
import { Clock3Icon } from "lucide-react";

import { EXAM_DURATION_SECONDS } from "@/features/exam/constants/exam-questions";
import { cn } from "@/lib/utils";

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((unit) => unit.toString().padStart(2, "0"))
    .join(":");
}

function TimerDigit({
  character,
  previousCharacter,
}: {
  character: string;
  previousCharacter: string;
}) {
  const hasChanged = previousCharacter !== character;

  return (
    <span className="inline-grid w-[0.68em] place-items-center overflow-hidden">
      {hasChanged ? (
        <span
          key={`out-${previousCharacter}-${character}`}
          className="timer-digit-exit col-start-1 row-start-1"
        >
          {previousCharacter}
        </span>
      ) : null}
      <span
        key={`in-${character}`}
        className={cn(
          "col-start-1 row-start-1",
          hasChanged && "timer-digit-enter",
        )}
      >
        {character}
      </span>
    </span>
  );
}

function TimerValue({
  previousValue,
  value,
}: {
  previousValue: string;
  value: string;
}) {
  return (
    <span aria-hidden="true" className="flex items-center">
      {[...value].map((character, index) =>
        character === ":" ? (
          <span
            key={`separator-${index}`}
            className="w-[0.5em] text-center text-muted-foreground"
          >
            {character}
          </span>
        ) : (
          <TimerDigit
            key={index}
            character={character}
            previousCharacter={previousValue[index]}
          />
        ),
      )}
    </span>
  );
}

export function ExamTimer({
  className,
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(
    EXAM_DURATION_SECONDS,
  );

  useEffect(() => {
    const deadline = Date.now() + EXAM_DURATION_SECONDS * 1000;
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

      setSecondsRemaining(remaining);

      if (remaining === 0) {
        window.clearInterval(timer);
      }
    };
    const timer = window.setInterval(updateTimer, 250);

    return () => window.clearInterval(timer);
  }, []);

  const formattedTime = formatTime(secondsRemaining);
  const previousFormattedTime = formatTime(
    Math.min(EXAM_DURATION_SECONDS, secondsRemaining + 1),
  );

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      {showLabel ? (
        <div className="flex items-center gap-1.5">
          <Clock3Icon
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
          <span className="text-xs font-medium text-muted-foreground">
            Time remaining
          </span>
        </div>
      ) : null}
      <time
        className="block font-mono text-base leading-none font-semibold tabular-nums text-foreground/90"
        dateTime={`PT${secondsRemaining}S`}
        aria-label={`${formattedTime} remaining`}
      >
        <TimerValue
          previousValue={previousFormattedTime}
          value={formattedTime}
        />
      </time>
    </div>
  );
}
