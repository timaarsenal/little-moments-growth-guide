import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Brand } from "@/components/balapan/Brand";
import { Disclaimer } from "@/components/balapan/Disclaimer";
import { LangSwitch } from "@/components/balapan/LangSwitch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Новый пароль — Balapan" },
      { name: "description", content: "Задайте новый пароль для входа в Balapan." },
      { property: "og:title", content: "Новый пароль — Balapan" },
      { property: "og:description", content: "Задайте новый пароль для входа в Balapan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The link from the email signs the parent in for this one step.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) setState("ready");
    });
    const hasError = /error/.test(window.location.hash) || /error/.test(window.location.search);
    const timer = window.setTimeout(async () => {
      const { data: s } = await supabase.auth.getSession();
      setState(s.session && !hasError ? "ready" : "invalid");
    }, 1500);
    return () => {
      data.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(t("auth.error", { message: err.message }));
    toast.success(t("auth.passwordSaved"));
    await navigate({ to: "/today" });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background bg-warm-glow">
      <header className="flex items-center justify-between px-5 py-3">
        <Brand />
        <LangSwitch />
      </header>
      <main className="flex flex-1 flex-col px-5 pb-6">
        <h1 className="mt-8 text-3xl font-bold">{t("auth.newPasswordTitle")}</h1>
        {state === "checking" && <Loader2 className="mt-8 size-8 animate-spin text-primary" aria-label={t("today.loading")} />}
        {state === "invalid" && (
          <div className="mt-6 rounded-3xl bg-card p-6 shadow-soft">
            <p className="font-semibold">{t("auth.linkInvalid")}</p>
            <Button asChild className="mt-4 w-full">
              <Link to="/auth" search={{ mode: "forgot" }}>{t("auth.forgot")}</Link>
            </Button>
          </div>
        )}
        {state === "ready" && (
          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-base font-bold">{t("auth.newPassword")}</Label>
              <Input id="new-password" type="password" autoComplete="new-password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)} className="h-14 rounded-2xl bg-card px-4 text-lg" />
              <p className="text-sm text-muted-foreground">{t("auth.passwordHint")}</p>
            </div>
            {error && <p role="alert" className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>{t("auth.savePassword")}</Button>
          </form>
        )}
        <Disclaimer className="mt-auto pt-10" />
      </main>
    </div>
  );
}
