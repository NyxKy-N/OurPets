"use client";

import * as React from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Heart, MessageCircle, Pencil, Reply, Trash2 } from "lucide-react";

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
  parentId?: string | null;
  user: { id: string; name: string | null; image: string | null };
  replies?: CommentItem[];
};
type CommentsPage = { items: CommentItem[]; nextCursor: string | null };

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message;
  return fallback;
}

export function Comments({
  petId,
  viewerId,
  viewerIsAdmin,
  initialCount,
}: {
  petId: string;
  viewerId: string | null;
  viewerIsAdmin: boolean;
  initialCount: number;
}) {
  const qc = useQueryClient();
  const { locale, messages } = useI18n();
  const [content, setContent] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingContent, setEditingContent] = React.useState("");
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
  const [replyContent, setReplyContent] = React.useState("");

  const profileHref = React.useCallback(
    (userId: string) => (viewerId === userId ? "/profile" : `/profile/${userId}`),
    [viewerId]
  );

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
    mutationFn: ({ nextContent, parentId }: { nextContent: string; parentId?: string }) =>
      apiFetch<CommentItem>("/api/comments", {
        method: "POST",
        body: JSON.stringify({ petId, parentId, content: nextContent }),
      }),
    onMutate: ({ nextContent }) => {
      if (!viewerId) throw new Error("UNAUTHENTICATED");
      if (!nextContent.trim()) throw new Error("EMPTY");
    },
    onSuccess: async (_data, variables) => {
      if (variables.parentId) {
        setReplyingToId(null);
        setReplyContent("");
      } else {
        setContent("");
      }
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

  const updateComment = useMutation({
    mutationFn: ({ commentId, nextContent }: { commentId: string; nextContent: string }) =>
      apiFetch<CommentItem>(`/api/comments/${commentId}`, {
        method: "PATCH",
        body: JSON.stringify({ content: nextContent }),
      }),
    onSuccess: async () => {
      toast.success(messages.comments.commentUpdated);
      setEditingId(null);
      setEditingContent("");
      await qc.invalidateQueries({ queryKey: ["comments", petId] });
    },
    onError: (err: unknown) => toast.error(errorMessage(err, messages.comments.failedToUpdate)),
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const totalLoaded = items.reduce(
    (sum, item) => sum + 1 + (item.replies?.length ?? 0),
    0
  );

  function renderReplyComposer(commentId: string) {
    if (replyingToId !== commentId) return null;

    return (
      <div className="mt-3 space-y-3">
        <Textarea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder={messages.comments.replyPlaceholder}
          disabled={addComment.isPending}
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setReplyingToId(null);
              setReplyContent("");
            }}
            disabled={addComment.isPending}
          >
            {messages.common.cancel}
          </Button>
          <Button
            size="sm"
            onClick={() => addComment.mutate({ nextContent: replyContent.trim(), parentId: commentId })}
            disabled={addComment.isPending || !replyContent.trim()}
          >
            {messages.comments.reply}
          </Button>
        </div>
      </div>
    );
  }

  function renderCommentActions(comment: CommentItem) {
    const canEdit = viewerId === comment.userId || viewerIsAdmin;

    return (
      <div className="flex shrink-0 items-center gap-1">
        {viewerId ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingId(null);
              setEditingContent("");
              setReplyingToId(comment.id);
              setReplyContent("");
            }}
            disabled={deleteComment.isPending || updateComment.isPending || addComment.isPending}
          >
            <Reply className="mr-1 h-4 w-4" />
            {messages.comments.reply}
          </Button>
        ) : null}
        {canEdit ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setReplyingToId(null);
                setReplyContent("");
                setEditingId(comment.id);
                setEditingContent(comment.content);
              }}
              disabled={deleteComment.isPending || updateComment.isPending || addComment.isPending}
            >
              <Pencil className="mr-1 h-4 w-4" />
              {messages.comments.edit}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteComment.mutate(comment.id)}
              disabled={deleteComment.isPending || updateComment.isPending || addComment.isPending}
              aria-label={messages.comments.deleteLabel}
            >
              <Trash2 className="mr-1 h-4 w-4 text-muted-foreground" />
              {messages.comments.delete}
            </Button>
          </>
        ) : null}
      </div>
    );
  }

  function renderCommentBody(comment: CommentItem) {
    if (editingId === comment.id) {
      return (
        <div className="mt-3 space-y-3">
          <Textarea
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            disabled={updateComment.isPending}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingId(null);
                setEditingContent("");
              }}
              disabled={updateComment.isPending}
            >
              {messages.common.cancel}
            </Button>
            <Button
              size="sm"
              onClick={() =>
                updateComment.mutate({
                  commentId: comment.id,
                  nextContent: editingContent.trim(),
                })
              }
              disabled={updateComment.isPending || !editingContent.trim()}
            >
              {messages.common.save}
            </Button>
          </div>
        </div>
      );
    }

    return <p className="mt-2 whitespace-pre-wrap break-words text-sm">{comment.content}</p>;
  }

  function renderCommentItem(comment: CommentItem, isReply = false) {
    return (
      <div
        key={comment.id}
        className={isReply ? "rounded-[20px] border border-border/60 bg-background/45 p-4" : "glass-panel rounded-[24px] p-4 sm:p-5"}
      >
        <div className="flex gap-3">
          <Link href={profileHref(comment.user.id)} prefetch={false} className="shrink-0">
            <Avatar className="h-9 w-9 transition-transform duration-300 ease-out hover:scale-[1.03]">
              <AvatarImage src={comment.user.image ?? undefined} />
              <AvatarFallback>{comment.user.name?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={profileHref(comment.user.id)}
                  prefetch={false}
                  className="truncate text-sm font-medium transition-colors hover:text-foreground"
                >
                  {comment.user.name ?? messages.common.user}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(locale, comment.createdAt)}
                </div>
              </div>
              {renderCommentActions(comment)}
            </div>
            {renderCommentBody(comment)}
            {renderReplyComposer(comment.id)}
            {!isReply && comment.replies?.length ? (
              <div className="mt-4 space-y-3 border-l border-border/60 pl-4 sm:pl-5">
                {comment.replies.map((reply) => renderCommentItem(reply, true))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="rounded-[32px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
            {messages.comments.title}
          </div>
          <h2 className="gradient-text mt-2 text-2xl font-semibold tracking-[-0.03em]">
            {messages.comments.title}
          </h2>
        </div>
        <div className="text-xs text-muted-foreground">
          {totalLoaded || query.isLoading ? totalLoaded : initialCount} {messages.common.total}
        </div>
      </div>

      <div className="mt-5 space-y-3">
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
            onClick={() => addComment.mutate({ nextContent: content.trim() })}
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
          <div className="glass-panel relative overflow-hidden rounded-[28px] p-8 text-center">
            <div className="absolute left-6 top-6 h-14 w-14 rounded-full bg-primary/12 blur-2xl" />
            <div className="absolute bottom-5 right-8 h-16 w-16 rounded-full bg-pink-400/12 blur-2xl" />
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border/60 bg-background/75">
              <div className="absolute -left-2 -top-2 rounded-full bg-background p-2 shadow-sm">
                <Heart className="h-4 w-4 text-pink-500" />
              </div>
              <MessageCircle className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em]">{messages.comments.emptyTitle}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {messages.comments.emptyDescription}
            </p>
          </div>
        ) : (
          items.map((c) => renderCommentItem(c))
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
