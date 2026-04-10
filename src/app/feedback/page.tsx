"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { useSession } from "next-auth/react";

import { useI18n } from "@/app/providers";
import { apiFetch } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function FeedbackPage() {
  const { data: session } = useSession();
  const { messages } = useI18n();
  const [content, setContent] = React.useState("");

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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-7 sm:py-9 lg:py-12">
      <div className="space-y-2">
        <div className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{messages.feedback.title}</div>
        <div className="max-w-2xl text-sm leading-6 text-muted-foreground">{messages.feedback.description}</div>
      </div>

      <Card className="glass-panel overflow-hidden rounded-[32px] p-0">
        <div className="border-b border-border/50 bg-background/30 px-4 py-3 text-sm font-semibold text-foreground/85 sm:px-6">
          {session?.user?.name ? `${session.user.name}` : "OurPets"}
        </div>
        <div className="space-y-3 px-4 py-4 sm:px-6">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={messages.feedback.placeholder}
            className="min-h-[140px]"
            disabled={submit.isPending}
          />
          <div className="flex justify-end">
            <Button
              className="h-11 gap-2 rounded-full px-5"
              onClick={() =>
                submit.mutate({
                  nextContent: content.trim(),
                  pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
                })
              }
              disabled={submit.isPending || !canSubmit}
            >
              <Send className="h-4 w-4" />
              {messages.feedback.submit}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

