import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PetCardSkeleton({ layout = "list" }: { layout?: "list" | "grid" }) {
  const isGrid = layout === "grid";

  return (
    <Card className="overflow-hidden rounded-[30px] p-1">
      <div
        className={cn(
          "rounded-[26px] p-4 sm:p-5",
          isGrid ? "flex h-full flex-col gap-4" : "flex flex-col gap-5 sm:flex-row sm:items-center"
        )}
      >
        <Skeleton
          className={cn(
            "w-full rounded-[24px]",
            isGrid ? "aspect-[4/4.2] min-h-[240px]" : "aspect-[4/3] sm:h-32 sm:w-32 sm:shrink-0 sm:aspect-square"
          )}
        />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-7 w-1/3 rounded-full" />
          <Skeleton className="h-4 w-1/2 rounded-full" />
        </div>
        <div className={cn("flex gap-2", isGrid ? "pt-1" : "sm:flex-col")}>
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
    </Card>
  );
}
