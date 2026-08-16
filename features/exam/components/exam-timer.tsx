"use client";

import { useEffect, useState } from "react";
import { Clock3Icon } from "lucide-react";

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

function getSecondsRemaining(
  durationSeconds: number,
  expiresAt: string | null,
  serverOffsetMilliseconds: number,
) {
  if (!expiresAt) {
    return durationSeconds;
  }

  const serverAdjustedNow = Date.now() + serverOffsetMilliseconds;

  return Math.max(
    0,
    Math.ceil((Date.parse(expiresAt) - serverAdjustedNow) / 1000),
  );
}

export function ExamTimer({
  className,
  durationSeconds,
  expiresAt,
  isRunning = true,
  onExpire,
  serverNow,
  showLabel = true,
}: {
  className?: string;
  durationSeconds: number;
  expiresAt: string | null;
  isRunning?: boolean;
  onExpire?: () => void;
  serverNow: string;
  showLabel?: boolean;
}) {
  const [serverOffsetMilliseconds] = useState(
    () => Date.parse(serverNow) - Date.now(),
  );
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    getSecondsRemaining(
      durationSeconds,
      expiresAt,
      Date.parse(serverNow) - Date.now(),
    ),
  );

  useEffect(() => {
    if (!isRunning || !expiresAt) {
      return;
    }

    const updateTimer = () => {
      const nextSecondsRemaining = getSecondsRemaining(
        durationSeconds,
        expiresAt,
        serverOffsetMilliseconds,
      );

      setSecondsRemaining(nextSecondsRemaining);

      if (nextSecondsRemaining === 0) {
        window.clearInterval(timer);
        onExpire?.();
      }
    };
    const timer = window.setInterval(updateTimer, 250);

    return () => window.clearInterval(timer);
  }, [
    durationSeconds,
    expiresAt,
    isRunning,
    onExpire,
    serverOffsetMilliseconds,
  ]);

  const formattedTime = formatTime(secondsRemaining);
  const previousFormattedTime = formatTime(
    Math.min(durationSeconds, secondsRemaining + 1),
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
