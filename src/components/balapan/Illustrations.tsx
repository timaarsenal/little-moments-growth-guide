import type { Category, PlannedActivity } from "@/lib/types";
import type { Mood } from "@/lib/mood";
import { CATEGORY_STYLE } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { Ball, Beads, Blocks, Book, Creative, Emotions, Kitchen, Music, Obstacle, Water } from "@/components/illustrations";

/** Wide steppe landscape with a yurt and a little bird, drawn with theme tokens. */
export function SteppeArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden>
      <rect width="400" height="200" className="fill-steppe-sky" />
      <circle cx="330" cy="58" r="26" className="fill-steppe-sun" opacity="0.7" />
      <path d="M0 120 Q80 80 170 110 T400 95 V200 H0Z" className="fill-steppe-far" />
      <path d="M0 150 Q100 115 210 140 T400 130 V200 H0Z" className="fill-steppe-mid" />
      {/* yurt */}
      <g transform="translate(290 112)">
        <rect x="0" y="12" width="44" height="22" rx="3" className="fill-card" />
        <path d="M-4 14 Q22 -6 48 14Z" className="fill-card" />
        <path d="M-4 14 Q22 -6 48 14" fill="none" strokeWidth="2" className="stroke-warm" />
        <rect x="17" y="20" width="10" height="14" rx="2" className="fill-warm" />
        <rect x="4" y="20" width="36" height="2" className="fill-warm" opacity="0.6" />
      </g>
      <path d="M0 175 Q120 145 250 168 T400 160 V200 H0Z" className="fill-steppe-near" />
      {/* balapan bird */}
      <g transform="translate(60 128)">
        <ellipse cx="18" cy="26" rx="20" ry="18" className="fill-steppe-sun" />
        <circle cx="18" cy="8" r="12" className="fill-steppe-sun" />
        <circle cx="22" cy="6" r="2" className="fill-foreground" />
        <path d="M30 9 L37 11 L30 13Z" className="fill-warm" />
        <path d="M8 24 Q2 32 10 36" fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-warm" opacity="0.6" />
      </g>
    </svg>
  );
}

/** Hand-drawn face for the parent's mood buttons. */
export function MoodFace({ mood, className }: { mood: Mood; className?: string }) {
  const tone = mood === "good" ? "fill-primary-soft-2" : mood === "ok" ? "fill-steppe-sun" : "fill-warm";
  const mouth = mood === "good" ? "M14 26 Q20 32 26 26" : mood === "ok" ? "M14 27 H26" : "M14 29 Q20 23 26 29";
  return (
    <svg viewBox="0 0 40 40" className={cn("size-10", className)} aria-hidden>
      <circle cx="20" cy="20" r="18" className={tone} />
      {mood === "tired" ? (
        <>
          <path d="M11 16 Q14 18 17 16" fill="none" strokeWidth="2.2" strokeLinecap="round" className="stroke-foreground" />
          <path d="M23 16 Q26 18 29 16" fill="none" strokeWidth="2.2" strokeLinecap="round" className="stroke-foreground" />
        </>
      ) : (
        <>
          <circle cx="14" cy="17" r="2.2" className="fill-foreground" />
          <circle cx="26" cy="17" r="2.2" className="fill-foreground" />
        </>
      )}
      <path d={mouth} fill="none" strokeWidth="2.2" strokeLinecap="round" className="stroke-foreground" />
    </svg>
  );
}

type Art = (p: { className?: string; preserve?: string }) => React.JSX.Element;

const SQUARE: Record<Category, Art> = {
  speech: Book,
  gross_motor: Obstacle,
  fine_motor: Beads,
  creative_sensory: Creative,
  emotions_social: Emotions,
};

/** Picture by meaning: keywords in the activity title and materials (RU and KZ), category picture otherwise. */
const BY_WORDS: [Art, string[]][] = [
  [Water, ["вод", "купа", "ванн", "переливал", "шомыл", "мыльн"]],
  [Kitchen, ["круп", "кухн", "кастрюл", "ложк", "миск", "ас үй", "жарма", "тесто", "готов"]],
  [Beads, ["бус", "нанизыв", "шнур", "макарон", "моншақ", "прищеп", "пуговиц"]],
  [Blocks, ["кубик", "башн", "пирамид", "конструк", "текше", "мұнара", "сортер"]],
  [Music, ["песен", "песн", "музык", "танц", "ритм", "барабан", "колыбел", "тақпақ", "әуен", "би ", "орамал"]],
  [Book, ["книж", "книг", "сказк", "кітап", "ертегі", "картинк", "слов", "сөз"]],
  [Ball, ["мяч", "прогул", "гуля", "серуен", "площадк", "допты", "доп "]],
  [Obstacle, ["подушк", "препятств", "полос", "прыг", "ползт", "жастық", "кедерг", "секір"]],
  [Creative, ["рису", "краск", "лепк", "пластил", "мелк", "сурет", "бояу", "клей"]],
  [Emotions, ["эмоц", "обним", "кукл", "зеркал", "сезім", "қуырш", "айна", "чувств", "мишк"]],
];

export function artFor(activity: Pick<PlannedActivity, "category" | "title" | "materials">): Art {
  const text = ` ${activity.title} ${activity.materials.join(" ")} `.toLowerCase();
  return BY_WORDS.find(([, words]) => words.some((w) => text.includes(w)))?.[0] ?? SQUARE[activity.category];
}

/** Activity illustration: 64×64 square, or a full-width picture for the next activity. */
export function CategoryArt({ activity, wide = false, className }: { activity: Pick<PlannedActivity, "category" | "title" | "materials">; wide?: boolean; className?: string }) {
  const Art = artFor(activity);
  if (wide && Art === Obstacle) return <Obstacle preserve="xMidYMid slice" className={cn("block h-32 w-full", className)} />;
  if (wide) {
    const bg = CATEGORY_STYLE[activity.category].chip.split(" ")[0];
    return (
      <div className={cn("grid h-32 w-full place-items-center", bg, className)} aria-hidden>
        <Art className="size-28" />
      </div>
    );
  }
  if (Art === Obstacle) {
    return <div className={cn("size-16 shrink-0 overflow-hidden rounded-2xl", className)} aria-hidden><Obstacle preserve="xMidYMid slice" className="size-full" /></div>;
  }
  return <Art className={cn("size-16 shrink-0", className)} />;
}
