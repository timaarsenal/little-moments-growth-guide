import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { AppShell } from "@/components/balapan/AppShell";
import { Chick } from "@/components/illustrations";
import { HelpDialog } from "@/components/balapan/HelpDialog";
import { Button } from "@/components/ui/button";
import { threadTitle } from "@/lib/chat-title";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { localTodayISO } from "@/lib/age";
import { chatQuery, threadQuery, type ChatMessage, type ChatStreamEvent } from "@/lib/chat";
import { logsQuery } from "@/lib/logs";
import { profileQuery } from "@/lib/profile";
import { localize } from "@/lib/types";
import { useTodayPlan } from "@/lib/use-today-plan";

export const Route = createFileRoute("/_authenticated/assistant/$threadId")({
  head: () => ({
    meta: [
      { title: "Переписка — Balapan" },
      { name: "description", content: "Чат с ИИ-помощником Balapan о малыше и занятиях." },
      { property: "og:title", content: "Переписка — Balapan" },
      { property: "og:description", content: "Чат с ИИ-помощником Balapan о малыше и занятиях." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context, params }) => Promise.all([
    context.queryClient.ensureQueryData(threadQuery(context.user.id, params.threadId)),
    context.queryClient.ensureQueryData(chatQuery(context.user.id, params.threadId)),
    context.queryClient.ensureQueryData(profileQuery),
  ]),
  component: ThreadPage,
});

type Status = "ready" | "submitted" | "streaming" | "error";

function ThreadPage() {
  const { threadId } = Route.useParams();
  return <Chat key={threadId} threadId={threadId} />;
}

function Chat({ threadId }: { threadId: string }) {
  const { t, lang } = useI18n();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const today = localTodayISO();
  const { data: thread } = useSuspenseQuery(threadQuery(user.id, threadId));
  const chatKey = chatQuery(user.id, threadId);
  const { data: messages } = useSuspenseQuery(chatKey);
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: logs = [] } = useSuspenseQuery(logsQuery(user.id, today));
  const plan = useTodayPlan(user.id, today, profile, logs.filter((l) => l.plan_date < today));
  const [status, setStatus] = useState<Status>("ready");
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [useActivity, setUseActivity] = useState(true);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const activity = useMemo(() => {
    const item = thread?.activity_key ? plan.data?.items.find((i) => i.key === thread.activity_key) : undefined;
    return item ? localize(item, lang) : null;
  }, [thread, plan.data, lang]);

  useEffect(() => { if (status === "ready") taRef.current?.focus(); }, [status]);

  if (!thread) {
    return (
      <AppShell>
        <p className="mt-10 text-center font-semibold text-muted-foreground">{t("assistant.unavailable")}</p>
        <Button asChild variant="soft" className="mx-auto mt-4"><Link to="/assistant">{t("assistant.back")}</Link></Button>
      </AppShell>
    );
  }

  const busy = status === "submitted" || status === "streaming";

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    setDraft("");
    setStatus("submitted");
    const optimistic: ChatMessage = { id: `pending-${Date.now()}`, role: "user", content: text, activity_title: useActivity && activity ? activity.title : null, show_help: false, created_at: new Date().toISOString() };
    queryClient.setQueryData(chatKey.queryKey, (old: ChatMessage[] | undefined) => [...(old ?? []), optimistic]);
    let finished = false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({
          threadId, text, lang, today,
          activity: useActivity && activity ? { key: activity.key, title: activity.title, category: activity.category, duration_min: activity.duration_min, why: activity.why, steps: activity.steps.slice(0, 10), materials: activity.materials.slice(0, 10) } : null,
        }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ChatStreamEvent;
          if (event.type === "user") {
            queryClient.setQueryData(chatKey.queryKey, (old: ChatMessage[] | undefined) => (old ?? []).map((m) => (m.id === optimistic.id ? event.message : m)));
          } else if (event.type === "text") {
            setStatus("streaming");
            setPendingText(event.text);
          } else if (event.type === "done") {
            finished = true;
            queryClient.setQueryData(chatKey.queryKey, (old: ChatMessage[] | undefined) => [...(old ?? []), event.message]);
          } else {
            throw new Error(t("assistant.fallback"));
          }
        }
      }
      if (!finished) throw new Error(t("assistant.fallback"));
      setStatus("ready");
    } catch (err) {
      setDraft(text);
      setStatus("error");
      toast.error(t("assistant.error", { message: err instanceof Error ? err.message : String(err) }));
      void queryClient.invalidateQueries({ queryKey: chatKey.queryKey });
      setTimeout(() => setStatus("ready"), 1500);
    } finally {
      setPendingText(null);
    }
  }

  const suggestions = activity && useActivity
    ? [t("assistant.qSimpler"), t("assistant.qMaterials"), t("assistant.qDisliked")]
    : [t("assistant.suggest1"), t("assistant.suggest2"), t("assistant.suggest3")];

  return (
    <AppShell fill>
      <div className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost"><Link to="/assistant" aria-label={t("assistant.back")}><ArrowLeft aria-hidden /></Link></Button>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{activity ? activity.title : threadTitle(thread.title, t)}</h1>
      </div>

      <Conversation className="min-h-0">
        <ConversationContent className="gap-4 px-0 pb-6">
          {messages.length === 0 && !busy && (
            <div className="mt-4 rounded-3xl bg-card p-5 text-center shadow-soft">
              <Chick className="mx-auto size-16" />
              <p className="mt-2 font-bold">{t("assistant.emptyTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("assistant.emptyText")}</p>
              <div className="mt-4 flex flex-col gap-2">
                {suggestions.map((s) => (
                  <Button key={s} variant="soft" className="h-auto whitespace-normal py-2" onClick={() => void send(s)}>{s}</Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              {m.role === "user" && m.activity_title && (
                <p className="ml-auto text-xs text-muted-foreground">{t("assistant.about", { title: m.activity_title })}</p>
              )}
              <div className="flex items-end gap-2 group-[.is-user]:contents">
              {m.role === "assistant" && <Chick className="size-8 shrink-0" />}
              <MessageContent className="text-base group-[.is-user]:rounded-3xl group-[.is-user]:rounded-br-md group-[.is-user]:bg-chat-user group-[.is-user]:text-chat-user-foreground">
                {m.role === "user" ? <p className="whitespace-pre-wrap">{m.content}</p> : <MessageResponse>{m.content}</MessageResponse>}
              </MessageContent>
              </div>
              {m.role === "assistant" && m.show_help && <HelpDialog />}
            </Message>
          ))}
          {busy && (
            <Message from="assistant">
              <div className="flex items-end gap-2">
              <Chick className="size-8 shrink-0" />
              <MessageContent className="text-base">
                {pendingText ? <MessageResponse>{pendingText}</MessageResponse> : <Shimmer>{t("assistant.typing")}</Shimmer>}
              </MessageContent>
              </div>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {activity && useActivity && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl bg-primary-soft px-3 py-2 text-sm font-semibold">
          <span className="min-w-0 truncate">{t("assistant.discussing", { title: activity.title })}</span>
          <button type="button" className="shrink-0 text-xs underline" onClick={() => setUseActivity(false)}>{t("assistant.clearContext")}</button>
        </div>
      )}
      <PromptInput onSubmit={(msg) => void send(msg.text)} className="rounded-3xl bg-card">
        <PromptInputTextarea ref={taRef} value={draft} onChange={(e) => setDraft(e.currentTarget.value)} placeholder={t("assistant.placeholder")} maxLength={2000} className="text-base" />
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit status={status} disabled={!draft.trim() || busy} aria-label={t("assistant.send")} />
        </PromptInputFooter>
      </PromptInput>
      <p className="mt-1 text-center text-xs text-muted-foreground">{t("assistant.disclaimer")}</p>
    </AppShell>
  );
}
