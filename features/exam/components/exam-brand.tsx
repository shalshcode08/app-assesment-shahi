import Image from "next/image";

import { cn } from "@/lib/utils";

export function ExamBrand({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <Image
        src="/assets/logo.png"
        alt="Shahi"
        width={compact ? 58 : 68}
        height={compact ? 36 : 42}
        className={cn("h-auto object-contain", compact ? "w-14" : "w-16")}
        priority
      />
      <div className="hidden h-6 w-px bg-border sm:block" />
      <p className="hidden truncate text-sm font-semibold text-foreground/90 sm:block">
        Trainer Assessment
      </p>
    </div>
  );
}
