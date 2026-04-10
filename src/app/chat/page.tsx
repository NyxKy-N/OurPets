"use client";

import * as React from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mic, Send, SmilePlus, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

import { useI18n } from "@/app/providers";
import { apiFetch } from "@/lib/fetcher";
import { formatDateTime } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ReactionSummary = { emoji: string; count: number; reactedByMe: boolean };
type ChatUser = { id: string; name: string | null; image: string | null };
type ChatMessage = {
  id: string;
  userId: string;
  content: string | null;
  replyToId: string | null;
  audioUrl: string | null;
  audioDuration: number | null;
  createdAt: string;
  deletedAt: string | null;
  user: ChatUser;
  replyTo: (ChatMessage & { reactions?: ReactionSummary[] }) | null;
  reactions: ReactionSummary[];
};
type ChatPage = { items: ChatMessage[]; nextCursor: string | null };

type CloudinarySignature = { signature: string; timestamp: number; apiKey: string; cloudName: string; folder: string };

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message;
  return fallback;
}

function displayName(user: ChatUser, fallback: string) {
  return user.name?.trim() || fallback;
}

function getInitials(name: string) {
  const n = name.trim();
  if (!n) return "U";
  return n.slice(0, 1).toUpperCase();
}

async function uploadVoice(blob: Blob) {
  const sig = await apiFetch<CloudinarySignature>("/api/cloudinary/signature", { method: "POST" });
  const url = `https://api.cloudinary.com/v1_1/${sig.cloudName}/video/upload`;

  const file = new File([blob], "voice.webm", { type: blob.type || "audio/webm" });
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  const res = await fetch(url, { method: "POST", body: form });
  const json = (await res.json().catch(() => null)) as
    | { secure_url: string; public_id: string; duration?: number }
    | { error?: { message?: string } }
    | null;
  if (!res.ok || !json || !("secure_url" in json)) {
    const msg =
      (json && "error" in json && json.error?.message) || `Upload failed (${res.status})`;
    throw new Error(msg);
  }

  return {
    url: json.secure_url,
    publicId: json.public_id,
    duration: typeof json.duration === "number" ? Math.round(json.duration) : null,
  };
}

export default function ChatPage() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const viewerId = session?.user?.id ?? null;
  const { locale, messages } = useI18n();
  const [content, setContent] = React.useState("");
  const [quoted, setQuoted] = React.useState<ChatMessage | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [isUploadingVoice, setIsUploadingVoice] = React.useState(false);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const didInitialScrollRef = React.useRef(false);

  const query = useInfiniteQuery({
    queryKey: ["chat"],
    queryFn: ({ pageParam }) => {
      const sp = new URLSearchParams();
      sp.set("limit", "40");
      if (pageParam) sp.set("cursor", String(pageParam));
      return apiFetch<ChatPage>(`/api/chat?${sp.toString()}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchInterval: 3000,
  });

  const sendMessage = useMutation({
    mutationFn: (payload: {
      nextContent?: string;
      replyToId?: string;
      audioUrl?: string;
      audioPublicId?: string;
      audioDuration?: number | null;
    }) =>
      apiFetch<ChatMessage>("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          content: payload.nextContent,
          replyToId: payload.replyToId,
          audioUrl: payload.audioUrl,
          audioPublicId: payload.audioPublicId,
          audioDuration: payload.audioDuration ?? undefined,
        }),
      }),
    onMutate: () => {
      if (!viewerId) throw new Error("UNAUTHENTICATED");
    },
    onSuccess: async () => {
      setContent("");
      setQuoted(null);
      await qc.invalidateQueries({ queryKey: ["chat"] });
      window.setTimeout(() => bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }), 60);
    },
    onError: (err: unknown) => {
      if (err instanceof Error && err.message === "UNAUTHENTICATED") {
        toast.error(messages.chat.signInToSend);
        return;
      }
      toast.error(errorMessage(err, messages.chat.failedToSend));
    },
  });

  const toggleReaction = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      apiFetch<{ ok: true; toggledOn: boolean }>("/api/chat/reactions", {
        method: "POST",
        body: JSON.stringify({ messageId, emoji }),
      }),
    onMutate: () => {
      if (!viewerId) throw new Error("UNAUTHENTICATED");
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["chat"] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error && err.message === "UNAUTHENTICATED") {
        toast.error(messages.chat.signInToSend);
        return;
      }
      toast.error(errorMessage(err, messages.common.somethingWentWrong));
    },
  });

  const deleteMessage = useMutation({
    mutationFn: (id: string) => apiFetch<{ ok: true }>(`/api/chat/${id}`, { method: "DELETE" }),
    onMutate: () => {
      if (!viewerId) throw new Error("UNAUTHENTICATED");
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["chat"] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error && err.message === "UNAUTHENTICATED") {
        toast.error(messages.chat.signInToSend);
        return;
      }
      toast.error(errorMessage(err, messages.common.somethingWentWrong));
    },
  });

  const deleteAllMessages = useMutation({
    mutationFn: () => apiFetch<{ count: number }>(`/api/chat?scope=all`, { method: "DELETE" }),
    onMutate: () => {
      if (!viewerId) throw new Error("UNAUTHENTICATED");
      if (!session?.user?.isAdmin) throw new Error("FORBIDDEN");
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["chat"] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error && err.message === "UNAUTHENTICATED") {
        toast.error(messages.chat.signInToSend);
        return;
      }
      toast.error(errorMessage(err, messages.common.somethingWentWrong));
    },
  });

  const items = React.useMemo(() => {
    const pages = query.data?.pages ?? [];
    const itemsDesc = pages.flatMap((p) => p.items);
    return [...itemsDesc].reverse();
  }, [query.data]);

  React.useEffect(() => {
    if (!query.data) return;
    if (didInitialScrollRef.current) return;
    didInitialScrollRef.current = true;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [query.data]);

  async function startRecording() {
    if (isRecording || isUploadingVoice) return;
    if (!viewerId) {
      toast.error(messages.chat.signInToSend);
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.addEventListener("dataavailable", (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    });
    recorder.addEventListener("stop", () => {
      stream.getTracks().forEach((t) => t.stop());
    });
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
  }

  async function stopRecordingAndSend() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    const stopped = new Promise<Blob>((resolve) => {
      recorder.addEventListener(
        "stop",
        () => {
          resolve(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
        },
        { once: true }
      );
    });

    recorder.stop();
    setIsRecording(false);

    try {
      setIsUploadingVoice(true);
      const blob = await stopped;
      const uploaded = await uploadVoice(blob);
      await sendMessage.mutateAsync({
        replyToId: quoted?.id ?? undefined,
        audioUrl: uploaded.url,
        audioPublicId: uploaded.publicId,
        audioDuration: uploaded.duration,
      });
    } catch (err) {
      toast.error(errorMessage(err, messages.chat.failedToUploadVoice));
    } finally {
      setIsUploadingVoice(false);
      recorderRef.current = null;
      chunksRef.current = [];
    }
  }

  const quickEmojis = ["❤️", "😂", "👍", "🐾", "🥹", "🔥"];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-7 sm:py-9 lg:py-12">
      <div className="space-y-2">
        <div className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{messages.chat.title}</div>
      </div>

      <Card className="glass-panel overflow-hidden rounded-[32px] p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-background/30 px-4 py-3 sm:px-5">
          <div className="text-sm font-semibold tracking-[-0.01em] text-foreground/85">OurPets</div>
          <div className="flex items-center gap-2">
            {session?.user?.isAdmin ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!window.confirm(messages.chat.confirmDeleteAll)) return;
                  deleteAllMessages.mutate();
                }}
                disabled={deleteAllMessages.isPending}
                className="h-10 rounded-full px-4"
              >
                {messages.chat.deleteAll}
              </Button>
            ) : null}
            {query.hasNextPage ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
                className="h-10 rounded-full px-4"
              >
                {messages.chat.loadMore}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="max-h-[62vh] overflow-y-auto px-3 py-4 sm:px-5">
          {query.isLoading ? (
            <div className="text-sm text-muted-foreground">{messages.common.loading}</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">{messages.feed.empty}</div>
          ) : (
            <div className="space-y-3">
              {items.map((m) => {
                const mine = viewerId === m.userId;
                const isDeleted = Boolean(m.deletedAt);
                const createdMs = new Date(m.createdAt).getTime();
                const canRecall = mine && !isDeleted && Date.now() - createdMs <= 2 * 60 * 1000;
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex gap-3 ${mine ? "justify-end" : "justify-start"}`}
                  >
                    {!mine ? (
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={m.user.image ?? undefined} />
                        <AvatarFallback>{getInitials(displayName(m.user, messages.common.user))}</AvatarFallback>
                      </Avatar>
                    ) : null}

                    <div
                      className={`flex max-w-[88%] flex-col space-y-2 sm:max-w-[74%] ${mine ? "items-end text-right" : ""}`}
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="text-sm font-semibold text-foreground/85">
                          {displayName(m.user, messages.common.user)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(locale, m.createdAt)}
                        </span>
                      </div>

                      <div className={`rounded-[24px] border border-white/70 bg-white/45 px-4 py-3 backdrop-blur-xl ${mine ? "ml-auto" : ""}`}>
                        {m.replyTo ? (
                          <button
                            type="button"
                            className="mb-2 w-full rounded-[18px] border border-white/70 bg-white/40 px-3 py-2 text-left text-xs leading-5 text-muted-foreground backdrop-blur-xl"
                            onClick={() => setQuoted(m.replyTo)}
                          >
                            {m.replyTo.deletedAt ? (
                              <span className="italic text-muted-foreground">{messages.chat.deletedPlaceholder}</span>
                            ) : (
                              <>
                                <span className="font-semibold text-foreground/70">
                                  {displayName(m.replyTo.user, messages.common.user)}
                                </span>
                                {m.replyTo.content ? ` · ${m.replyTo.content.slice(0, 120)}` : ""}
                                {!m.replyTo.content && m.replyTo.audioUrl ? " · [voice]" : ""}
                              </>
                            )}
                          </button>
                        ) : null}

                        {isDeleted ? (
                          <div className="text-sm italic text-muted-foreground">{messages.chat.deletedPlaceholder}</div>
                        ) : (
                          <>
                            {m.content ? (
                              <div className="whitespace-pre-wrap break-words text-sm text-foreground/90">{m.content}</div>
                            ) : null}
                            {m.audioUrl ? (
                              <div className="mt-2">
                                <audio controls preload="none" src={m.audioUrl} className="w-full" />
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>

                      <div className={`flex flex-wrap items-center gap-1.5 ${mine ? "justify-end" : ""}`}>
                        <div className="flex flex-wrap items-center gap-1">
                          {!isDeleted &&
                            m.reactions.slice(0, 5).map((r) => (
                              <button
                                key={`${m.id}-${r.emoji}`}
                                type="button"
                                className={`soft-control inline-flex h-9 items-center gap-1 rounded-full border border-white/70 bg-white/40 px-3 text-xs font-medium text-foreground/80 backdrop-blur-xl hover:bg-white/55 active:scale-[0.98] ${
                                  r.reactedByMe ? "ring-2 ring-primary/25" : ""
                                }`}
                                onClick={() => toggleReaction.mutate({ messageId: m.id, emoji: r.emoji })}
                                disabled={toggleReaction.isPending}
                              >
                                <span>{r.emoji}</span>
                                <span className="text-muted-foreground">{r.count}</span>
                              </button>
                            ))}
                        </div>

                        {!isDeleted && (
                          <div className="flex items-center gap-1">
                            {quickEmojis.map((emoji) => (
                              <button
                                key={`${m.id}-${emoji}`}
                                type="button"
                                className="soft-control inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/40 text-sm text-foreground/80 backdrop-blur-xl hover:bg-white/55 active:scale-[0.98]"
                                onClick={() => toggleReaction.mutate({ messageId: m.id, emoji })}
                                disabled={toggleReaction.isPending}
                                aria-label={emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        {!isDeleted && (
                          <button
                            type="button"
                            className="soft-control inline-flex h-9 items-center rounded-full border border-white/70 bg-white/40 px-3 text-xs font-medium text-foreground/80 backdrop-blur-xl hover:bg-white/55 active:scale-[0.98]"
                            onClick={() => setQuoted(m)}
                          >
                            {messages.chat.quote}
                          </button>
                        )}

                        {canRecall ? (
                          <button
                            type="button"
                            className="soft-control inline-flex h-9 items-center rounded-full border border-white/70 bg-white/40 px-3 text-xs font-medium text-foreground/80 backdrop-blur-xl hover:bg-white/55 active:scale-[0.98]"
                            onClick={() => deleteMessage.mutate(m.id)}
                          >
                            {messages.chat.recall}
                          </button>
                        ) : null}

                        {!canRecall && session?.user?.isAdmin && !isDeleted ? (
                          <button
                            type="button"
                            className="soft-control inline-flex h-9 items-center rounded-full border border-white/70 bg-white/40 px-3 text-xs font-medium text-foreground/80 backdrop-blur-xl hover:bg-white/55 active:scale-[0.98]"
                            onClick={() => deleteMessage.mutate(m.id)}
                          >
                            {messages.chat.delete}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {mine ? (
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={m.user.image ?? undefined} />
                        <AvatarFallback>{getInitials(displayName(m.user, messages.common.user))}</AvatarFallback>
                      </Avatar>
                    ) : null}
                  </motion.div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-border/50 bg-background/30 px-3 py-3 sm:px-5">
          {quoted ? (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-[20px] border border-white/70 bg-white/40 px-3 py-2 text-xs text-muted-foreground backdrop-blur-xl">
              <div className="min-w-0 truncate">
                {quoted.deletedAt ? (
                  <span className="italic">{messages.chat.deletedPlaceholder}</span>
                ) : (
                  <>
                    <span className="font-semibold text-foreground/75">
                      {displayName(quoted.user, messages.common.user)}
                    </span>
                    {quoted.content ? ` · ${quoted.content.slice(0, 120)}` : ""}
                    {!quoted.content && quoted.audioUrl ? " · [voice]" : ""}
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setQuoted(null)}
                className="soft-control inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/35 text-foreground/70 backdrop-blur-xl hover:bg-white/55 active:scale-[0.98]"
                aria-label={messages.chat.cancelQuote}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={messages.chat.messagePlaceholder}
              className="min-h-[44px] flex-1"
              disabled={sendMessage.isPending || isUploadingVoice}
            />

            <Button
              variant="outline"
              size="icon"
              className={`h-11 w-11 ${isRecording ? "border-primary/40 bg-primary/10" : ""}`}
              onClick={() => (isRecording ? stopRecordingAndSend() : startRecording())}
              disabled={sendMessage.isPending || isUploadingVoice}
              aria-label={isRecording ? messages.chat.stop : messages.chat.record}
            >
              <Mic className="h-5 w-5" />
            </Button>

            <Button
              size="icon"
              className="h-11 w-11"
              onClick={() =>
                sendMessage.mutate({
                  nextContent: content.trim(),
                  replyToId: quoted?.id ?? undefined,
                })
              }
              disabled={sendMessage.isPending || isUploadingVoice || !content.trim()}
              aria-label={messages.chat.send}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>

          {isUploadingVoice ? (
            <div className="mt-2 text-xs text-muted-foreground">{messages.chat.uploadingVoice}</div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/35 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-xl">
              <SmilePlus className="h-4 w-4 text-primary/80" />
              <span>Emoji</span>
            </div>
            {quickEmojis.map((emoji) => (
              <button
                key={`compose-${emoji}`}
                type="button"
                className="soft-control inline-flex h-10 items-center justify-center rounded-full border border-white/70 bg-white/35 px-4 text-sm text-foreground/80 backdrop-blur-xl hover:bg-white/55 active:scale-[0.98]"
                onClick={() => setContent((v) => `${v}${emoji}`)}
                disabled={sendMessage.isPending || isUploadingVoice}
                aria-label={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
