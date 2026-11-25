import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Loader2, Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/balapan/AppShell";
import { Button } from "@/components/ui/button";
import { Chick } from "@/components/illustrations";
import { formatShortDate, useI18n } from "@/i18n";
import { threadTitle } from "@/lib/chat-title";
import { localTodayISO } from "@/lib/age";
import { createChatThread, threadsQuery } from "@/lib/chat";
import { logsQuery } from "@/lib/logs";
import { profileQuery } from "@/lib/profile";
import { useTodayPlan } from "@/lib/use-today-plan";

export const Route = createFileRoute("/_authenticated/assistant/")({
  validateSearch: (search: Record<string, unknown>): { activity?: string } =>
    typeof search["activity"] === "string" ? { activity: search["activity"] } : {},
  head: () => ({
    meta: [
      { title: "Помощник — Balapan" },
      { name: "description", content: "Переписки с ИИ-помощником Balapan: поддержка родителей и обсуждение занятий." },
      { property: "og:title", content: "Помощник — Balapan" },
      { property: "og:description", content: "Поддержка родителей и обсуждение занятий малыша в Balapan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(threadsQuery(context.user.id)),
    context.queryClient.ensureQueryData(profileQuery),
  ]),
  component: Threads,
});

function Threads() {
  const { t, lang } = useI18n();
  const { user } = Route.useRouteContext();
  const { activity } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = localTodayISO();
  const { data: threads } = useSuspenseQuery(threadsQuery(user.id));
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: logs = [] } = useSuspenseQuery(logsQuery(user.id, today));
  const plan = useTodayPlan(user.id, today, profile, logs.filter((l) => l.plan_date < today));

  const create = useMutation({
    mutationFn: ({ title, key }: { title: string; key: string | null }) => createChatThread(user.id, title, key),
    onSuccess: async (thread) => {
      await queryClient.invalidateQueries({ queryKey: threadsQuery(user.id).queryKey });
      void navigate({ to: "/assistant/$threadId", params: { threadId: thread.id }, replace: Boolean(activity) });
    },
    onError: (err) => toast.error(t("common.error", { message: err instanceof Error ? err.message : String(err) })),
  });

  // "Discuss" on an activity card: reuse today's thread for that activity, or open a new one.
  const started = useRef(false);
  useEffect(() => {
    if (!activity || started.current || !plan.data) return;
    started.current = true;
    const item = plan.data.items.find((i) => i.key === activity);
    const title = item ? item[lang].title : t("assistant.untitled");
    const existing = threads.find((th) => th.activity_key === activity && th.created_at.slice(0, 10) >= today);
    if (existing) void navigate({ to: "/assistant/$threadId", params: { threadId: existing.id }, replace: true });
    else create.mutate({ title, key: activity });
  }, [activity, plan.data, threads, lang, t, today, navigate, create]);

  if (activity) {
    return (
      <AppShell>
        <div className="mt-16 flex justify-center" role="status"><Loader2 className="size-8 animate-spin text-primary" aria-label={t("assistant.thinking")} /></div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mt-2 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t("assistant.title")}</h1>
        <Button onClick={() => create.mutate({ title: t("assistant.untitled"), key: null })} disabled={create.isPending}>
          {create.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
          {t("assistant.newChat")}
        </Button>
      </div>
      <p className="mt-6 font-bold">{t("assistant.chats")}</p>
      {threads.length === 0 ? (
        <div className="mt-3 rounded-3xl border-2 border-dashed border-border p-6 text-center">
          <Chick className="mx-auto size-16" />
          <p className="mt-2 font-semibold text-muted-foreground">{t("assistant.noChats")}</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {threads.map((th) => (
            <li key={th.id}>
              <Link to="/assistant/$threadId" params={{ threadId: th.id }} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
                <Chick className="size-9 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{threadTitle(th.title, t)}</p>
                  <p className="text-xs text-muted-foreground">{formatShortDate(new Date(th.created_at))}</p>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-muted-foreground">{t("assistant.disclaimer")}</p>
    </AppShell>
  );
}
