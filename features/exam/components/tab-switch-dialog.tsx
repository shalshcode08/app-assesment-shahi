"use client";

import { Dialog } from "@base-ui/react/dialog";
import { EyeOffIcon, ShieldAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

function Shell({
  children,
  open,
  title,
  tone,
}: {
  children: React.ReactNode;
  open: boolean;
  title: string;
  tone: "critical" | "warning";
}) {
  const Icon = tone === "critical" ? ShieldAlertIcon : EyeOffIcon;

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-black/50 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
          <Dialog.Popup className="w-full max-w-md rounded-xl bg-background px-6 py-7 text-foreground shadow-xl outline-none transition-[opacity,transform] duration-150 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none">
            <span
              aria-hidden="true"
              className={`mx-auto flex size-11 items-center justify-center rounded-full ${
                tone === "critical"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-amber-500/12 text-amber-700 dark:text-amber-400"
              }`}
            >
              <Icon className="size-5" />
            </span>
            <Dialog.Title className="mt-4 text-center text-lg font-semibold">
              {title}
            </Dialog.Title>
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Shown when the candidate comes back after leaving the assessment. It states
 * the tally and the consequence plainly, because the rule is enforced on the
 * server whether or not the browser says anything.
 */
export function TabSwitchWarningDialog({
  count,
  limit,
  onAcknowledge,
  open,
}: {
  count: number;
  limit: number | null;
  onAcknowledge: () => void;
  open: boolean;
}) {
  const remaining = limit === null ? null : Math.max(0, limit - count);

  return (
    <Shell open={open} title="You left the assessment" tone="warning">
      <Dialog.Description className="mt-2 text-center text-sm leading-6 text-muted-foreground">
        This has been recorded as tab switch{" "}
        <span className="font-semibold text-foreground">{count}</span>
        {limit === null ? (
          <> and is visible to the assessment team.</>
        ) : (
          <>
            {" "}
            of <span className="font-semibold text-foreground">{limit}</span>{" "}
            allowed.{" "}
            {remaining === 0 ? (
              <span className="font-semibold text-destructive">
                Leaving again will submit your assessment automatically.
              </span>
            ) : (
              <>
                You have{" "}
                <span className="font-semibold text-foreground">
                  {remaining}
                </span>{" "}
                left before your assessment is submitted automatically.
              </>
            )}
          </>
        )}
      </Dialog.Description>

      <p className="mt-4 rounded-lg bg-muted px-3 py-2.5 text-xs leading-5 text-muted-foreground">
        Keep this tab open and in front until you submit. Switching tabs,
        opening another window, or minimising the browser all count.
      </p>

      <Button className="mt-6 w-full" onClick={onAcknowledge} size="lg">
        Continue assessment
      </Button>
    </Shell>
  );
}

/** Shown after the server has already submitted the attempt. */
export function TabSwitchAutoSubmitDialog({
  count,
  limit,
  onContinue,
  open,
}: {
  count: number;
  limit: number | null;
  onContinue: () => void;
  open: boolean;
}) {
  return (
    <Shell open={open} title="Your assessment was submitted" tone="critical">
      <Dialog.Description className="mt-2 text-center text-sm leading-6 text-muted-foreground">
        You left the assessment {count} time{count === 1 ? "" : "s"}, which is
        more than the {limit} allowed for this test. Your answers up to that
        point have been submitted and scored.
      </Dialog.Description>

      <Button className="mt-6 w-full" onClick={onContinue} size="lg">
        See your result
      </Button>
    </Shell>
  );
}
