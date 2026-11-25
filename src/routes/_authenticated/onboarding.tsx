import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/balapan/AppShell";
import { MinutePicker } from "@/components/balapan/MinutePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { ageInMonths, hhmm, localTodayISO } from "@/lib/age";
import { profileQuery } from "@/lib/profile";
import { replanToday } from "@/lib/replan";
import { toMinutes } from "@/lib/schedule";
import { MAX_NAPS, defaultNaps, napRange, parseNaps, type Nap } from "@/lib/sleep";
import { BASE_INTERESTS, INTEREST_TAGS } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Профиль малыша — Balapan" },
      { name: "description", content: "Имя, возраст и режим дня малыша, свободное время родителей." },
      { property: "og:title", content: "Профиль малыша — Balapan" },
      { property: "og:description", content: "Имя, возраст и режим дня малыша." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQuery),
  component: Onboarding,
});

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base font-bold">
        {label}
      </Label>
      {children}
    </div>
  );
}

const inputClass = "h-14 rounded-2xl bg-card px-4 text-lg";

function Onboarding() {
  const { t, age } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: existing } = useSuspenseQuery(profileQuery);
  const today = localTodayISO();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(existing?.child_name ?? "");
  const [interests, setInterests] = useState(existing?.interests ?? "");
  const [tags, setTags] = useState<string[]>(existing?.interest_tags ?? []);
  const [birth, setBirth] = useState(existing?.birth_date ?? "");
  const [wake, setWake] = useState(hhmm(existing?.wake_time ?? "07:00"));
  const [naps, setNaps] = useState<Nap[]>(() => parseNaps(existing?.naps));
  const [napsTouched, setNapsTouched] = useState(Boolean(existing));
  const [bed, setBed] = useState(hhmm(existing?.bed_time ?? "21:00"));
  const [morning, setMorning] = useState(existing?.morning_minutes ?? 15);
  const [evening, setEvening] = useState(existing?.evening_minutes ?? 30);
  const [weekend, setWeekend] = useState(existing?.weekend_minutes ?? 60);

  function next() {
    setError(null);
    if (step === 1) {
      if (!name.trim()) return setError(t("onboarding.nameRequired"));
      if (!birth || birth > today) return setError(t("onboarding.birthRequired"));
      if (!napsTouched) setNaps(defaultNaps(ageInMonths(birth, today), wake, bed));
    }
    if (step === 2 && !napsValid()) return setError(t("onboarding.napsInvalid"));
    setStep((s) => Math.min(3, s + 1));
  }

  function napsValid() {
    let prev = toMinutes(wake);
    for (const n of [...naps].sort((a, b) => toMinutes(a.start) - toMinutes(b.start))) {
      if (toMinutes(n.start) <= prev || toMinutes(n.end) <= toMinutes(n.start)) return false;
      prev = toMinutes(n.end);
    }
    return prev < toMinutes(bed);
  }

  function editNaps(next: Nap[]) {
    setNapsTouched(true);
    setNaps(next);
  }

  const months = birth && birth <= today ? ageInMonths(birth, today) : null;
  const usual = months === null ? null : napRange(months);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw authError ?? new Error("No session");
      const { error: dbError } = await supabase.from("child_profiles").upsert(
        {
          user_id: auth.user.id,
          child_name: name.trim(),
          interests: interests.trim(),
          interest_tags: INTEREST_TAGS.filter((tag) => tags.includes(tag)),
          birth_date: birth,
          wake_time: wake,
          naps: parseNaps(naps) as unknown as Json,
          // Legacy columns mirror the first nap.
          ...(parseNaps(naps)[0] ? { nap_start: parseNaps(naps)[0]!.start, nap_end: parseNaps(naps)[0]!.end } : {}),
          bed_time: bed,
          morning_minutes: morning,
          evening_minutes: evening,
          weekend_minutes: weekend,
        },
        { onConflict: "user_id" },
      );
      if (dbError) throw dbError;
      // The schedule or interests may have changed: pick today's plan again.
      await replanToday(auth.user.id, queryClient);
      await queryClient.invalidateQueries({ queryKey: profileQuery.queryKey });
      toast.success(t("onboarding.saved"));
      await navigate({ to: "/today" });
    } catch (err) {
      setError(t("common.error", { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell nav={Boolean(existing)}>
      <div className="mt-2 flex items-center gap-2" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cn(
              "h-2 flex-1 rounded-full transition-colors",
              n <= step ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="mt-3 text-sm font-bold text-muted-foreground">
        {existing ? `${t("onboarding.editTitle")} · ` : ""}
        {t("onboarding.step", { n: step })}
      </p>

      {step === 1 && (
        <section className="animate-pop-in">
          <h1 className="mt-2 text-2xl font-bold">{t("onboarding.childTitle")}</h1>
          <div className="mt-6 space-y-5">
            <Field id="child-name" label={t("onboarding.childName")}>
              <Input
                id="child-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("onboarding.childNamePlaceholder")}
                autoComplete="off"
                className={inputClass}
              />
            </Field>
            <fieldset className="space-y-2">
              <legend className="text-base font-bold">{t("onboarding.interests")}</legend>
              <div className="flex flex-wrap gap-2">
                {BASE_INTERESTS.map((tag) => {
                  const on = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setTags((cur) => (on ? cur.filter((x) => x !== tag) : [...cur, tag]))}
                      className={cn(
                        "rounded-full border-2 px-4 py-2 font-bold transition-colors",
                        on ? "border-primary bg-primary-soft text-primary" : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      {t(`interests.${tag}`)}
                    </button>
                  );
                })}
              </div>
              <Label htmlFor="child-interests" className="pt-2 text-sm font-bold text-muted-foreground">{t("interests.other")}</Label>
              <Input id="child-interests" value={interests} onChange={(e) => setInterests(e.target.value)} maxLength={200} placeholder={t("interests.otherPlaceholder")} className={inputClass} />
            </fieldset>
            <Field id="birth" label={t("onboarding.birthDate")}>
              <Input
                id="birth"
                type="date"
                max={today}
                value={birth}
                onChange={(e) => setBirth(e.target.value)}
                className={inputClass}
              />
            </Field>
            {birth && birth <= today && (
              <p className="rounded-2xl bg-accent px-4 py-3 font-bold text-accent-foreground">
                {t("onboarding.ageHint", { age: age(ageInMonths(birth, today)) })}
                <span className="font-semibold">
                  {" "}
                  · {t("age.total", { n: ageInMonths(birth, today) })}
                </span>
              </p>
            )}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="animate-pop-in">
          <h1 className="mt-2 text-2xl font-bold">{t("onboarding.scheduleTitle")}</h1>
          <p className="mt-1 text-muted-foreground">{t("onboarding.scheduleHint")}</p>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Field id="wake" label={`☀️ ${t("onboarding.wake")}`}>
              <Input id="wake" type="time" value={wake} onChange={(e) => setWake(e.target.value)} className={inputClass} />
            </Field>
            <Field id="bed" label={`🌙 ${t("onboarding.bed")}`}>
              <Input id="bed" type="time" value={bed} onChange={(e) => setBed(e.target.value)} className={inputClass} />
            </Field>

          </div>

          <fieldset className="mt-6 space-y-3">
            <legend className="text-lg font-bold">{t("onboarding.napsTitle")}</legend>
            <p className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground">{t("onboarding.napsHint")}</p>
            {usual && (
              <p className="text-sm text-muted-foreground">
                {t("onboarding.napsUsual", { range: usual[0] === usual[1] ? String(usual[0]) : `${usual[0]}–${usual[1]}` })}
              </p>
            )}
            {naps.length === 0 && <p className="font-semibold text-muted-foreground">{t("onboarding.noNaps")}</p>}
            <ul className="space-y-3">
              {naps.map((n, i) => (
                <li key={i} className="rounded-2xl bg-card p-3 shadow-soft">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{t("onboarding.napN", { n: i + 1 })}</span>
                    <Button type="button" variant="ghost" size="icon" aria-label={t("onboarding.removeNap", { n: i + 1 })}
                      onClick={() => editNaps(naps.filter((_, j) => j !== i))}>
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-3">
                    <Field id={`nap-${i}-start`} label={t("onboarding.napFrom")}>
                      <Input id={`nap-${i}-start`} type="time" value={n.start} className={inputClass}
                        onChange={(e) => editNaps(naps.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
                    </Field>
                    <Field id={`nap-${i}-end`} label={t("onboarding.napTo")}>
                      <Input id={`nap-${i}-end`} type="time" value={n.end} className={inputClass}
                        onChange={(e) => editNaps(naps.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
                    </Field>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="soft" disabled={naps.length >= MAX_NAPS}
                onClick={() => {
                  const last = naps[naps.length - 1];
                  const from = last ? toMinutes(last.end) + 90 : toMinutes(wake) + 180;
                  const f = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
                  editNaps([...naps, { start: f(from), end: f(from + 60) }]);
                }}>
                <Plus aria-hidden />{t("onboarding.addNap")}
              </Button>
              {months !== null && (
                <Button type="button" variant="ghost" onClick={() => editNaps(defaultNaps(months, wake, bed))}>
                  {t("onboarding.resetNaps")}
                </Button>
              )}
            </div>
          </fieldset>
        </section>
      )}

      {step === 3 && (
        <section className="animate-pop-in">
          <h1 className="mt-2 text-2xl font-bold">{t("onboarding.windowsTitle")}</h1>
          <p className="mt-1 text-muted-foreground">{t("onboarding.windowsHint")}</p>
          <div className="mt-6 space-y-4">
            <MinutePicker label={t("onboarding.morning")} emoji="🌅" value={morning} onChange={setMorning} />
            <MinutePicker label={t("onboarding.evening")} emoji="🌇" value={evening} onChange={setEvening} />
            <MinutePicker label={t("onboarding.weekend")} emoji="🧺" value={weekend} onChange={setWeekend} />
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="mt-5 rounded-2xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      <div className="mt-8 flex gap-3">
        {step > 1 && (
          <Button type="button" variant="outline" size="lg" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft aria-hidden />
            {t("onboarding.back")}
          </Button>
        )}
        {step < 3 ? (
          <Button type="button" size="lg" className="flex-1" onClick={next}>
            {t("onboarding.next")}
            <ArrowRight aria-hidden />
          </Button>
        ) : (
          <Button type="button" size="lg" className="flex-1" onClick={save} disabled={saving}>
            <Check aria-hidden />
            {saving ? t("onboarding.saving") : t("onboarding.finish")}
          </Button>
        )}
      </div>
    </AppShell>
  );
}
