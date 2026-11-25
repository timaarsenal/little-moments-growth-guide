import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/balapan/AppShell";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/assistant")({
  validateSearch: (search: Record<string, unknown>): { activity?: string } =>
    typeof search["activity"] === "string" ? { activity: search["activity"] } : {},
  head: () => ({
    meta: [
      { title: "Помощник — Balapan" },
      { name: "description", content: "Поддержка родителей и обсуждение занятий малыша в Balapan." },
      { property: "og:title", content: "Помощник — Balapan" },
      { property: "og:description", content: "Поддержка родителей и обсуждение занятий малыша в Balapan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assistant,
});

function Assistant() {
  const { t } = useI18n();
  return (
    <AppShell>
      <h1 className="mt-2 text-3xl font-bold">{t("assistant.title")}</h1>
      <p className="mt-6 text-muted-foreground">{t("assistant.pending")}</p>
      <p className="mt-6 text-xs text-muted-foreground">{t("assistant.disclaimer")}</p>
    </AppShell>
  );
}