import { ChevronDown, Clock, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { CATEGORY_STYLE } from "@/lib/categories";
import type { LogLite, PlannedActivity, Reaction } from "@/lib/types";
import { cn } from "@/lib/utils";

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
}

export function ActivityCard({ activity, log, busy, onDone, onSkip, onReact, onUndo }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const style = CATEGORY_STYLE[activity.category];
  const status = log?.status;

  return (
    <article
      className={cn(
        "rounded-3xl bg-card p-5 shadow-soft transition-opacity animate-pop-in",
        status === "skipped" && "opacity-60",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold", style.chip)}>
          <style.Icon className="size-4" aria-hidden />
          {t(`categories.${activity.category}`)}
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground">
          <Clock className="size-4" aria-hidden />
          {t("today.min", { n: activity.duration_min })}
        </span>
      </div>

      <p className="mt-3 text-sm font-bold text-primary">
        {t(`windows.${activity.window}`)} · {activity.start_time}
      </p>
      <h2 className="mt-1 text-xl font-bold leading-snug">{activity.title}</h2>
      <p className="mt-2 text-muted-foreground">
        <span className="font-bold text-foreground">{t("today.why")}: </span>
        {activity.why}
      </p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary"
      >
        {open ? t("today.hide") : t("today.details")}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="mt-3 space-y-4 rounded-2xl bg-muted p-4">
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
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={log?.reaction === r.value}
                  disabled={busy}
                  onClick={() => onReact(r.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl border-2 py-3 text-xs font-bold transition-colors",
                    log?.reaction === r.value
                      ? "border-success bg-card text-foreground"
                      : "border-transparent bg-card/60 text-muted-foreground hover:bg-card",
                  )}
                >
                  <span className="text-3xl" aria-hidden>
                    {r.emoji}
                  </span>
                  {t(r.labelKey)}
                </button>
              ))}
            </div>
            {log?.reaction && <p className="mt-3 text-sm font-semibold text-secondary-foreground">{t("today.thanks")}</p>}
            <Button variant="ghost" size="sm" className="mt-2" disabled={busy} onClick={onUndo}>
              <RotateCcw aria-hidden />
              {t("today.undo")}
            </Button>
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
    </article>
  );
}
