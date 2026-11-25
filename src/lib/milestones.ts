import raw from "@/data/milestones.json";

export interface Milestone {
  id: string;
  age_months: number;
  area: string;
  ru: string;
  kz: string;
  source: string;
  isRedFlag: boolean;
  discuss_after_months: number;
}
export type MilestoneStatus = "yes" | "not_yet";

export const MILESTONES: Milestone[] = raw.items;

/** Age groups shown for a child: every group up to their age (at least the first). */
export function groupsForAge(ageMonths: number): number[] {
  const groups = [...new Set(MILESTONES.map((m) => m.age_months))].sort((a, b) => a - b);
  const upTo = groups.filter((g) => g <= ageMonths);
  return upTo.length ? upTo : groups.slice(0, 1);
}

/** Show the calm "discuss with the pediatrician" note: a key skill marked "not yet" past its age. */
export function shouldDiscuss(m: Milestone, status: MilestoneStatus | undefined, ageMonths: number): boolean {
  return m.isRedFlag && status === "not_yet" && ageMonths >= m.discuss_after_months;
}
