import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { AppShell } from "@/components/balapan/AppShell";
import { useI18n } from "@/i18n";
import { ageInMonths, localTodayISO } from "@/lib/age";
import { profileQuery } from "@/lib/profile";

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
  },
  component: Today,
});

function Today() {
  const { t, age } = useI18n();
  const { data: profile } = useSuspenseQuery(profileQuery);
  if (!profile) return null;
  const months = ageInMonths(profile.birth_date, localTodayISO());

  return (
    <AppShell>
      <h1 className="mt-2 text-3xl font-bold">{t("today.greeting")}</h1>
      <div className="mt-4 flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
        <span aria-hidden className="grid size-14 place-items-center rounded-full bg-accent text-3xl">
          🧒
        </span>
        <div>
          <p className="text-xl font-bold">{profile.child_name}</p>
          <p className="text-muted-foreground">
            {age(months)} · {t("age.total", { n: months })}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border-2 border-dashed border-border p-6 text-center">
        <Sparkles className="mx-auto size-8 text-primary" aria-hidden />
        <p className="mt-3 font-semibold text-muted-foreground">{t("today.comingSoon")}</p>
      </div>
    </AppShell>
  );
}
