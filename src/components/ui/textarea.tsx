import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "soft-control flex min-h-[120px] w-full rounded-[24px] border border-input/70 bg-background/72 px-4 py-3 text-sm shadow-[inset_0_1px_0_hsl(var(--background)/0.65)] backdrop-blur-xl ring-offset-background placeholder:text-muted-foreground/90 focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
