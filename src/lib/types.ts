export const CATEGORIES = [
  "speech",
  "gross_motor",
  "fine_motor",
  "creative_sensory",
  "emotions_social",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Lang = "ru" | "kz";
export type WindowKind = "morning" | "evening" | "weekend";
export type Reaction = "liked" | "ok" | "disliked";

export interface PlannedActivity {
  key: string;
  title: string;
  category: Category;
  duration_min: number;
  why: string;
  steps: string[];
  materials: string[];
  window: WindowKind;
  start_time: string;
}

export interface TodayPlan {
  status: "ok";
  source: "ai" | "library";
  language: Lang;
  activities: PlannedActivity[];
}

export interface LogLite {
  activity_key: string;
  title: string;
  category: string;
  status: string;
  reaction: string | null;
  plan_date: string;
}

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}
