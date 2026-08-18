"use client";

import { useCallback, useEffect, useState } from "react";

type AttemptEventType =
  | "connection_lost"
  | "connection_restored"
  | "page_hidden"
  | "window_blurred";

type EventOutcome = {
  autoSubmitted: boolean;
  maxTabSwitches: number | null;
  tabWarningCount: number;
};

export type AttemptMonitoring = {
  acknowledgeWarning: () => void;
  autoSubmitted: boolean;
  limit: number | null;
  pendingWarning: number | null;
  tabSwitchCount: number;
};

async function recordAttemptEvent(
  eventType: AttemptEventType,
): Promise<EventOutcome | null> {
  const response = await fetch("/api/exam/events", {
    body: JSON.stringify({
      clientOccurredAt: new Date().toISOString(),
      dedupeKey: crypto.randomUUID(),
      eventType,
    }),
    headers: { "content-type": "application/json" },
    keepalive: true,
    method: "POST",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json().catch(() => null)) as EventOutcome | null;
}

/**
 * Records what happens around the attempt and reports the tab-switch tally the
 * server keeps. The server owns both the count and the auto-submit; this hook
 * only mirrors them so the candidate is told where they stand.
 */
export function useAttemptMonitoring(
  isActive: boolean,
  limit: number | null,
  recordedCount = 0,
): AttemptMonitoring {
  const [state, setState] = useState({
    autoSubmitted: false,
    pendingWarning: null as number | null,
    // Seeded from the attempt so a reload does not reset what the server saw.
    tabSwitchCount: recordedCount,
  });

  useEffect(() => {
    if (!isActive) {
      return;
    }

    // The warning follows the server's tally rather than the browser event, so
    // whichever event a platform happens to fire, the candidate is warned once.
    const apply = (outcome: EventOutcome | null) => {
      if (!outcome) {
        return;
      }

      setState((previous) => ({
        autoSubmitted: outcome.autoSubmitted || previous.autoSubmitted,
        pendingWarning:
          outcome.tabWarningCount > previous.tabSwitchCount &&
          !outcome.autoSubmitted
            ? outcome.tabWarningCount
            : previous.pendingWarning,
        tabSwitchCount: Math.max(previous.tabSwitchCount, outcome.tabWarningCount),
      }));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void recordAttemptEvent("page_hidden").then(apply);
      }
    };

    // Switching application (Cmd-Tab on macOS, Alt-Tab elsewhere) usually
    // leaves the page "visible" and fires only this, so it counts as leaving.
    // The server collapses the pair a single switch can produce.
    const handleBlur = () => {
      void recordAttemptEvent("window_blurred").then(apply);
    };

    const handleOffline = () =>
      void recordAttemptEvent("connection_lost").then(apply);
    const handleOnline = () =>
      void recordAttemptEvent("connection_restored").then(apply);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [isActive]);

  const acknowledgeWarning = useCallback(() => {
    setState((previous) => ({ ...previous, pendingWarning: null }));
  }, []);

  return {
    acknowledgeWarning,
    autoSubmitted: state.autoSubmitted,
    limit,
    pendingWarning: state.pendingWarning,
    tabSwitchCount: state.tabSwitchCount,
  };
}
