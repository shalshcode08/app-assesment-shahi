"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlertIcon, CircleCheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import type { AdminActionState } from "@/features/admin/types";
import { cn } from "@/lib/utils";

export function ActionMessage({
  className,
  state,
}: {
  className?: string;
  state: Pick<AdminActionState, "message" | "status">;
}) {
  if (!state.message || state.status === "idle") {
    return null;
  }

  const isError = state.status === "error";
  const Icon = isError ? CircleAlertIcon : CircleCheckIcon;

  return (
    <p
      role={isError ? "alert" : "status"}
      className={cn(
        "flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-xs leading-5",
        isError
          ? "bg-destructive/10 text-destructive"
          : "bg-green-500/10 text-green-700 dark:text-green-400",
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      {state.message}
    </p>
  );
}

/**
 * A refusal the admin has to read and then get rid of, so it carries its own
 * dismiss. It reappears on the next attempt because the action state that
 * feeds it is new each time.
 */
export function DismissibleNote({
  children,
  className,
  onDismiss,
}: {
  children: React.ReactNode;
  className?: string;
  onDismiss: () => void;
}) {
  return (
    <span
      className={cn(
        "flex items-start gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-2 text-xs leading-5 text-destructive shadow-sm",
        className,
      )}
      role="alert"
    >
      <span className="min-w-0 flex-1">{children}</span>
      <button
        aria-label="Dismiss message"
        className="-m-0.5 shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={onDismiss}
        type="button"
      >
        <XIcon aria-hidden="true" className="size-3.5" />
      </button>
    </span>
  );
}

/** Submit button that reflects the pending state of its own form. */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? (
        <Loader2Icon aria-hidden="true" className="animate-spin" />
      ) : null}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}

/**
 * Destructive actions ask once inline rather than opening a dialog, so the
 * confirmation stays next to the row it affects.
 */
export function ConfirmButton({
  children,
  confirmLabel = "Confirm",
  size,
  ...props
}: React.ComponentProps<typeof Button> & { confirmLabel?: string }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const { pending } = useFormStatus();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!isConfirming) {
    return (
      <Button
        type="button"
        size={size}
        onClick={() => {
          setIsConfirming(true);
          // Re-arms itself so a stray click does not leave a live delete button.
          timer.current = setTimeout(() => setIsConfirming(false), 5000);
        }}
        {...props}
      >
        {children}
      </Button>
    );
  }

  // The confirming state carries a word, so it drops any fixed icon-square size.
  return (
    <Button
      type="submit"
      variant="destructive"
      size={typeof size === "string" && size.startsWith("icon") ? "lg" : size}
      disabled={pending}
      {...props}
    >
      {pending ? (
        <Loader2Icon aria-hidden="true" className="animate-spin" />
      ) : null}
      {confirmLabel}
    </Button>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "amber" | "blue" | "green" | "red" | "slate";
}) {
  const tones = {
    amber: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
    blue: "bg-blue-500/12 text-blue-700 dark:text-blue-400",
    green: "bg-green-500/12 text-green-700 dark:text-green-400",
    red: "bg-destructive/10 text-destructive",
    slate: "bg-muted text-muted-foreground",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
