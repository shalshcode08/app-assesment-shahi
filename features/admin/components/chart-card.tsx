"use client";

import { useState, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Maximize2Icon, XIcon } from "lucide-react";

import { SURFACE, TINT, type Tint } from "@/features/admin/components/dashboard-primitives";
import { cn } from "@/lib/utils";

/**
 * A chart panel that can be opened full size. The card holds the summary read
 * of the chart; the dialog holds the same chart drawn larger plus the numbers
 * behind it, so "expand" means more information rather than the same picture
 * scaled up.
 */
export function ChartCard({
  children,
  className,
  description,
  detail,
  expanded,
  expandedDescription,
  footer,
  icon,
  tint = TINT.blue,
  title,
}: {
  children: ReactNode;
  className?: string;
  description?: string;
  /** Tables and stat read-outs shown under the large chart. */
  detail?: ReactNode;
  /** The chart drawn at dialog size. Falls back to the card chart. */
  expanded?: ReactNode;
  expandedDescription?: string;
  footer?: ReactNode;
  /**
   * A rendered icon element, not a component: this is a Client Component, and
   * a component type cannot cross the server boundary as a prop.
   */
  icon?: ReactNode;
  tint?: Tint;
  title: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className={cn(SURFACE, "flex min-w-0 flex-col p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {icon ? (
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: tint.bg, color: tint.fg }}
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-foreground">{title}</h2>
            {description ? (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Maximize2Icon aria-hidden="true" className="size-3.5" />
            Expand
            <span className="sr-only">{title} in detail</span>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-black/45 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
            <Dialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-3 sm:p-6">
              <Dialog.Popup className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[1100px] flex-col overflow-hidden rounded-2xl bg-background text-foreground shadow-2xl outline-none transition-[opacity,transform] duration-150 data-ending-style:scale-[0.99] data-ending-style:opacity-0 data-starting-style:scale-[0.99] data-starting-style:opacity-0 motion-reduce:transition-none sm:max-h-[calc(100dvh-3rem)]">
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border/60 px-5 py-4 sm:px-6">
                  <div className="flex min-w-0 items-start gap-3">
                    {icon ? (
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: tint.bg, color: tint.fg }}
                      >
                        {icon}
                      </span>
                    ) : null}
                    <div className="min-w-0">
                      <Dialog.Title className="text-base font-semibold tracking-[-0.01em]">
                        {title}
                      </Dialog.Title>
                      <Dialog.Description className="mt-1 text-xs leading-5 text-muted-foreground">
                        {expandedDescription ?? description}
                      </Dialog.Description>
                    </div>
                  </div>
                  <Dialog.Close
                    aria-label="Close"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <XIcon aria-hidden="true" className="size-4" />
                  </Dialog.Close>
                </div>

                {/*
                  A plain block, not a flex column: the tables inside are their
                  own scroll containers, and a flex parent squashes those to a
                  stub with its own scrollbar. Natural height here means one
                  scrollbar for the whole dialog.
                */}
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                  <div className="min-w-0">{expanded ?? children}</div>
                  {detail}
                </div>
              </Dialog.Popup>
            </Dialog.Viewport>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <div className="min-w-0 flex-1">{children}</div>
      {footer}
    </section>
  );
}
