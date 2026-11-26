import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bath, BookOpen, Car, Check, CloudSun, CookingPot, House, Loader2, Moon, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ActivityCard } from "@/components/balapan/ActivityCard";
import { WeeklyNotifier } from "@/components/balapan/WeeklyNotifier";
import { AppShell } from "@/components/balapan/AppShell";
import { MoodFace } from "@/components/balapan/Illustrations";
import { BedtimeRitual, Hero } from "@/components/illustrations";
import { MomentButton } from "@/components/balapan/MomentButton";
import { WeeklySummary } from "@/components/balapan/WeeklySummary";
import { Button } from "@/components/ui/button";
import { formatShortDate, useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { ageInMonths, localTodayISO } from "@/lib/age";
import { pickFromLibrary, quickIdeas, quickToPlanned } from "@/lib/library";
import { ensureKazakh } from "@/lib/kazakh-fallback";
import { logsQuery } from "@/lib/logs";
import { getTodayPlan } from "@/lib/plan.functions";
import { profileQuery } from "@/lib/profile";
import { lightenPlan } from "@/lib/light-plan";
import { streakDays, weekTotals } from "@/lib/minutes";
import { INFANT_MAX_MONTHS, suggestForWakeWindow, type InfantActivity } from "@/lib/infant";
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

const PLACES = [
  { id: "home", Icon: House },
  { id: "kitchen", Icon: CookingPot },
  { id: "car", Icon: Car },
  { id: "bath", Icon: Bath },
] as const;
type Place = (typeof PLACES)[number]["id"];

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
        return { source: "library", items: ensureKazakh(pickFromLibrary(slots, history, `${user.id}:${today}`), Boolean(profile?.bilingual), `${user.id}:${today}`) };
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
    const items = applyWeather(ensureKazakh(planQuery.data?.items ?? [], Boolean(profile?.bilingual), `${user.id}:${today}`), reason);
    return (mood === "tired" ? lightenPlan(items) : items).map((item) => localize(item, lang));
  }, [planQuery.data, lang, mood, reason, profile?.bilingual, user.id, today]);

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
  const { data: stats } = useQuery(statsQuery(user.id, today));
  const [place, setPlace] = useState<Place | null>(null);
  const [woke, setWoke] = useState<{ left: number; items: InfantActivity[] } | null>(null);
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
  // Today's marks come from the instantly-updated logs, earlier days from stats.
  const streak = streakDays(
    [
      ...(stats?.logs ?? []).filter((l) => l.plan_date !== today),
      ...plan.filter((a) => todayLogs.get(a.key)?.status === "done").map((a) => ({ plan_date: today, status: "done", duration_min: a.duration_min })),
    ],
    checks,
    today,
  );
  const showWoke = months < INFANT_MAX_MONTHS;
  const dateLabel = formatShortDate(new Date(`${today}T12:00:00`));
  const nextKey = plan.find((a) => !todayLogs.get(a.key))?.key;

  return (
    <AppShell>
      <WeeklyNotifier months={months} name={profile.child_name} />
      <section className="relative -mx-5 -mt-2 h-56 overflow-hidden">
        <Hero preserve="xMidYMax slice" className="absolute inset-0 size-full" />
        <div className="relative flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary-dark">{dateLabel}</p>
            <h1 className="mt-0.5 truncate text-3xl font-extrabold">{t("today.title", { name: profile.child_name })}</h1>
            <p className="text-sm font-semibold text-muted-foreground">{age(months)}</p>
          </div>
          <div className="flex w-40 shrink-0 flex-col items-end gap-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm font-extrabold" aria-label={t("weather.label")}>
            <CloudSun className="size-4 text-primary" aria-hidden />
            {weatherQ.data ? (
              <span>{formatTemp(weatherQ.data.now)}</span>
            ) : weatherQ.isError ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            )}
          </div>
          {weatherQ.data && (
            <p className="relative rounded-2xl bg-card/95 px-3 py-2 text-xs font-bold leading-snug text-primary-dark before:absolute before:-top-1.5 before:right-6 before:size-3 before:rotate-45 before:bg-card/95" role="note">
              {weatherNote ?? t("weather.goodWalk")}
            </p>
          )}
          </div>
        </div>
      </section>
      <div className="relative -mt-14 flex items-center gap-4 rounded-3xl bg-card p-4 shadow-main" role="status" aria-live="polite">
        <div className="relative shrink-0">
          <ProgressRing value={ringTotal ? ringDone / ringTotal : 0} />
          <span className="absolute inset-0 grid place-items-center text-base font-extrabold">{ringDone}/{ringTotal}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-muted-foreground">{t("today.ringDone", { done: ringDone, total: ringTotal })}</p>
          <p className="text-xs font-bold text-muted-foreground">{t("minutes.title")}</p>
          <p className="text-2xl font-extrabold text-primary-dark">{t("common.minutes", { n: minutesToday })}</p>
          <p className="text-sm font-bold text-warm-foreground">{streak ? t("today.streak", { n: streak }) : t("today.noStreak")}</p>
        </div>
      </div>

      {showWoke && (
        <section className="mt-4">
          <Button size="lg" className="w-full" onClick={() => {
            const now = new Date();
            setWoke(suggestForWakeWindow(profile, now.getHours() * 60 + now.getMinutes(), now.getDate() + now.getHours()));
          }}>
            {t("today.woke")}
          </Button>
          {woke && (
            <div className="mt-3 rounded-3xl bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{t("today.wokeTitle")}</p>
                  <p className="text-sm text-muted-foreground">{t("today.wokeLeft", { n: woke.left })}</p>
                </div>
                <button type="button" className="text-sm text-muted-foreground underline" onClick={() => setWoke(null)}>{t("today.wokeClose")}</button>
              </div>
              {woke.items.length === 0 ? (
                <p className="mt-2 font-semibold">{t("today.wokeNone")}</p>
              ) : (
                <>
                  {woke.left <= 30 && <p className="mt-2 text-sm font-semibold text-primary">{t("today.wokeCalm")}</p>}
                  <ul className="mt-3 space-y-3">
                    {woke.items.map((a) => (
                      <li key={a.id} className="rounded-2xl bg-muted/60 p-3">
                        <p className="font-bold">{a[lang].title} · {t("common.minutes", { n: a.duration_min })}</p>
                        <p className="text-sm text-muted-foreground">{a[lang].why}</p>
                        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                          {a[lang].steps.map((step) => <li key={step}>{step}</li>)}
                        </ol>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </section>
      )}

      <div className="mt-4 rounded-3xl bg-card p-4 shadow-soft">
        {mood === undefined ? null : mood === null ? (
          <>
            <p className="text-lg font-bold">{t("mood.question")}</p>
            <p className="text-sm text-muted-foreground">{t("mood.hint")}</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {MOODS.map((m) => (
                <Button key={m} variant="soft" className={`h-auto flex-col gap-1 py-3 ${m === "tired" ? "bg-warm-soft text-warm-foreground hover:bg-warm-soft" : ""}`} onClick={() => setMood.mutate(m)}>
                  <MoodFace mood={m} />
                  <span className="text-xs whitespace-normal">{t(`mood.${m}`)}</span>
                </Button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex gap-3">
            <MoodFace mood={mood} className="shrink-0" />
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

      {profile.interest_tags.length === 0 && !profile.interests && (
        <section className="mt-4 rounded-3xl border border-border bg-card p-4">
          <p className="text-lg font-extrabold">{t("interestsPrompt.title", { name: profile.child_name })}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("interestsPrompt.text")}</p>
          <Button asChild className="mt-3 w-full"><Link to="/profile" hash="interests">{t("interestsPrompt.button")}</Link></Button>
        </section>
      )}

      <section className="mt-4 rounded-3xl bg-warm-soft p-4">
        <h2 className="text-lg font-extrabold text-warm-foreground">{t("quick.title")}</h2>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {PLACES.map(({ id, Icon }) => (
            <button key={id} type="button" aria-pressed={place === id} onClick={() => setPlace(place === id ? null : id)}
              className={`flex min-h-11 flex-col items-center gap-1 rounded-2xl border-2 bg-card px-1 py-3 text-xs font-extrabold ${place === id ? "border-warm text-warm-foreground" : "border-transparent text-foreground"}`}>
              <Icon className="size-6 text-warm" aria-hidden />
              {t(`quick.places.${id}`)}
            </button>
          ))}
        </div>
        {place && (
          <div className="mt-3 space-y-3">
            <p className="text-sm font-semibold text-warm-foreground">{t("quick.hint")}</p>
            {quickIdeas(place, months).map((q) => {
              const activity = quickToPlanned(q, lang);
              return (
                <ActivityCard
                  key={activity.key}
                  quick
                  activity={activity}
                  log={todayLogs.get(activity.key)}
                  busy={mark.isPending && mark.variables?.activity.key === activity.key}
                  onDone={() => mark.mutate({ activity, status: "done", reaction: null })}
                  onSkip={() => mark.mutate({ activity, status: "skipped", reaction: null })}
                  onReact={(reaction) => mark.mutate({ activity, status: "done", reaction })}
                  onUndo={() => mark.mutate({ activity, status: null, reaction: null })}
                  onDiscuss={() => { void navigate({ to: "/assistant", search: { activity: activity.key } }); }}
                />
              );
            })}
          </div>
        )}
      </section>

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
            <p className="text-lg font-extrabold">{t(mood === "tired" ? "today.lightPlan" : "today.plannedFor")}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
              {source === "ai" ? (
                <Sparkles className="size-3.5" aria-hidden />
              ) : (
                <BookOpen className="size-3.5" aria-hidden />
              )}
              {t(source === "ai" ? "today.ai" : "today.library")}
            </span>
          </div>

          <section className="mt-4">
            <div className="flex items-center justify-between">
              <h2 className="inline-flex items-center gap-1.5 font-extrabold text-sleep-foreground"><Moon className="size-4" aria-hidden />{t("rituals.today")}</h2>
              <Link to="/rituals" className="text-sm font-bold text-primary underline">{t("rituals.setup")}</Link>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t("rituals.why")}</p>
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
                        className={`flex w-40 items-start gap-2 rounded-2xl border-2 p-3 text-left ${on ? "border-sleep-foreground bg-sleep" : "border-transparent bg-sleep"}`}
                      >
                        <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 ${on ? "border-sleep-foreground bg-sleep-foreground text-primary-foreground" : "border-sleep-foreground/40 bg-card"}`}>
                          {on && <Check className="size-4" aria-hidden />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold leading-tight">{ritualTitle(r, t)}</span>
                          {r.anchor === "bed" && <BedtimeRitual className="mb-1 h-8 w-9" />}
                          <span className="block text-xs text-sleep-foreground">{isAnchor(r.anchor) ? t(`rituals.anchors.${r.anchor}`) : ""}</span>
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
                next={activity.key === nextKey}
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
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="8" className="stroke-primary-soft" />
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-primary transition-all"
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value))} />
    </svg>
  );
}
