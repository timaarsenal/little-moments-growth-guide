import type { KazakhWord, LocalizedText, PlanItem } from "./types";

interface KazakhActivity {
  id: string;
  duration_min: number;
  words: KazakhWord[];
  ru: LocalizedText;
  kz: LocalizedText;
}

/** Built-in Kazakh-language activities used when the AI is unavailable or gave none for a bilingual family. */
export const KAZAKH_LIBRARY: KazakhActivity[] = [
  {
    id: "kz-01",
    duration_min: 10,
    words: [{ kz: "алма", ru: "яблоко" }, { kz: "доп", ru: "мяч" }, { kz: "мысық", ru: "кошка" }],
    ru: {
      title: "Казахские слова: игрушки и фрукты",
      why: "Ребёнок слышит казахские слова рядом с предметом и запоминает их.",
      steps: ["Положите рядом яблоко, мяч и игрушечную кошку.", "Покажите на яблоко: «алма (яблоко)», повторите 2–3 раза.", "Так же назовите «доп (мяч)» и «мысық (кошка)».", "Попросите: «Алманы бер» — «дай яблоко», и похвалите."],
      materials: ["Яблоко", "Мяч", "Мягкая игрушка-кошка"],
    },
    kz: {
      title: "Қазақша сөздер: ойыншықтар мен жемістер",
      why: "Бала заттың қасында сөзді естіп, есте сақтайды.",
      steps: ["Алма, доп және ойыншық мысықты қатар қойыңыз.", "Алманы көрсетіп: «алма» деп 2–3 рет қайталаңыз.", "Дәл солай «доп» пен «мысық» деп атаңыз.", "«Алманы бер» деп сұрап, баланы мақтаңыз."],
      materials: ["Алма", "Доп", "Жұмсақ ойыншық мысық"],
    },
  },
  {
    id: "kz-02",
    duration_min: 5,
    words: [{ kz: "қол", ru: "рука" }, { kz: "көз", ru: "глаз" }, { kz: "мұрын", ru: "нос" }],
    ru: {
      title: "Тақпақ «Қолым, көзім, мұрным»",
      why: "Ритм и показ частей тела помогают запомнить казахские слова.",
      steps: ["Сядьте лицом к ребёнку.", "Покажите на руку: «қол (рука)», на глаза: «көз (глаз)», на нос: «мұрын (нос)».", "Повторите нараспев несколько раз.", "Предложите малышу показать вместе с вами."],
      materials: [],
    },
    kz: {
      title: "Тақпақ «Қолым, көзім, мұрным»",
      why: "Ырғақ пен дене мүшелерін көрсету қазақша сөздерді есте сақтауға көмектеседі.",
      steps: ["Баламен бетпе-бет отырыңыз.", "Қолды көрсетіп «қол», көзді «көз», мұрынды «мұрын» деңіз.", "Әндетіп бірнеше рет қайталаңыз.", "Баладан бірге көрсетуін сұраңыз."],
      materials: [],
    },
  },
  {
    id: "kz-03",
    duration_min: 10,
    words: [{ kz: "қызыл", ru: "красный" }, { kz: "көк", ru: "синий" }, { kz: "сары", ru: "жёлтый" }],
    ru: {
      title: "Цвета по-казахски",
      why: "Ребёнок учит казахские названия цветов во время игры с кубиками.",
      steps: ["Возьмите крупные кубики трёх цветов.", "Называйте: «қызыл (красный)», «көк (синий)», «сары (жёлтый)».", "Попросите дать кубик нужного цвета.", "Постройте вместе башню, называя цвета."],
      materials: ["Крупные кубики"],
    },
    kz: {
      title: "Қазақша түстер",
      why: "Бала текшелермен ойнай отырып, түстердің атын үйренеді.",
      steps: ["Үш түсті ірі текшелерді алыңыз.", "«Қызыл», «көк», «сары» деп атаңыз.", "Керекті түсті текшені беруін сұраңыз.", "Түстерді атай отырып, бірге мұнара құрыңыз."],
      materials: ["Ірі текшелер"],
    },
  },
  {
    id: "kz-04",
    duration_min: 10,
    words: [{ kz: "орамал", ru: "платок" }, { kz: "тығыл", ru: "прячься" }, { kz: "мінеки", ru: "вот" }],
    ru: {
      title: "Народная игра «Орамал» (прятки с платком)",
      why: "Простая казахская игра учит словам и радует общением.",
      steps: ["Возьмите лёгкий платок — «орамал (платок)».", "Накройте игрушку и скажите: «Қайда? (где?)».", "Снимите платок: «Мінеки! (вот!)».", "Дайте ребёнку спрятать игрушку самому."],
      materials: ["Лёгкий платок", "Игрушка"],
    },
    kz: {
      title: "«Орамал» халық ойыны",
      why: "Қарапайым қазақ ойыны сөз үйретеді және қарым-қатынасқа қуаныш сыйлайды.",
      steps: ["Жеңіл орамал алыңыз.", "Ойыншықты жауып: «Қайда?» деңіз.", "Орамалды ашып: «Мінеки!» деңіз.", "Ойыншықты баланың өзі тығуына мүмкіндік беріңіз."],
      materials: ["Жеңіл орамал", "Ойыншық"],
    },
  },
];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Bilingual family with no Kazakh activity in the plan: swap one card (a speech card if any, else the first)
 * for a calm built-in Kazakh activity at the same time. Other families' plans are returned unchanged.
 */
export function ensureKazakh(items: PlanItem[], bilingual: boolean, seed: string): PlanItem[] {
  if (!bilingual || items.length === 0 || items.some((i) => i.kazakh)) return items;
  const idx = Math.max(0, items.findIndex((i) => i.category === "speech"));
  const target = items[idx];
  const pick = KAZAKH_LIBRARY[hash(seed) % KAZAKH_LIBRARY.length];
  if (!target || !pick) return items;
  const swapped: PlanItem = {
    key: `lib:${pick.id}`,
    category: "speech",
    duration_min: Math.min(pick.duration_min, target.duration_min),
    window: target.window,
    start_time: target.start_time,
    kazakh: true,
    kz_words: pick.words,
    ru: pick.ru,
    kz: pick.kz,
  };
  return items.map((it, i) => (i === idx ? swapped : it));
}
