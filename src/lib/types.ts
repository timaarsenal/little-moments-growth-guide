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
  kazakh?: boolean;
  kz_words?: KazakhWord[];
  interests?: string[];
  /** Set when an outdoor activity was swapped for a home game because of the weather. */
  movedIndoors?: boolean;
  /** Grains, small objects or water: show "only with an adult". */
  supervised?: boolean;
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
export const BASE_INTERESTS = ["cars", "animals", "music", "ball", "books", "water", "blocks", "dolls"] as const;
/** Extra interest ideas per age band (months, upper bound exclusive), offered in the profile as "more options". */
export const EXTRA_INTERESTS = [
  { maxMonths: 6, tags: ["faces", "rattles", "songs", "contrast", "tummy", "massage"] },
  { maxMonths: 12, tags: ["peekaboo", "crawling", "pyramids", "clapping", "bathing", "rustling"] },
  { maxMonths: 24, tags: ["pushcars", "pouring", "climbing", "fingerplay", "dancing", "hideseek"] },
  { maxMonths: Infinity, tags: ["drawing", "modeling", "gymnastics", "household", "roleplay", "sand", "puzzles", "scooter", "nature", "stickers"] },
] as const;
export const INTEREST_TAGS = [...BASE_INTERESTS, ...EXTRA_INTERESTS.flatMap((b) => b.tags)] as const;
export function extraInterestsFor(months: number): readonly string[] {
  return (EXTRA_INTERESTS.find((b) => months < b.maxMonths) ?? EXTRA_INTERESTS[EXTRA_INTERESTS.length - 1]!).tags;
}
export type InterestTag = (typeof INTEREST_TAGS)[number];

export interface KazakhWord {
  kz: string;
  ru: string;
}

export interface PlanItem {
  key: string;
  /** Happens outside; swapped for a home game in bad weather. */
  outdoor?: boolean;
  /** A Kazakh-language activity for bilingual families. */
  kazakh?: boolean;
  kz_words?: KazakhWord[];
  /** Child interests the activity is built around. */
  interests?: string[];
  movedIndoors?: boolean;
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
    ...(item.kazakh ? { kazakh: true } : {}),
    ...(item.kz_words?.length ? { kz_words: item.kz_words } : {}),
    ...(item.interests?.length ? { interests: item.interests } : {}),
    ...(item.movedIndoors ? { movedIndoors: true } : {}),
    ...(SUPERVISE_RE.test([item.ru.title, ...item.ru.steps, ...item.ru.materials].join(" ")) ? { supervised: true } : {}),
  };
}

const SUPERVISE_RE = /круп|греч|рис[ау ]|фасол|горох|макарон|бусин|пуговиц|мелк|вод[аыуе]|водич|ванн|бассейн/i;
