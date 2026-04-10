"use client";

import * as React from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCheck, LoaderCircle, Mic, Quote, Send, SmilePlus, Trash2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

import { useI18n } from "@/app/providers";
import { apiFetch } from "@/lib/fetcher";
import { formatDateTime } from "@/lib/i18n";
import { cn } from "@/lib/utils";
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

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
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
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const scrollViewportRef = React.useRef<HTMLDivElement | null>(null);
  const didInitialScrollRef = React.useRef(false);
  const shouldStickToBottomRef = React.useRef(true);
  const recordingStartedAtRef = React.useRef<number | null>(null);

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
      shouldStickToBottomRef.current = true;
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

  const recallMessage = useMutation({
    mutationFn: (id: string) => apiFetch<{ ok: true }>(`/api/chat/${id}`, { method: "PATCH" }),
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

  const chatShellCopy = React.useMemo(() => {
    if (locale === "zh") {
      return {
        roomStatus: "共享群聊 · 在线同步",
        roomHint: "支持文字、引用、表情与语音，像 WhatsApp 一样自然。",
        recording: "正在录音",
        cancelRecording: "取消录音",
        sendVoice: "发送语音",
        voiceReady: "松开前可继续录音，发送后会自动上传。",
        keyboardHint: "Enter 发送 · Shift + Enter 换行",
        voiceLabel: "语音消息",
      };
    }
    if (locale === "it") {
      return {
        roomStatus: "Chat condivisa · sincronia live",
        roomHint: "Testo, citazioni, reazioni e voce in un flusso naturale.",
        recording: "Registrazione in corso",
        cancelRecording: "Annulla registrazione",
        sendVoice: "Invia voce",
        voiceReady: "Puoi continuare a registrare finché non invii.",
        keyboardHint: "Invio per mandare · Shift + Invio per andare a capo",
        voiceLabel: "Messaggio vocale",
      };
    }
    if (locale === "es") {
      return {
        roomStatus: "Chat compartido · sincronización en vivo",
        roomHint: "Texto, citas, reacciones y voz en un flujo tipo WhatsApp.",
        recording: "Grabando",
        cancelRecording: "Cancelar grabación",
        sendVoice: "Enviar voz",
        voiceReady: "Puedes seguir grabando hasta enviarlo.",
        keyboardHint: "Enter para enviar · Shift + Enter para nueva línea",
        voiceLabel: "Mensaje de voz",
      };
    }
    return {
      roomStatus: "Shared room · live sync",
      roomHint: "Text, quote, react, and voice with a WhatsApp-like flow.",
      recording: "Recording",
      cancelRecording: "Cancel recording",
      sendVoice: "Send voice",
      voiceReady: "Keep recording until you send it.",
      keyboardHint: "Enter to send · Shift + Enter for a new line",
      voiceLabel: "Voice message",
    };
  }, [locale]);

  const handleViewportScroll = React.useCallback(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 96;
  }, []);

  React.useEffect(() => {
    if (!query.data) return;
    if (didInitialScrollRef.current) return;
    didInitialScrollRef.current = true;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [query.data]);

  React.useEffect(() => {
    if (!didInitialScrollRef.current) return;
    if (!shouldStickToBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [items.length]);

  React.useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      recordingStartedAtRef.current = null;
      return;
    }
    const startedAt = Date.now();
    recordingStartedAtRef.current = startedAt;
    setRecordingSeconds(0);
    const timer = window.setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  React.useEffect(() => {
    return () => {
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleSendText = React.useCallback(() => {
    const nextContent = content.trim();
    if (!nextContent || sendMessage.isPending || isUploadingVoice) return;
    sendMessage.mutate({
      nextContent,
      replyToId: quoted?.id ?? undefined,
    });
  }, [content, isUploadingVoice, quoted?.id, sendMessage]);

  async function startRecording() {
    if (isRecording || isUploadingVoice) return;
    if (!viewerId) {
      toast.error(messages.chat.signInToSend);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.addEventListener("dataavailable", (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      });
      recorder.addEventListener("stop", () => {
        stream.getTracks().forEach((t) => t.stop());
      });
      recorder.start(250);
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      toast.error(errorMessage(err, messages.chat.failedToUploadVoice));
    }
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
      if (blob.size === 0) {
        throw new Error(messages.chat.failedToUploadVoice);
      }
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

  function cancelRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
  }

  const quickEmojis = ["❤️", "😂", "👍", "🐾", "🥹", "🔥"];
  const composerBusy = sendMessage.isPending || isUploadingVoice;
  const canSendText = Boolean(content.trim()) && !composerBusy;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-7 sm:py-9 lg:py-12">
      <div className="space-y-3">
        <div className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">OurPets</div>
        <div className="space-y-2">
          <div className="gradient-text text-2xl font-semibold tracking-tight sm:text-3xl">{messages.chat.title}</div>
          <div className="max-w-3xl text-sm leading-7 text-muted-foreground">{chatShellCopy.roomHint}</div>
        </div>
      </div>

      <Card className="glass-panel overflow-hidden rounded-[34px] p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-background/30 px-4 py-4 backdrop-blur-xl sm:px-5">
          <div className="space-y-1">
            <div className="text-sm font-semibold tracking-[-0.01em] text-foreground/88">OurPets</div>
            <div className="inline-flex rounded-full border border-border/60 bg-background/55 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase backdrop-blur-xl">
              {chatShellCopy.roomStatus}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
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

        <div
          ref={scrollViewportRef}
          onScroll={handleViewportScroll}
          className="relative max-h-[62vh] overflow-y-auto px-3 py-4 sm:px-5"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.08),transparent_38%),linear-gradient(180deg,hsl(var(--background)/0.14),transparent_22%,transparent_78%,hsl(var(--background)/0.16))]" />
          {query.isLoading ? (
            <div className="relative z-10 text-sm text-muted-foreground">{messages.common.loading}</div>
          ) : items.length === 0 ? (
            <div className="relative z-10 rounded-[24px] border border-border/60 bg-background/45 px-4 py-8 text-center text-sm text-muted-foreground backdrop-blur-xl">
              {messages.feed.empty}
            </div>
          ) : (
            <div className="relative z-10 space-y-4">
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
                    transition={{ type: "spring", mass: 0.7, damping: 22, stiffness: 260 }}
                    className={cn("group/message flex gap-3", mine ? "justify-end" : "justify-start")}
                  >
                    {!mine ? (
                      <Avatar className="mt-1 h-9 w-9 shadow-[0_12px_30px_hsl(var(--foreground)/0.08)]">
                        <AvatarImage src={m.user.image ?? undefined} />
                        <AvatarFallback>{getInitials(displayName(m.user, messages.common.user))}</AvatarFallback>
                      </Avatar>
                    ) : null}

                    <div
                      className={cn("flex max-w-[90%] flex-col gap-2 sm:max-w-[76%]", mine ? "items-end text-right" : "")}
                    >
                      <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 px-1", mine ? "justify-end" : "")}>
                        <span className="text-sm font-semibold text-foreground/85">
                          {displayName(m.user, messages.common.user)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(locale, m.createdAt)}
                        </span>
                      </div>

                      <div
                        className={cn(
                          "overflow-hidden rounded-[26px] border px-4 py-3 backdrop-blur-xl",
                          mine
                            ? "ml-auto border-primary/24 bg-primary/[0.12] text-foreground shadow-[0_20px_40px_hsl(var(--primary)/0.12)]"
                            : "border-border/60 bg-background/55 text-foreground shadow-[0_18px_38px_hsl(var(--foreground)/0.08)]"
                        )}
                      >
                        {m.replyTo ? (
                          <button
                            type="button"
                            className={cn(
                              "mb-3 w-full rounded-[18px] border px-3 py-2 text-left text-xs leading-5 backdrop-blur-xl transition-[background-color,border-color] duration-300 hover:bg-background/78",
                              mine ? "border-primary/18 bg-background/58 text-muted-foreground" : "border-border/60 bg-background/62 text-muted-foreground"
                            )}
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
                                {!m.replyTo.content && m.replyTo.audioUrl ? ` · ${chatShellCopy.voiceLabel}` : ""}
                              </>
                            )}
                          </button>
                        ) : null}

                        {isDeleted ? (
                          <div className="text-sm italic text-muted-foreground">{messages.chat.deletedPlaceholder}</div>
                        ) : (
                          <>
                            {m.content ? (
                              <div className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground/92">{m.content}</div>
                            ) : null}
                            {m.audioUrl ? (
                              <div className={cn("mt-2 rounded-[20px] border px-3 py-3", mine ? "border-primary/18 bg-background/55" : "border-border/60 bg-background/60")}>
                                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                  <span className="inline-flex items-center gap-2">
                                    <Mic className="h-3.5 w-3.5 text-primary/80" />
                                    {chatShellCopy.voiceLabel}
                                  </span>
                                  <span>{m.audioDuration ? formatSeconds(m.audioDuration) : "00:00"}</span>
                                </div>
                                <audio controls preload="none" src={m.audioUrl} className="w-full" />
                              </div>
                            ) : null}
                          </>
                        )}
                        {mine ? (
                          <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                            <CheckCheck className="h-3.5 w-3.5 text-primary/85" />
                          </div>
                        ) : null}
                      </div>

                      <div
                        className={cn(
                          "flex flex-wrap items-center gap-1.5 px-1 transition-opacity duration-300 sm:opacity-0 sm:group-hover/message:opacity-100 sm:group-focus-within/message:opacity-100",
                          mine ? "justify-end" : ""
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-1">
                          {!isDeleted &&
                            m.reactions.slice(0, 5).map((r) => (
                              <button
                                key={`${m.id}-${r.emoji}`}
                                type="button"
                                className={`soft-control inline-flex h-9 items-center gap-1 rounded-full border border-border/60 bg-background/55 px-3 text-xs font-medium text-foreground/80 backdrop-blur-xl hover:bg-background/72 active:scale-[0.98] ${
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
                                className="soft-control inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/55 text-sm text-foreground/80 backdrop-blur-xl hover:bg-background/72 active:scale-[0.98]"
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
                            className="soft-control inline-flex h-9 items-center gap-1 rounded-full border border-border/60 bg-background/55 px-3 text-xs font-medium text-foreground/80 backdrop-blur-xl hover:bg-background/72 active:scale-[0.98]"
                            onClick={() => setQuoted(m)}
                          >
                            <Quote className="h-3.5 w-3.5" />
                            {messages.chat.quote}
                          </button>
                        )}

                        {canRecall ? (
                          <button
                            type="button"
                            className="soft-control inline-flex h-9 items-center rounded-full border border-border/60 bg-background/55 px-3 text-xs font-medium text-foreground/80 backdrop-blur-xl hover:bg-background/72 active:scale-[0.98]"
                            onClick={() => recallMessage.mutate(m.id)}
                          >
                            {messages.chat.recall}
                          </button>
                        ) : null}

                        {session?.user?.isAdmin ? (
                          <button
                            type="button"
                            className="soft-control inline-flex h-9 items-center gap-1 rounded-full border border-border/60 bg-background/55 px-3 text-xs font-medium text-foreground/80 backdrop-blur-xl hover:bg-background/72 active:scale-[0.98]"
                            onClick={() => deleteMessage.mutate(m.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {messages.chat.delete}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {mine ? (
                      <Avatar className="mt-1 h-9 w-9 shadow-[0_12px_30px_hsl(var(--foreground)/0.08)]">
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

        <div className="border-t border-border/50 bg-background/30 px-3 py-3 backdrop-blur-xl sm:px-5">
          {quoted ? (
            <div className="mb-3 flex items-center justify-between gap-2 rounded-[20px] border border-border/60 bg-background/55 px-3 py-2 text-xs text-muted-foreground backdrop-blur-xl">
              <div className="min-w-0 truncate">
                {quoted.deletedAt ? (
                  <span className="italic">{messages.chat.deletedPlaceholder}</span>
                ) : (
                  <>
                    <span className="font-semibold text-foreground/75">
                      {displayName(quoted.user, messages.common.user)}
                    </span>
                    {quoted.content ? ` · ${quoted.content.slice(0, 120)}` : ""}
                    {!quoted.content && quoted.audioUrl ? ` · ${chatShellCopy.voiceLabel}` : ""}
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setQuoted(null)}
                className="soft-control inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/50 text-foreground/70 backdrop-blur-xl hover:bg-background/72 active:scale-[0.98]"
                aria-label={messages.chat.cancelQuote}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="glass-panel rounded-[28px] p-2.5 sm:p-3">
            {isRecording ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[22px] border border-primary/24 bg-primary/[0.08] px-4 py-3 backdrop-blur-xl">
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{chatShellCopy.recording}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatSeconds(recordingSeconds)} · {chatShellCopy.voiceReady}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelRecording}
                    className="h-11 rounded-full px-4"
                    aria-label={chatShellCopy.cancelRecording}
                  >
                    <X className="h-4 w-4" />
                    {messages.chat.cancelQuote}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void stopRecordingAndSend()}
                    className="h-11 rounded-full px-4"
                    disabled={composerBusy}
                    aria-label={chatShellCopy.sendVoice}
                  >
                    {isUploadingVoice ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {chatShellCopy.sendVoice}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || e.shiftKey) return;
                    e.preventDefault();
                    handleSendText();
                  }}
                  placeholder={messages.chat.messagePlaceholder}
                  className="min-h-[52px] flex-1 border-none bg-transparent shadow-none focus-visible:ring-0"
                  disabled={composerBusy}
                />

                {canSendText ? (
                  <Button
                    type="button"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={handleSendText}
                    aria-label={messages.chat.send}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={() => void startRecording()}
                    disabled={composerBusy}
                    aria-label={messages.chat.record}
                  >
                    {isUploadingVoice ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
                  </Button>
                )}
              </div>
            )}
          </div>

          {isUploadingVoice ? (
            <div className="mt-2 text-xs text-muted-foreground">{messages.chat.uploadingVoice}</div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/45 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-xl">
              <SmilePlus className="h-4 w-4 text-primary/80" />
              <span>{chatShellCopy.keyboardHint}</span>
            </div>
            {quickEmojis.map((emoji) => (
              <button
                key={`compose-${emoji}`}
                type="button"
                className="soft-control inline-flex h-10 items-center justify-center rounded-full border border-border/60 bg-background/45 px-4 text-sm text-foreground/80 backdrop-blur-xl hover:bg-background/72 active:scale-[0.98]"
                onClick={() => setContent((v) => `${v}${emoji}`)}
                disabled={composerBusy || isRecording}
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
