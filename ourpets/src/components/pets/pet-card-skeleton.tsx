import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PetCardSkeleton() {
  return (
    <Card>
      <div className="flex gap-4 p-4">
        <Skeleton className="h-24 w-24 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </Card>
  );
}

