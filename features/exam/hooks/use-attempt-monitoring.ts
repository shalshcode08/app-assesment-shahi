"use client";

import { useEffect } from "react";

type AttemptEventType =
  | "connection_lost"
  | "connection_restored"
  | "page_hidden";

function recordAttemptEvent(eventType: AttemptEventType) {
  void fetch("/api/exam/events", {
    body: JSON.stringify({
      clientOccurredAt: new Date().toISOString(),
      dedupeKey: crypto.randomUUID(),
      eventType,
    }),
    headers: { "content-type": "application/json" },
    keepalive: true,
    method: "POST",
  });
}

export function useAttemptMonitoring(isActive: boolean) {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        recordAttemptEvent("page_hidden");
      }
    };
    const handleOffline = () => recordAttemptEvent("connection_lost");
    const handleOnline = () => recordAttemptEvent("connection_restored");

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [isActive]);
}
