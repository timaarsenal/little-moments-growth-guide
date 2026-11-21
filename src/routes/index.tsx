import { Link, createFileRoute } from "@tanstack/react-router";
import { Clock, Moon, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import hero from "@/assets/hero-balapan.jpg";
import { Brand } from "@/components/balapan/Brand";
import { Disclaimer } from "@/components/balapan/Disclaimer";
import { LangSwitch } from "@/components/balapan/LangSwitch";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Balapan — занятия для малыша 1–3 лет за 5–30 минут" },
      {
        name: "description",
        content:
          "Balapan подбирает короткие развивающие занятия под возраст ребёнка и свободное время родителей. RU / KZ.",
      },
      { property: "og:title", content: "Balapan — занятия для малыша 1–3 лет за 5–30 минут" },
      {
        property: "og:description",
        content: "Короткие развивающие занятия под возраст ребёнка и свободное время родителей.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { t } = useI18n();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  const features = [
    { Icon: Clock, text: t("welcome.f1") },
    { Icon: Moon, text: t("welcome.f2") },
    { Icon: Sparkles, text: t("welcome.f3") },
  ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background bg-warm-glow">
      <header className="flex items-center justify-between px-5 py-3">
        <Brand />
        <LangSwitch />
      </header>

      <main className="flex flex-1 flex-col px-5 pb-6">
        <img
          src={hero}
          alt=""
          width={1312}
          height={1199}
          className="mx-auto mt-2 w-full max-w-sm rounded-4xl"
        />
        <h1 className="mt-4 text-3xl font-bold leading-tight text-foreground">
          {t("welcome.title")}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{t("app.tagline")}</p>

        <ul className="mt-6 space-y-3">
          {features.map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="font-semibold">{text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-3">
          {signedIn ? (
            <Button asChild size="lg">
              <Link to="/today">{t("welcome.open")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  {t("welcome.start")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth" search={{ mode: "signin" }}>
                  {t("welcome.haveAccount")}
                </Link>
              </Button>
            </>
          )}
        </div>

        <Disclaimer className="mt-auto pt-10" />
      </main>
    </div>
  );
}
