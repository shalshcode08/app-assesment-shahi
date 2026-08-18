"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type AttemptEventType =
  | "connection_lost"
  | "connection_restored"
  | "page_hidden";

async function recordAttemptEvent(
  eventType: AttemptEventType,
  onAutoSubmitted: () => void,
) {
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
    return;
  }

  const outcome: unknown = await response.json().catch(() => null);

  // The server has already submitted the attempt once the tab-switch allowance
  // is passed, so the browser's only job left is to show the result.
  if (
    outcome &&
    typeof outcome === "object" &&
    "autoSubmitted" in outcome &&
    outcome.autoSubmitted === true
  ) {
    onAutoSubmitted();
  }
}

export function useAttemptMonitoring(isActive: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const showResult = () => router.push("/exam/result");

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void recordAttemptEvent("page_hidden", showResult);
      }
    };
    const handleOffline = () =>
      void recordAttemptEvent("connection_lost", showResult);
    const handleOnline = () =>
      void recordAttemptEvent("connection_restored", showResult);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [isActive, router]);
}
