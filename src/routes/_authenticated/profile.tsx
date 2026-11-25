import { useEffect, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Images, LogOut, Pencil, Repeat } from "lucide-react";

import { AppShell } from "@/components/balapan/AppShell";
import { NOTIFY_PREF, WeeklyNotifier } from "@/components/balapan/WeeklyNotifier";
import { LangSwitch } from "@/components/balapan/LangSwitch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { ageInMonths, hhmm, localTodayISO } from "@/lib/age";
import { parseNaps } from "@/lib/sleep";
import { BASE_INTERESTS, extraInterestsFor } from "@/lib/types";
import { cn } from "@/lib/utils";
import { profileQuery } from "@/lib/profile";
import { replanToday } from "@/lib/replan";
import { CITIES, DEFAULT_CITY, isCity, type CityKey } from "@/lib/weather";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Профиль — Balapan" },
      { name: "description", content: "Профиль малыша, режим дня и свободное время родителей." },
      { property: "og:title", content: "Профиль — Balapan" },
      { property: "og:description", content: "Профиль малыша и режим дня." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQuery),
  component: Profile,
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-bold">{value}</span>
    </div>
  );
}

function Profile() {
  const { t, age } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { user } = Route.useRouteContext();
  const update = useMutation({
    mutationFn: async (patch: { bilingual?: boolean; city?: string; interest_tags?: string[] }) => {
      const { error } = await supabase.from("child_profiles").update(patch).eq("user_id", user.id);
      if (error) throw error;
      await replanToday(user.id, queryClient);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileQuery.queryKey });
      toast.success(t("profileX.saved"));
    },
    onError: (err) => toast.error(t("common.error", { message: err instanceof Error ? err.message : String(err) })),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }

  const [notify, setNotify] = useState(false);
  useEffect(() => {
    setNotify(typeof Notification !== "undefined" && Notification.permission === "granted" && localStorage.getItem(NOTIFY_PREF) === "on");
  }, []);
  async function toggleNotify(on: boolean) {
    if (!on) { localStorage.setItem(NOTIFY_PREF, "off"); setNotify(false); return; }
    if (typeof Notification === "undefined") { toast.error(t("weekly.notifyDenied")); return; }
    if (window.top !== window.self) { toast.error(t("weekly.notifyFrame")); return; }
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm !== "granted") { toast.error(t("weekly.notifyDenied")); return; }
    localStorage.setItem(NOTIFY_PREF, "on");
    setNotify(true);
  }

  const [showMore, setShowMore] = useState(false);
  const months = profile ? ageInMonths(profile.birth_date, localTodayISO()) : 0;
  const extras = extraInterestsFor(months);
  const allBase = !!profile && BASE_INTERESTS.every((x) => profile.interest_tags.includes(x));
  const moreOpen = showMore || allBase;
  const visibleTags = profile
    ? [...new Set<string>([...BASE_INTERESTS, ...(moreOpen ? extras : []), ...profile.interest_tags])]
    : [];

  const min = (n: number) => (n === 0 ? t("onboarding.none") : t("common.minutes", { n }));

  return (
    <AppShell>
      <h1 className="mt-2 text-3xl font-bold">{t("profile.title")}</h1>

      {profile && (
        <>
          <section className="mt-6 rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {t("profile.child")}
            </h2>
            <p className="mt-2 text-2xl font-bold">{profile.child_name}</p>
            <p className="text-muted-foreground">
              {age(ageInMonths(profile.birth_date, localTodayISO()))}
            </p>
            <div className="mt-4 rounded-2xl bg-accent p-4">
              <p className="font-extrabold text-accent-foreground">{t("weekly.newInterests")}</p>
              <p className="text-xs text-accent-foreground">{t("weekly.newInterestsHint")}</p>
            </div>
            <h3 id="interests" className="mt-4 scroll-mt-20 text-sm font-bold text-muted-foreground">{t("profile.interests")}</h3>
            <p className="text-xs text-muted-foreground">{t("profile.interestsHint")}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {visibleTags.map((tag) => {
                const on = profile.interest_tags.includes(tag);
                return (
                  <li key={tag}>
                    <button type="button" aria-pressed={on} disabled={update.isPending}
                      onClick={() => update.mutate({ interest_tags: on ? profile.interest_tags.filter((x) => x !== tag) : [...profile.interest_tags, tag] })}
                      className={cn("min-h-11 rounded-full border-2 px-4 text-sm font-bold", on ? "border-primary bg-primary-soft text-primary" : "border-border bg-card text-muted-foreground")}>
                      {t(`interests.${tag}`)}
                    </button>
                  </li>
                );
              })}
              {profile.interests && <li className="flex min-h-11 items-center break-words rounded-full bg-muted px-4 text-sm font-bold">{profile.interests}</li>}
            </ul>
            {!allBase && (
              <button type="button" onClick={() => setShowMore((v) => !v)} className="mt-3 min-h-11 rounded-full px-2 text-sm font-extrabold text-primary">
                {moreOpen ? t("interests.less") : `+ ${t("interests.more")}`}
              </button>
            )}
            {moreOpen && <p className="mt-1 text-xs text-muted-foreground">{t("interests.moreHint")}</p>}
          </section>

          <WeeklyNotifier months={ageInMonths(profile.birth_date, localTodayISO())} name={profile.child_name} />
          <section className="mt-4 rounded-3xl bg-card p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label htmlFor="weekly-notify" className="text-base font-bold">{t("weekly.notify")}</Label>
                <p className="text-sm text-muted-foreground">{t("weekly.notifyHint")}</p>
              </div>
              <Switch id="weekly-notify" checked={notify} onCheckedChange={(v) => void toggleNotify(v)} />
            </div>
          </section>

          <section className="mt-4 space-y-4 rounded-3xl bg-card p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label htmlFor="bilingual" className="text-base font-bold">{t("kazakh.setting")}</Label>
                <p className="mt-1 text-sm text-muted-foreground">{t("kazakh.settingHint")}</p>
              </div>
              <Switch id="bilingual" checked={profile.bilingual} disabled={update.isPending} onCheckedChange={(v) => update.mutate({ bilingual: v })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city" className="text-base font-bold">{t("profileX.city")}</Label>
              <Select value={isCity(profile.city) ? profile.city : DEFAULT_CITY} onValueChange={(v) => update.mutate({ city: v })} disabled={update.isPending}>
                <SelectTrigger id="city" className="h-12 rounded-2xl text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CITIES) as CityKey[]).map((c) => <SelectItem key={c} value={c}>{t(`cities.${c}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </section>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button asChild variant="soft" size="lg"><Link to="/rituals"><Repeat aria-hidden />{t("profileX.rituals")}</Link></Button>
            <Button asChild variant="soft" size="lg"><Link to="/moments"><Images aria-hidden />{t("profileX.moments")}</Link></Button>
          </div>

          <section className="mt-4 rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {t("profile.schedule")}
            </h2>
            <Row label={t("onboarding.wake")} value={hhmm(profile.wake_time)} />
            <Row
              label={t("profile.naps")}
              value={parseNaps(profile.naps).map((n) => `${n.start}–${n.end}`).join(", ") || t("profile.napsNone")}
            />
            <Row label={t("onboarding.bed")} value={hhmm(profile.bed_time)} />
          </section>

          <section className="mt-4 rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {t("profile.windows")}
            </h2>
            <Row label={t("onboarding.morning")} value={min(profile.morning_minutes)} />
            <Row label={t("onboarding.evening")} value={min(profile.evening_minutes)} />
            <Row label={t("onboarding.weekend")} value={min(profile.weekend_minutes)} />
          </section>

          <Button asChild variant="soft" size="lg" className="mt-4 w-full">
            <Link to="/onboarding">
              <Pencil aria-hidden />
              {t("profile.edit")}
            </Link>
          </Button>
        </>
      )}

      <section className="mt-6 flex items-center justify-between rounded-3xl bg-card p-5 shadow-soft">
        <span className="font-bold">{t("profile.language")}</span>
        <LangSwitch />
      </section>

      <section className="mt-4 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("profile.account")}
        </h2>
        <p className="mt-2 break-all font-semibold">{user.email}</p>
        <Button variant="outline" size="lg" className="mt-4 w-full" onClick={signOut}>
          <LogOut aria-hidden />
          {t("profile.signOut")}
        </Button>
      </section>
    </AppShell>
  );
}
