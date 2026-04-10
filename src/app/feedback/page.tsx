"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { LifeBuoy, Link2, MessageSquareMore, Send, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

import { useI18n } from "@/app/providers";
import { apiFetch } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function FeedbackPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { locale, messages } = useI18n();
  const [content, setContent] = React.useState("");
  const [items, setItems] = React.useState<
    { id: string; content: string; pageUrl?: string | null; createdAt: string; user?: { id: string; name?: string | null; email?: string | null } | null }[]
  >([]);
  const [loadingList, setLoadingList] = React.useState(false);

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const isPetReport = searchParams.get("report") === "pet";
  const quickTags = React.useMemo(() => {
    if (locale === "zh") return ["Bug 反馈", "体验建议", "功能想法", "内容举报"];
    if (locale === "it") return ["Bug", "Esperienza", "Idea", "Segnalazione"];
    if (locale === "es") return ["Bug", "Experiencia", "Idea", "Reporte"];
    return ["Bug", "UX", "Idea", "Report"];
  }, [locale]);
  const feedbackCopy = React.useMemo(() => {
    if (locale === "zh") {
      return {
        helper: "把问题、建议或想法告诉我们。我们会保留当前页面来源，方便快速定位。",
        pageSource: "当前页面来源",
        quickStart: "快速开始",
        quickNote: "点一下标签可快速补全开头，再继续详细描述。",
        remaining: "还可输入",
        chars: "字",
        adminTitle: "全部反馈",
        loading: "加载中…",
        empty: "暂无反馈",
      };
    }
    if (locale === "it") {
      return {
        helper: "Raccontaci bug, idee o problemi. Salviamo anche la pagina corrente per contestualizzare.",
        pageSource: "Pagina corrente",
        quickStart: "Avvio rapido",
        quickNote: "Tocca un tag per iniziare più velocemente.",
        remaining: "Caratteri rimasti",
        chars: "",
        adminTitle: "Tutti i feedback",
        loading: "Caricamento…",
        empty: "Nessun feedback",
      };
    }
    if (locale === "es") {
      return {
        helper: "Cuéntanos errores, ideas o problemas. También guardamos la página actual para dar contexto.",
        pageSource: "Página actual",
        quickStart: "Inicio rápido",
        quickNote: "Pulsa una etiqueta para empezar más rápido.",
        remaining: "Caracteres restantes",
        chars: "",
        adminTitle: "Todos los comentarios",
        loading: "Cargando…",
        empty: "Sin comentarios",
      };
    }
    return {
      helper: "Share bugs, ideas, or reports. We also keep the current page URL for faster triage.",
      pageSource: "Current page",
      quickStart: "Quick start",
      quickNote: "Tap a tag to begin with a structured prompt.",
      remaining: "Characters left",
      chars: "",
      adminTitle: "All feedback",
      loading: "Loading…",
      empty: "No feedback yet",
    };
  }, [locale]);

  const submit = useMutation({
    mutationFn: (payload: { nextContent: string; pageUrl?: string }) =>
      apiFetch<{ id: string }>("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ content: payload.nextContent, pageUrl: payload.pageUrl }),
      }),
    onSuccess: () => {
      setContent("");
      toast.success(messages.feedback.sent);
    },
    onError: () => toast.error(messages.feedback.failedToSend),
  });

  const canSubmit = Boolean(content.trim());
  const remainingCount = Math.max(0, 1200 - content.length);

  React.useEffect(() => {
    if (content.trim()) return;
    const report = searchParams.get("report");
    if (!report) return;
    if (report === "pet") {
      const id = searchParams.get("id") ?? "";
      const name = searchParams.get("name") ?? "";
      const lines = [
        "【举报】",
        name || id ? `对象：宠物 ${name}${name && id ? " " : ""}${id ? `(${id})` : ""}` : "对象：宠物",
        "原因：",
        "",
        "补充说明：",
      ];
      setContent(lines.join("\n"));
    }
  }, [content, searchParams]);

  React.useEffect(() => {
    let active = true;
    async function load() {
      if (!session?.user?.isAdmin) return;
      setLoadingList(true);
      try {
        const res = await apiFetch<{ items: typeof items }>("/api/feedback");
        if (active) setItems(res.items);
      } finally {
        setLoadingList(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [session?.user?.isAdmin]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-7 sm:py-9 lg:py-12">
      <div className="space-y-3">
        <div className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">OurPets</div>
        <div className="space-y-2">
          <div className="gradient-text text-2xl font-semibold tracking-tight sm:text-3xl">{messages.feedback.title}</div>
          <div className="max-w-3xl text-sm leading-7 text-muted-foreground">{feedbackCopy.helper}</div>
        </div>
      </div>

      <Card className="glass-panel overflow-hidden rounded-[34px] p-0">
        <div className="border-b border-border/50 bg-background/30 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-foreground/88">
                {session?.user?.name ? `${session.user.name}` : "OurPets"}
              </div>
              <div className="inline-flex rounded-full border border-border/60 bg-background/55 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase backdrop-blur-xl">
                <LifeBuoy className="mr-1.5 h-3.5 w-3.5" />
                {messages.feedback.description}
              </div>
            </div>
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-2 text-xs text-muted-foreground backdrop-blur-xl">
              <Link2 className="h-3.5 w-3.5 shrink-0" />
              <span className="shrink-0">{feedbackCopy.pageSource}</span>
              <span className="truncate">{pageUrl || "/"}</span>
            </div>
          </div>
        </div>
        <div className="space-y-4 px-4 py-4 sm:px-6">
          <div className="glass-panel rounded-[26px] p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                {feedbackCopy.quickStart}
              </div>
              <div className="text-xs text-muted-foreground">{feedbackCopy.quickNote}</div>
              <div className="flex flex-wrap gap-2">
                {quickTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={cn(
                      "soft-control inline-flex h-10 items-center justify-center rounded-full border border-border/60 bg-background/55 px-4 text-sm text-foreground/82 backdrop-blur-xl hover:bg-background/72",
                      content.startsWith(`[${tag}]`) ? "border-primary/30 bg-primary/10 text-foreground" : ""
                    )}
                    onClick={() => setContent((current) => (current.startsWith(`[${tag}]`) ? current : `[${tag}]\n${current}`))}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[28px] p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <MessageSquareMore className="h-4 w-4 text-primary" />
                {isPetReport ? "举报反馈" : messages.feedback.title}
              </div>
              <div className="text-xs text-muted-foreground">
                {feedbackCopy.remaining} {remainingCount}
                {feedbackCopy.chars}
              </div>
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 1200))}
              placeholder={messages.feedback.placeholder}
              className="min-h-[180px] border-none bg-transparent shadow-none focus-visible:ring-0"
              disabled={submit.isPending}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">{feedbackCopy.helper}</div>
            <div className="flex justify-end">
              <Button
                className="h-11 gap-2 rounded-full px-5"
                onClick={() =>
                  submit.mutate({
                    nextContent: content.trim(),
                    pageUrl: pageUrl || undefined,
                  })
                }
                disabled={submit.isPending || !canSubmit}
              >
                <Send className="h-4 w-4" />
                {messages.feedback.submit}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {session?.user?.isAdmin ? (
        <Card className="glass-panel overflow-hidden rounded-[34px] p-0">
          <div className="border-b border-border/50 bg-background/30 px-4 py-4 text-sm font-semibold text-foreground/85 backdrop-blur-xl sm:px-6">
            {feedbackCopy.adminTitle}
          </div>
          <div className="space-y-3 px-4 py-4 sm:px-6">
            {loadingList ? (
              <div className="text-sm text-muted-foreground">{feedbackCopy.loading}</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">{feedbackCopy.empty}</div>
            ) : (
              items.map((f) => (
                <div key={f.id} className="glass-panel rounded-[26px] p-4">
                  <div className="text-sm leading-6 text-foreground/92">{f.content}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border/60 bg-background/55 px-3 py-1 backdrop-blur-xl">
                      {new Date(f.createdAt).toLocaleString()}
                    </span>
                    <span className="rounded-full border border-border/60 bg-background/55 px-3 py-1 backdrop-blur-xl">
                      {f.user?.name || f.user?.email || "匿名"}
                    </span>
                    {f.pageUrl ? (
                      <span className="rounded-full border border-border/60 bg-background/55 px-3 py-1 backdrop-blur-xl">
                        {f.pageUrl}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
