import { ChevronDown, Clock, MessageCircleHeart, RotateCcw } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { CATEGORY_STYLE } from "@/lib/categories";
import type { LogLite, PlannedActivity, Reaction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoryArt } from "./Illustrations";

const REACTIONS: { value: Reaction; emoji: string; labelKey: string }[] = [
  { value: "liked", emoji: "😊", labelKey: "today.liked" },
  { value: "ok", emoji: "😐", labelKey: "today.ok" },
  { value: "disliked", emoji: "😟", labelKey: "today.disliked" },
];

interface Props {
  activity: PlannedActivity;
  log: LogLite | undefined;
  busy: boolean;
  onDone: () => void;
  onSkip: () => void;
  onReact: (reaction: Reaction) => void;
  onUndo: () => void;
  onDiscuss: () => void;
  /** "Today −25 °C — we play at home" when the activity was moved indoors. */
  weatherNote?: string | undefined;
  /** The parent's own interest text, for the "custom" interest badge. */
  customInterest?: string;
  /** Extra controls shown after "Done" (e.g. save a moment). */
  doneExtra?: ReactNode;
  /** The next activity to do: shown larger with a wide picture. */
  next?: boolean;
}

export function ActivityCard({ activity, log, busy, onDone, onSkip, onReact, onUndo, onDiscuss, weatherNote, doneExtra, customInterest, next = false }: Props) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const style = CATEGORY_STYLE[activity.category];
  const status = log?.status;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-3xl border bg-card transition-opacity animate-pop-in",
        next ? "border-2 border-warm" : "border-border",
        status === "skipped" && "opacity-60",
      )}
    >
      {next && <CategoryArt category={activity.category} wide />}
      <div className="p-5">
      {next && (
        <span className="mb-3 inline-flex items-center rounded-full bg-warm-soft px-3 py-1 text-xs font-extrabold text-warm-foreground">
          {t("today.next")} · {activity.start_time}
        </span>
      )}
      <div className="flex gap-3">
        {!next && <CategoryArt category={activity.category} />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-muted-foreground">
            {!next && <span>{activity.start_time}</span>}
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", style.chip)}>
              <style.Icon className="size-3.5" aria-hidden />
              {t(`categories.${activity.category}`)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {t("today.min", { n: activity.duration_min })}
            </span>
          </div>
          <p className="mt-1 text-xs font-bold text-muted-foreground">{t(`windows.${activity.window}`)}</p>
          <h2 className={cn("mt-1 font-extrabold leading-snug", next ? "text-xl" : "text-lg", status === "done" && "line-through decoration-2 opacity-70")}>{activity.title}</h2>
        </div>
      </div>
      {(activity.kazakh || activity.interests?.length || (activity.movedIndoors && weatherNote)) && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
          {activity.kazakh && <span className="rounded-full bg-warm-soft px-2.5 py-1 text-warm-foreground">{t("kazakh.badge")}</span>}
          {activity.interests?.length ? (
            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-primary-dark">
              {t("interestBadge", { list: activity.interests.map((i) => (i === "custom" ? customInterest || t("interests.other") : t(`interests.${i}`)).toLowerCase()).join(", ") })}
            </span>
          ) : null}
          {activity.movedIndoors && weatherNote && <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">{weatherNote}</span>}
        </div>
      )}
      <p className="mt-2 text-muted-foreground">
        <span className="font-bold text-foreground">{t("today.why")}: </span>
        {activity.why}
      </p>

      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary"
      >
        {open ? t("today.hide") : t("today.details")}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </Button>

      {open && (
        <div className="mt-3 space-y-4 rounded-2xl bg-muted p-4">
          {activity.kz_words?.length ? (
            <div>
              <h3 className="font-sans text-sm font-extrabold uppercase tracking-wide text-muted-foreground">{t("kazakh.newWords")}</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {activity.kz_words.map((w) => (
                  <li key={w.kz} className="rounded-full bg-card px-3 py-1 text-sm"><b>{w.kz}</b>{lang === "ru" ? ` — ${w.ru}` : ""}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <h3 className="font-sans text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
              {t("today.steps")}
            </h3>
            <ol className="mt-2 space-y-2">
              {activity.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="font-sans text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
              {t("today.materials")}
            </h3>
            {activity.materials.length ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {activity.materials.map((m) => (
                  <li key={m} className="rounded-full bg-card px-3 py-1 text-sm font-semibold">
                    {m}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm">{t("today.noMaterials")}</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-5">
        {!status && (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="success" disabled={busy} onClick={onDone}>
              {t("today.done")}
            </Button>
            <Button variant="outline" disabled={busy} onClick={onSkip}>
              {t("today.skip")}
            </Button>
          </div>
        )}

        {status === "done" && (
          <div className="rounded-2xl bg-success-soft p-4">
            <p className="font-bold">{t("today.howWasIt")}</p>
            <div role="radiogroup" aria-label={t("today.howWasIt")} className="mt-3 grid grid-cols-3 gap-2">
              {REACTIONS.map((r) => (
                <Button
                  key={r.value}
                  variant="ghost"
                  type="button"
                  role="radio"
                  aria-checked={log?.reaction === r.value}
                  disabled={busy}
                  onClick={() => onReact(r.value)}
                  className={cn(
                    "h-auto min-w-0 flex flex-col items-center gap-1 rounded-2xl border-2 px-1 py-3 text-xs font-bold transition-colors",
                    log?.reaction === r.value
                      ? "border-success bg-card text-foreground"
                      : "border-transparent bg-card/60 text-muted-foreground hover:bg-card",
                  )}
                >
                  <span className="text-3xl" aria-hidden>
                    {r.emoji}
                  </span>
                  {t(r.labelKey)}
                </Button>
              ))}
            </div>
            {log?.reaction && <p className="mt-3 text-sm font-semibold text-secondary-foreground">{t("today.thanks")}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {doneExtra}
              <Button variant="ghost" size="sm" disabled={busy} onClick={onUndo}>
                <RotateCcw aria-hidden />
                {t("today.undo")}
              </Button>
            </div>
          </div>
        )}

        {status === "skipped" && (
          <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-2">
            <span className="font-bold text-muted-foreground">{t("today.skipped")}</span>
            <Button variant="ghost" size="sm" disabled={busy} onClick={onUndo}>
              <RotateCcw aria-hidden />
              {t("today.undo")}
            </Button>
          </div>
        )}
      </div>
      <Button variant="ghost" className="mt-3 w-full" onClick={onDiscuss}>
        <MessageCircleHeart aria-hidden />
        {t("today.discuss")}
      </Button>
      </div>
    </article>
  );
}
