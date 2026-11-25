import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Flame, Stethoscope } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/balapan/AppShell";
import { WeeklySummary } from "@/components/balapan/WeeklySummary";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { ageInMonths, localTodayISO, shiftISO } from "@/lib/age";
import { CATEGORY_STYLE } from "@/lib/categories";
import { kazakhWordsLearned } from "@/lib/kazakh-words";
import { MILESTONES, groupsForAge, shouldDiscuss, type MilestoneStatus } from "@/lib/milestones";
import { streakDays, weekTotals } from "@/lib/minutes";
import { profileQuery } from "@/lib/profile";
import { ritualChecksQuery } from "@/lib/rituals";
import { STATS_WEEKS, statsQuery } from "@/lib/stats";
import { CATEGORIES } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Прогресс — Balapan" },
      { name: "description", content: "Минуты вместе, занятия за неделю и этапы развития малыша." },
      { property: "og:title", content: "Прогресс — Balapan" },
      { property: "og:description", content: "Минуты вместе, занятия за неделю и этапы развития малыша." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    const profile = await context.queryClient.ensureQueryData(profileQuery);
    if (!profile) throw redirect({ to: "/onboarding" });
    const today = localTodayISO();
    await Promise.all([
      context.queryClient.ensureQueryData(statsQuery(context.user.id, today)),
      context.queryClient.ensureQueryData(ritualChecksQuery(context.user.id, today)),
    ]);
  },
  component: Progress,
});

const checksQuery = (userId: string) => ({
  queryKey: ["milestone-checks", userId],
  queryFn: async () => {
    const { data, error } = await supabase.from("milestone_checks").select("milestone_id, status").eq("user_id", userId);
    if (error) throw error;
    return new Map(data.map((c) => [c.milestone_id, c.status as MilestoneStatus]));
  },
});

function Progress() {
  const { t, lang, age } = useI18n();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const today = localTodayISO();
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: stats } = useSuspenseQuery(statsQuery(user.id, today));
  const { data: rituals } = useSuspenseQuery(ritualChecksQuery(user.id, today));
  const { data: checks = new Map<string, MilestoneStatus>() } = useQuery(checksQuery(user.id));

  const setCheck = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MilestoneStatus | null }) => {
      if (status === null) {
        const { error } = await supabase.from("milestone_checks").delete().eq("user_id", user.id).eq("milestone_id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("milestone_checks").upsert({ user_id: user.id, milestone_id: id, status }, { onConflict: "user_id,milestone_id" });
        if (error) throw error;
      }
    },
    onMutate: ({ id, status }) => {
      queryClient.setQueryData(["milestone-checks", user.id], (old: Map<string, MilestoneStatus> | undefined) => {
        const next = new Map(old);
        if (status === null) next.delete(id); else next.set(id, status);
        return next;
      });
    },
    onError: (err) => {
      void queryClient.invalidateQueries({ queryKey: ["milestone-checks"] });
      toast.error(t("common.error", { message: err instanceof Error ? err.message : String(err) }));
    },
  });

  if (!profile) return null;
  const months = ageInMonths(profile.birth_date, today);
  const weeks = weekTotals(stats.logs, rituals, today, STATS_WEEKS);
  const thisWeek = weeks[0] ?? 0;
  const lastWeek = weeks[1] ?? 0;
  const diff = thisWeek - lastWeek;
  const maxWeek = Math.max(1, ...weeks);
  const streak = streakDays(stats.logs, rituals, today);
  const weekStart = shiftISO(today, -6);
  const weekDone = stats.logs.filter((l) => l.status === "done" && l.plan_date >= weekStart);
  const byCat = CATEGORIES.map((c) => ({ c, n: weekDone.filter((l) => l.category === c).length }));
  const maxCat = Math.max(1, ...byCat.map((b) => b.n));
  const words = kazakhWordsLearned(stats.plans, stats.logs.filter((l) => l.plan_date >= weekStart));
  const groups = groupsForAge(months);

  return (
    <AppShell>
      <h1 className="mt-2 text-3xl font-bold">{t("progress.title")}</h1>

      <section className="mt-4 rounded-3xl bg-card p-5 shadow-soft">
        <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("minutes.title")} · {t("minutes.week")}</p>
        <p className="mt-1 text-4xl font-bold text-primary">{t("common.minutes", { n: thisWeek })}</p>
        <p className="mt-1 font-semibold text-muted-foreground">
          {diff > 0 ? t("minutes.more", { n: diff }) : diff < 0 ? t("minutes.less", { n: -diff }) : t("minutes.same")}
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">
          <Flame className="size-4" aria-hidden />
          {streak ? t("minutes.streak", { n: streak }) : t("minutes.noStreak")}
        </p>
        <h2 className="mt-5 text-sm font-bold text-muted-foreground">{t("minutes.byWeek")}</h2>
        <div className="mt-2 flex h-32 items-end gap-2" role="img" aria-label={weeks.map((w, i) => `${i ? t("minutes.weekShort", { n: i }) : t("minutes.thisWeek")}: ${w}`).join(", ")}>
          {[...weeks].reverse().map((w, i, arr) => {
            const idx = arr.length - 1 - i;
            return (
              <div key={idx} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-bold">{w}</span>
                <div className={cn("w-full rounded-t-xl", idx === 0 ? "bg-primary" : "bg-primary-soft")} style={{ height: `${Math.max(4, (w / maxWeek) * 80)}px` }} />
                <span className="text-[10px] text-muted-foreground">{idx === 0 ? t("minutes.thisWeek") : `−${idx}`}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-4"><WeeklySummary minutes={thisWeek} /></div>

      <section className="mt-4 rounded-3xl bg-card p-5 shadow-soft">
        <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("progress.week")}</p>
        <p className="mt-1 text-3xl font-bold">{weekDone.length} <span className="text-base text-muted-foreground">{t("progress.doneCount")}</span></p>
        {weekDone.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("progress.empty")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {byCat.map(({ c, n }) => {
              const st = CATEGORY_STYLE[c];
              return (
                <li key={c} className="flex items-center gap-2">
                  <st.Icon className="size-4 shrink-0" aria-hidden />
                  <span className="w-28 shrink-0 truncate text-sm font-semibold">{t(`categories.${c}`)}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", st.bar)} style={{ width: `${(n / maxCat) * 100}%` }} />
                  </div>
                  <span className="w-5 text-right text-sm font-bold">{n}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {(profile.bilingual || words.length > 0) && (
        <section className="mt-4 rounded-3xl bg-card p-5 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("kazakh.badge")}</p>
          <p className="mt-1 text-3xl font-bold">{words.length}</p>
          <p className="font-semibold">{t("kazakh.words")}</p>
          <p className="text-sm text-muted-foreground">{t("kazakh.wordsHint")}</p>
          {words.length > 0 && <p className="mt-2 text-sm">{words.join(", ")}</p>}
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-2xl font-bold">{t("progress.milestonesTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("progress.milestonesHint")}</p>
        {groups.map((g) => {
          const items = MILESTONES.filter((m) => m.age_months === g);
          return (
            <div key={g} className="mt-4 rounded-3xl bg-card p-5 shadow-soft">
              <h3 className="font-bold">{t("progressX.forAge", { age: age(g) })}</h3>
              <p className="text-sm text-muted-foreground">{t("progress.checked", { done: items.filter((m) => checks.get(m.id) === "yes").length, total: items.length })}</p>
              <ul className="mt-3 divide-y divide-border">
                {items.map((m) => {
                  const status = checks.get(m.id);
                  return (
                    <li key={m.id} className="py-3">
                      <p className="font-semibold">{m[lang]}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label={m[lang]}>
                        {(["yes", "not_yet"] as const).map((s) => (
                          <button key={s} type="button" role="radio" aria-checked={status === s}
                            onClick={() => setCheck.mutate({ id: m.id, status: status === s ? null : s })}
                            className={cn("rounded-2xl border-2 px-2 py-2 text-sm font-bold",
                              status === s ? (s === "yes" ? "border-success bg-success-soft" : "border-primary bg-primary-soft") : "border-border text-muted-foreground")}>
                            {t(s === "yes" ? "flags.can" : "flags.notYet")}
                          </button>
                        ))}
                      </div>
                      {shouldDiscuss(m, status, months) && (
                        <div className="mt-3 rounded-2xl bg-accent p-3 text-accent-foreground" role="note">
                          <p className="text-sm font-semibold">{t("flags.calm")}</p>
                          <Button size="sm" variant="outline" className="mt-2" disabled>
                            <Stethoscope aria-hidden />
                            {t("flags.consult")}
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{t("flags.soon")}</span>
                          </Button>
                        </div>
                      )}
                      <a href={m.source.split(" ").pop()} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-muted-foreground underline">{t("progress.source")}: CDC</a>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>
    </AppShell>
  );
}

