import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Check, CloudSun, Loader2, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { ActivityCard } from "@/components/balapan/ActivityCard";
import { AppShell } from "@/components/balapan/AppShell";
import { MomentButton } from "@/components/balapan/MomentButton";
import { WeeklySummary } from "@/components/balapan/WeeklySummary";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { ageInMonths, localTodayISO } from "@/lib/age";
import { pickFromLibrary } from "@/lib/library";
import { logsQuery } from "@/lib/logs";
import { getTodayPlan } from "@/lib/plan.functions";
import { profileQuery } from "@/lib/profile";
import { lightenPlan } from "@/lib/light-plan";
import { weekTotals } from "@/lib/minutes";
import { isAnchor, ritualChecksQuery, ritualTitle, ritualsQuery, type Ritual } from "@/lib/rituals";
import { statsQuery } from "@/lib/stats";
import { DEFAULT_CITY, applyWeather, fetchWeather, formatTemp, isCity, weatherReason } from "@/lib/weather";
import { MOODS, moodQuery, type Mood } from "@/lib/mood";
import { isWeekendDate, planSlots } from "@/lib/schedule";
import { localize, type DayPlan, type LogLite, type PlannedActivity, type Reaction } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({
    meta: [
      { title: "Сегодня — Balapan" },
      { name: "description", content: "Занятия на сегодня под возраст малыша и ваше свободное время." },
      { property: "og:title", content: "Сегодня — Balapan" },
      { property: "og:description", content: "Занятия на сегодня под возраст малыша." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    const profile = await context.queryClient.ensureQueryData(profileQuery);
    if (!profile) throw redirect({ to: "/onboarding" });
    await context.queryClient.ensureQueryData(logsQuery(context.user.id, localTodayISO()));
  },
  component: Today,
});

const MOOD_EMOJI: Record<Mood, string> = { good: "😊", ok: "😐", tired: "😩" };

type MarkInput =
  | { activity: PlannedActivity; status: "done" | "skipped"; reaction: Reaction | null }
  | { activity: PlannedActivity; status: null; reaction: null };

function Today() {
  const navigate = useNavigate();
  const { t, age, lang } = useI18n();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const today = localTodayISO();
  const logsKey = logsQuery(user.id, today);
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: logs } = useSuspenseQuery(logsKey);

  const history = useMemo(() => logs.filter((l) => l.plan_date < today), [logs, today]);
  const todayLogs = useMemo(
    () => new Map(logs.filter((l) => l.plan_date === today).map((l) => [l.activity_key, l])),
    [logs, today],
  );

  const fetchPlan = useServerFn(getTodayPlan);
  const planQuery = useQuery({
    queryKey: ["plan", user.id, today],
    queryFn: async (): Promise<DayPlan> => {
      try {
        return await fetchPlan({ data: { today } });
      } catch (err) {
        // Server unreachable: build the day from the built-in library right here.
        console.error("[today] plan request failed, using library", err);
        const slots = profile ? planSlots(profile, isWeekendDate(today)) : [];
        return { source: "library", items: pickFromLibrary(slots, history, `${user.id}:${today}`) };
      }
    },
    staleTime: Infinity,
    retry: false,
  });
  const source = planQuery.data?.source ?? "library";
  const moodKey = moodQuery(user.id, today);
  const { data: mood } = useQuery(moodKey);
  const city = profile && isCity(profile.city) ? profile.city : DEFAULT_CITY;
  const weatherQ = useQuery({ queryKey: ["weather", city], queryFn: () => fetchWeather(city), staleTime: 30 * 60_000, retry: 1 });
  const reason = weatherQ.data ? weatherReason(weatherQ.data) : null;
  const weatherNote = weatherQ.data && reason
    ? t(`weather.${reason}`, { temp: formatTemp(reason === "hot" ? weatherQ.data.max : weatherQ.data.min) })
    : undefined;
  const plan = useMemo(() => {
    const items = applyWeather(planQuery.data?.items ?? [], reason);
    return (mood === "tired" ? lightenPlan(items) : items).map((item) => localize(item, lang));
  }, [planQuery.data, lang, mood, reason]);

  const { data: rituals = [] } = useQuery(ritualsQuery(user.id));
  const checksKey = ritualChecksQuery(user.id, today);
  const { data: checks = [] } = useQuery(checksKey);
  const checkedToday = new Set(checks.filter((c) => c.check_date === today).map((c) => c.ritual_id));
  const toggleRitual = useMutation({
    mutationFn: async (r: Ritual) => {
      if (checkedToday.has(r.id)) {
        const { error } = await supabase.from("ritual_checks").delete().eq("ritual_id", r.id).eq("check_date", today);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ritual_checks").insert({ user_id: user.id, ritual_id: r.id, check_date: today, minutes: r.minutes });
        if (error) throw error;
      }
    },
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["ritual-checks"] }),
      queryClient.invalidateQueries({ queryKey: ["stats"] }),
    ]),
    onError: (err) => toast.error(t("common.error", { message: err instanceof Error ? err.message : String(err) })),
  });
  const isSunday = new Date(`${today}T12:00:00`).getDay() === 0;
  const { data: stats } = useQuery({ ...statsQuery(user.id, today), enabled: isSunday });
  const weekMinutes = stats ? (weekTotals(stats.logs, checks, today, 1)[0] ?? 0) : 0;

  const setMood = useMutation({
    mutationFn: async (value: Mood | null) => {
      if (value === null) {
        const { error } = await supabase.from("parent_moods").delete().eq("user_id", user.id).eq("mood_date", today);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("parent_moods").upsert({ user_id: user.id, mood_date: today, mood: value }, { onConflict: "user_id,mood_date" });
      if (error) throw error;
    },
    onMutate: (value) => queryClient.setQueryData(moodKey.queryKey, value),
    onError: (err) => {
      void queryClient.invalidateQueries({ queryKey: moodKey.queryKey });
      toast.error(t("common.error", { message: err instanceof Error ? err.message : String(err) }));
    },
  });

  const mark = useMutation({
    mutationFn: async ({ activity, status, reaction }: MarkInput) => {
      if (status === null) {
        const { error } = await supabase
          .from("activity_logs")
          .delete()
          .eq("user_id", user.id)
          .eq("plan_date", today)
          .eq("activity_key", activity.key);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("activity_logs").upsert(
        {
          user_id: user.id,
          plan_date: today,
          activity_key: activity.key,
          title: activity.title,
          category: activity.category,
          duration_min: activity.duration_min,
          status,
          reaction,
        },
        { onConflict: "user_id,plan_date,activity_key" },
      );
      if (error) throw error;
    },
    onMutate: async ({ activity, status, reaction }) => {
      await queryClient.cancelQueries({ queryKey: logsKey.queryKey });
      const previous = queryClient.getQueryData(logsKey.queryKey);
      queryClient.setQueryData(logsKey.queryKey, (old: LogLite[] | undefined) => {
        const rest = (old ?? []).filter((l) => !(l.plan_date === today && l.activity_key === activity.key));
        if (status === null) return rest;
        return [
          { activity_key: activity.key, title: activity.title, category: activity.category, status, reaction, plan_date: today },
          ...rest,
        ];
      });
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(logsKey.queryKey, ctx.previous);
      toast.error(t("common.error", { message: err instanceof Error ? err.message : String(err) }));
    },
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: logsKey.queryKey }),
      queryClient.invalidateQueries({ queryKey: ["stats"] }),
    ]),
  });

  if (!profile) return null;
  const months = ageInMonths(profile.birth_date, today);
  const doneCount = plan.filter((a) => todayLogs.get(a.key)?.status === "done").length;
  const ritualsDone = rituals.filter((r) => checkedToday.has(r.id));
  const minutesToday =
    plan.filter((a) => todayLogs.get(a.key)?.status === "done").reduce((s, a) => s + a.duration_min, 0) +
    ritualsDone.reduce((s, r) => s + r.minutes, 0);
  const ringTotal = plan.length + rituals.length;
  const ringDone = doneCount + ritualsDone.length;

  return (
    <AppShell>
      <div className="mt-2 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t("today.greeting")}</h1>
        <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm font-bold shadow-soft" aria-label={t("weather.label")}>
          <CloudSun className="size-4 text-primary" aria-hidden />
          {weatherQ.data ? (
            <span>{formatTemp(weatherQ.data.now)} · {t(`cities.${city}`)}</span>
          ) : weatherQ.isError ? (
            <span className="text-muted-foreground">{t("weather.unavailable")}</span>
          ) : (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
        <span aria-hidden className="grid size-14 place-items-center rounded-full bg-accent text-3xl">
          🧒
        </span>
        <div className="min-w-0">
          <p className="truncate text-xl font-bold">{profile.child_name}</p>
          <p className="text-muted-foreground">
            {age(months)} · {t("age.total", { n: months })}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-card p-4 shadow-soft">
        {mood === undefined ? null : mood === null ? (
          <>
            <p className="text-lg font-bold">{t("mood.question")}</p>
            <p className="text-sm text-muted-foreground">{t("mood.hint")}</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {MOODS.map((m) => (
                <Button key={m} variant="soft" className="h-auto flex-col gap-1 py-3" onClick={() => setMood.mutate(m)}>
                  <span aria-hidden className="text-3xl">{MOOD_EMOJI[m]}</span>
                  <span className="text-xs whitespace-normal">{t(`mood.${m}`)}</span>
                </Button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex gap-3">
            <span aria-hidden className="text-3xl">{MOOD_EMOJI[mood]}</span>
            <div className="min-w-0 flex-1">
              {mood === "tired" ? (
                <>
                  <p className="font-bold">{t("mood.tiredTitle")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t("mood.tiredText")}</p>
                  <Button asChild variant="soft" size="sm" className="mt-3"><Link to="/assistant">{t("mood.talk")}</Link></Button>
                </>
              ) : (
                <p className="font-semibold">{t(mood === "good" ? "mood.goodReply" : "mood.okReply")}</p>
              )}
              <button type="button" className="mt-2 block text-xs text-muted-foreground underline" onClick={() => setMood.mutate(null)}>{t("mood.change")}</button>
            </div>
          </div>
        )}
      </div>

      {planQuery.isPending ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl bg-card p-8 text-center shadow-soft" role="status">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
          <p className="font-semibold text-muted-foreground">{t("today.loading")}</p>
        </div>
      ) : plan.length === 0 ? (
        <div className="mt-6 rounded-3xl border-2 border-dashed border-border p-6 text-center">
          <p className="font-semibold text-muted-foreground">{t("today.empty")}</p>
          <Button asChild variant="soft" className="mt-4">
            <Link to="/onboarding">{t("profile.edit")}</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">{t(mood === "tired" ? "today.lightPlan" : "today.plannedFor")}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
              {source === "ai" ? (
                <Sparkles className="size-3.5" aria-hidden />
              ) : (
                <BookOpen className="size-3.5" aria-hidden />
              )}
              {t(source === "ai" ? "today.ai" : "today.library")}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-4 rounded-3xl bg-card p-4 shadow-soft">
            <ProgressRing value={ringTotal ? ringDone / ringTotal : 0} />
            <div className="min-w-0">
              <p className="text-2xl font-bold text-primary">{t("minutes.today", { n: minutesToday })}</p>
              <p className="text-sm font-semibold text-muted-foreground">{t("today.summary", { done: doneCount, total: plan.length })}</p>
            </div>
          </div>

          <section className="mt-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">{t("rituals.today")}</h2>
              <Link to="/rituals" className="text-sm font-bold text-primary underline">{t("rituals.setup")}</Link>
            </div>
            {rituals.length === 0 ? (
              <p className="mt-2 rounded-2xl border-2 border-dashed border-border p-3 text-sm font-semibold text-muted-foreground">{t("rituals.empty")}</p>
            ) : (
              <ul className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
                {rituals.map((r) => {
                  const on = checkedToday.has(r.id);
                  return (
                    <li key={r.id} className="shrink-0">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        disabled={toggleRitual.isPending}
                        onClick={() => toggleRitual.mutate(r)}
                        className={`flex w-40 items-start gap-2 rounded-2xl border-2 p-3 text-left ${on ? "border-success bg-success-soft" : "border-border bg-card"}`}
                      >
                        <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 ${on ? "border-success bg-success text-success-foreground" : "border-border"}`}>
                          {on && <Check className="size-4" aria-hidden />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold leading-tight">{ritualTitle(r, t)}</span>
                          <span className="block text-xs text-muted-foreground">{isAnchor(r.anchor) ? t(`rituals.anchors.${r.anchor}`) : ""}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {isSunday && stats && <div className="mt-4"><WeeklySummary minutes={weekMinutes} /></div>}

          <div className="mt-4 space-y-4">
            {plan.map((activity) => (
              <ActivityCard
                key={activity.key}
                activity={activity}
                log={todayLogs.get(activity.key)}
                busy={mark.isPending && mark.variables?.activity.key === activity.key}
                onDone={() => mark.mutate({ activity, status: "done", reaction: null })}
                onSkip={() => mark.mutate({ activity, status: "skipped", reaction: null })}
                onReact={(reaction) => mark.mutate({ activity, status: "done", reaction })}
                onUndo={() => mark.mutate({ activity, status: null, reaction: null })}
                onDiscuss={() => { void navigate({ to: "/assistant", search: { activity: activity.key } }); }}
                weatherNote={weatherNote}
                customInterest={profile.interests}
                doneExtra={<MomentButton userId={user.id} day={today} activity={{ key: activity.key, title: activity.title }} consented={Boolean(profile.photo_consent_at)} />}
              />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" className="size-16 shrink-0 -rotate-90" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-success transition-all"
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value))} />
    </svg>
  );
}
