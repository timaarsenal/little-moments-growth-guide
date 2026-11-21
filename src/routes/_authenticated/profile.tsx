import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Pencil } from "lucide-react";

import { AppShell } from "@/components/balapan/AppShell";
import { LangSwitch } from "@/components/balapan/LangSwitch";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { ageInMonths, hhmm, localTodayISO } from "@/lib/age";
import { profileQuery } from "@/lib/profile";

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
          </section>

          <section className="mt-4 rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {t("profile.schedule")}
            </h2>
            <Row label={t("onboarding.wake")} value={hhmm(profile.wake_time)} />
            <Row
              label={t("onboarding.napStart").split(":")[0] ?? ""}
              value={`${hhmm(profile.nap_start)}–${hhmm(profile.nap_end)}`}
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
