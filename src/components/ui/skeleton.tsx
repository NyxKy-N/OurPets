import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "skeleton rounded-md bg-[length:220%_100%] bg-[position:180%_0] bg-gradient-to-r from-muted/85 via-muted/55 to-muted/85 [animation:skeleton-shimmer_1100ms_var(--ease-soft)_infinite] dark:from-white/9 dark:via-white/14 dark:to-white/9",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
