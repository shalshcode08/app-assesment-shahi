"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
      aria-label="Refresh dashboard data"
    >
      <RefreshCwIcon
        aria-hidden="true"
        className={isPending ? "animate-spin" : undefined}
      />
      <span className="hidden sm:inline">
        {isPending ? "Refreshing" : "Refresh"}
      </span>
    </Button>
  );
}
