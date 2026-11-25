import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Images, LogOut, Pencil, Repeat } from "lucide-react";

import { AppShell } from "@/components/balapan/AppShell";
import { LangSwitch } from "@/components/balapan/LangSwitch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { ageInMonths, hhmm, localTodayISO } from "@/lib/age";
import { parseNaps } from "@/lib/sleep";
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
    mutationFn: async (patch: { bilingual?: boolean; city?: string }) => {
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
            <h3 className="mt-4 text-sm font-bold text-muted-foreground">{t("profile.interests")}</h3>
            {profile.interest_tags.length || profile.interests ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {profile.interest_tags.map((tag) => (
                  <li key={tag} className="rounded-full bg-primary-soft px-3 py-1 text-sm font-bold text-primary">{t(`interests.${tag}`)}</li>
                ))}
                {profile.interests && <li className="break-words rounded-full bg-muted px-3 py-1 text-sm font-bold">{profile.interests}</li>}
              </ul>
            ) : (
              <p className="mt-1 font-semibold">{t("profile.noInterests")}</p>
            )}
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
