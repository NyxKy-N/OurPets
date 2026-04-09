"use client";

import * as React from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { useI18n } from "@/app/providers";
import { apiFetch } from "@/lib/fetcher";
import { formatDateTime } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  user: { id: string; name: string | null; image: string | null };
};
type CommentsPage = { items: CommentItem[]; nextCursor: string | null };

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message;
  return fallback;
}

export function Comments({
  petId,
  viewerId,
  initialCount,
}: {
  petId: string;
  viewerId: string | null;
  initialCount: number;
}) {
  const qc = useQueryClient();
  const { locale, messages } = useI18n();
  const [content, setContent] = React.useState("");

  const query = useInfiniteQuery({
    queryKey: ["comments", petId],
    queryFn: ({ pageParam }) => {
      const sp = new URLSearchParams();
      sp.set("petId", petId);
      sp.set("limit", "20");
      if (pageParam) sp.set("cursor", String(pageParam));
      return apiFetch<CommentsPage>(`/api/comments?${sp.toString()}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const addComment = useMutation({
    mutationFn: () =>
      apiFetch<CommentItem>("/api/comments", {
        method: "POST",
        body: JSON.stringify({ petId, content }),
      }),
    onMutate: () => {
      if (!viewerId) throw new Error("UNAUTHENTICATED");
      if (!content.trim()) throw new Error("EMPTY");
    },
    onSuccess: async () => {
      setContent("");
      toast.success(messages.comments.commentAdded);
      await qc.invalidateQueries({ queryKey: ["comments", petId] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error && err.message === "UNAUTHENTICATED") {
        toast.error(messages.comments.signInToComment);
        return;
      }
      if (err instanceof Error && err.message === "EMPTY") return;
      toast.error(errorMessage(err, messages.comments.failedToAdd));
    },
  });

  const deleteComment = useMutation({
    mutationFn: (commentId: string) =>
      apiFetch<{ id: string }>(`/api/comments/${commentId}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success(messages.comments.commentDeleted);
      await qc.invalidateQueries({ queryKey: ["comments", petId] });
    },
    onError: (err: unknown) => toast.error(errorMessage(err, messages.comments.failedToDelete)),
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{messages.comments.title}</h2>
        <div className="text-xs text-muted-foreground">
          {items.length || query.isLoading ? items.length : initialCount} {messages.common.total}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Textarea
          placeholder={
            viewerId ? messages.comments.writePlaceholder : messages.comments.signInPlaceholder
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={!viewerId || addComment.isPending}
        />
        <div className="flex justify-end">
          <Button
            onClick={() => addComment.mutate()}
            disabled={!viewerId || addComment.isPending || !content.trim()}
          >
            {messages.comments.post}
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {query.isLoading ? (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </>
        ) : items.length === 0 ? (
          <div className="rounded-lg border bg-background p-8 text-center text-sm text-muted-foreground">
            {messages.comments.empty}
          </div>
        ) : (
          items.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={c.user.image ?? undefined} />
                <AvatarFallback>{c.user.name?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {c.user.name ?? messages.common.user}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(locale, c.createdAt)}
                    </div>
                  </div>
                  {viewerId === c.userId ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteComment.mutate(c.id)}
                      disabled={deleteComment.isPending}
                      aria-label={messages.comments.deleteLabel}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                  {c.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {query.hasNextPage ? (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? messages.common.loading : messages.comments.loadMore}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
