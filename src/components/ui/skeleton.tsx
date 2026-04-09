import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-muted/80 via-muted to-muted/80 dark:from-white/7 dark:via-white/11 dark:to-white/7",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
