import { createFileRoute } from "@tanstack/react-router";

import { AuthScreen, type AuthMode } from "@/components/balapan/AuthScreen";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { mode?: AuthMode } =>
    search["mode"] === "signup" || search["mode"] === "forgot" ? { mode: search["mode"] } : { mode: "signin" },
  head: () => ({
    meta: [
      { title: "Balapan — вход и регистрация" },
      {
        name: "description",
        content:
          "Войдите или создайте аккаунт Balapan: короткие развивающие занятия для малыша 1–3 лет под ваше свободное время. RU / KZ.",
      },
      { property: "og:title", content: "Balapan — вход и регистрация" },
      {
        property: "og:description",
        content: "Короткие развивающие занятия под возраст ребёнка и свободное время родителей.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  return <AuthScreen mode={search.mode ?? "signin"} />;
}
