import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";

import { AppShell } from "@/components/balapan/AppShell";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Прогресс — Balapan" },
      { name: "description", content: "Занятия за неделю и этапы развития малыша." },
      { property: "og:title", content: "Прогресс — Balapan" },
      { property: "og:description", content: "Занятия за неделю и этапы развития малыша." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Progress,
});

function Progress() {
  const { t } = useI18n();
  return (
    <AppShell>
      <h1 className="mt-2 text-3xl font-bold">{t("progress.title")}</h1>
      <div className="mt-6 rounded-3xl border-2 border-dashed border-border p-6 text-center">
        <BarChart3 className="mx-auto size-8 text-primary" aria-hidden />
        <p className="mt-3 font-semibold text-muted-foreground">{t("progress.comingSoon")}</p>
      </div>
    </AppShell>
  );
}
