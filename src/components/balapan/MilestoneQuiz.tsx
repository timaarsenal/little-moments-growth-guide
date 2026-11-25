import { Stethoscope } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { shouldDiscuss, type Milestone, type MilestoneStatus } from "@/lib/milestones";

type Props = {
  name: string;
  months: number;
  items: Milestone[];
  checks: Map<string, MilestoneStatus>;
  onAnswer: (id: string, status: MilestoneStatus | null) => void;
  onFinish: () => void;
};

/** One question at a time; answers feed the AI planner. */
export function MilestoneQuiz({ name, months, items, checks, onAnswer, onFinish }: Props) {
  const { t, lang } = useI18n();
  const [queue, setQueue] = useState<Milestone[] | null>(null);
  const [idx, setIdx] = useState(0);
  const unanswered = items.filter((m) => !checks.has(m.id));
  const notYet = items.filter((m) => checks.get(m.id) === "not_yet");
  const yes = items.filter((m) => checks.get(m.id) === "yes").length;

  const start = (list: Milestone[]) => { setQueue(list); setIdx(0); };
  const next = () => {
    if (!queue) return;
    if (idx + 1 >= queue.length) { setQueue(null); onFinish(); } else setIdx(idx + 1);
  };

  if (queue && queue[idx]) {
    const m = queue[idx];
    return (
      <div className="mt-4 rounded-3xl border border-border bg-card p-5">
        <p className="text-sm font-bold text-muted-foreground">{t("quiz.question", { n: idx + 1, total: queue.length })}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((idx + 1) / queue.length) * 100}%` }} />
        </div>
        <p className="mt-4 min-h-14 text-xl font-extrabold">{m[lang]}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button size="lg" onClick={() => { onAnswer(m.id, "yes"); next(); }}>{t("flags.can")}</Button>
          <Button size="lg" variant="soft" onClick={() => { onAnswer(m.id, "not_yet"); next(); }}>{t("flags.notYet")}</Button>
        </div>
        <div className="mt-2 flex justify-between">
          <Button variant="ghost" size="sm" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>{t("quiz.back")}</Button>
          <Button variant="ghost" size="sm" onClick={next}>{t("quiz.skip")}</Button>
        </div>
        <a href={m.source.split(" ").pop()} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-muted-foreground underline">{t("progress.source")}: CDC</a>
      </div>
    );
  }

  const answered = items.length - unanswered.length;
  return (
    <div className="mt-4 rounded-3xl border border-border bg-card p-5">
      <h3 className="text-lg font-extrabold">{answered ? t("quiz.doneTitle") : t("quiz.title", { name })}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {answered ? t("quiz.doneText", { yes, notYet: notYet.length }) : t("quiz.intro")}
      </p>
      {notYet.length > 0 && (
        <>
          <p className="mt-4 text-sm font-bold">{t("quiz.learning")}</p>
          <ul className="mt-2 space-y-2">
            {notYet.map((m) => (
              <li key={m.id} className="rounded-2xl bg-muted/60 p-3 text-sm font-semibold">
                {m[lang]}
                {shouldDiscuss(m, "not_yet", months) && (
                  <div className="mt-2 rounded-2xl bg-accent p-3 text-accent-foreground" role="note">
                    <p className="text-sm font-semibold">{t("flags.calm")}</p>
                    <Button size="sm" variant="outline" className="mt-2" disabled>
                      <Stethoscope aria-hidden />
                      {t("flags.consult")}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{t("flags.soon")}</span>
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-4 grid gap-2">
        {unanswered.length > 0 && (
          <Button size="lg" onClick={() => start(unanswered)}>{answered ? t("quiz.continue") : t("quiz.start")}</Button>
        )}
        {answered > 0 && <Button size="lg" variant="soft" onClick={() => start(items)}>{t("quiz.redo")}</Button>}
      </div>
    </div>
  );
}
