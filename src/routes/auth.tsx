import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Brand } from "@/components/balapan/Brand";
import { Disclaimer } from "@/components/balapan/Disclaimer";
import { LangSwitch } from "@/components/balapan/LangSwitch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";

type Mode = "signin" | "signup";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: Mode } =>
    search["mode"] === "signup" ? { mode: "signup" } : { mode: "signin" },
  head: () => ({
    meta: [
      { title: "Вход — Balapan" },
      { name: "description", content: "Войдите или создайте аккаунт Balapan по эл. почте." },
      { property: "og:title", content: "Вход — Balapan" },
      { property: "og:description", content: "Войдите или создайте аккаунт Balapan по эл. почте." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const mode: Mode = search.mode ?? "signin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (err) throw err;
        if (data.session) {
          await navigate({ to: "/today" });
        } else {
          setSentTo(email);
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        await navigate({ to: "/today" });
      }
    } catch (err) {
      setError(t("auth.error", { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background bg-warm-glow">
      <header className="flex items-center justify-between px-5 py-3">
        <Brand />
        <LangSwitch />
      </header>

      <main className="flex flex-1 flex-col px-5 pb-6">
        {sentTo ? (
          <div className="mt-10 rounded-3xl bg-card p-6 text-center shadow-soft animate-pop-in">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-success-soft text-success">
              <MailCheck className="size-8" aria-hidden />
            </span>
            <p className="mt-4 text-lg font-semibold">{t("auth.checkEmail", { email: sentTo })}</p>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link to="/auth" search={{ mode: "signin" }} onClick={() => setSentTo(null)}>
                {t("auth.signIn")}
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="mt-8 text-3xl font-bold">
              {mode === "signup" ? t("auth.titleUp") : t("auth.titleIn")}
            </h1>
            <p className="mt-2 text-muted-foreground">{t("auth.subtitle")}</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-bold">
                  {t("auth.email")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 rounded-2xl bg-card px-4 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-bold">
                  {t("auth.password")}
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 rounded-2xl bg-card px-4 text-lg"
                />
                {mode === "signup" && (
                  <p className="text-sm text-muted-foreground">{t("auth.passwordHint")}</p>
                )}
              </div>

              {error && (
                <p role="alert" className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {mode === "signup" ? t("auth.signUp") : t("auth.signIn")}
              </Button>
            </form>

            <Button asChild variant="link" className="mt-4">
              <Link to="/auth" search={{ mode: mode === "signup" ? "signin" : "signup" }}>
                {mode === "signup" ? t("auth.toSignIn") : t("auth.toSignUp")}
              </Link>
            </Button>
          </>
        )}

        <Disclaimer className="mt-auto pt-10" />
      </main>
    </div>
  );
}
