import type { PlanItem } from "./types";

/** Unique Kazakh words from Kazakh activities the family marked as done. */
export function kazakhWordsLearned(
  plans: { plan_date: string; items: PlanItem[] }[],
  done: { plan_date: string; activity_key: string; status: string }[],
): string[] {
  const doneKeys = new Set(done.filter((l) => l.status === "done").map((l) => `${l.plan_date}|${l.activity_key}`));
  const words = new Set<string>();
  for (const plan of plans) {
    for (const item of plan.items) {
      if (!item.kazakh || !doneKeys.has(`${plan.plan_date}|${item.key}`)) continue;
      for (const w of item.kz_words ?? []) words.add(w.kz.trim().toLowerCase());
    }
  }
  return [...words];
}
