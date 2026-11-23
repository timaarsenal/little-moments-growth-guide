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

export interface LocalizedText {
  title: string;
  why: string;
  steps: string[];
  materials: string[];
}

/** One planned activity with both languages, so switching RU/KZ never changes the day's plan. */
export interface PlanItem {
  key: string;
  category: Category;
  duration_min: number;
  window: WindowKind;
  start_time: string;
  ru: LocalizedText;
  kz: LocalizedText;
}

export interface DayPlan {
  source: "ai" | "library";
  items: PlanItem[];
}

export function localize(item: PlanItem, lang: Lang): PlannedActivity {
  const text = item[lang];
  return {
    key: item.key,
    category: item.category,
    duration_min: item.duration_min,
    window: item.window,
    start_time: item.start_time,
    title: text.title,
    why: text.why,
    steps: text.steps,
    materials: text.materials,
  };
}
