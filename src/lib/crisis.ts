/**
 * Safety net for the assistant: phrases (RU/KZ) about severe exhaustion, despair or self-harm.
 * When one matches, the chat shows the "Where to get help" button even if the model missed it.
 */
const PHRASES = [
  // Russian
  "навредить себе",
  "причинить себе вред",
  "покончить с собой",
  "покончу с собой",
  "убить себя",
  "убью себя",
  "суицид",
  "не хочу жить",
  "жить не хочу",
  "жить не хочется",
  "нет смысла жить",
  "лучше бы меня не было",
  "исчезнуть навсегда",
  "нет сил",
  "сил больше нет",
  "сил не осталось",
  "больше не могу",
  "не выдерживаю",
  "отчаяни",
  "отчаялась",
  "отчаялся",
  "безнадежн",
  // Kazakh
  "өзіме зиян",
  "өзімді өлтір",
  "өзіме қол жұмса",
  "өмір сүргім келмейді",
  "өмір сүргім келмей",
  "өлгім келеді",
  "күшім жоқ",
  "күшім қалмады",
  "шыдай алмаймын",
  "үмітсіз",
  "түңілдім",
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

export function mentionsCrisis(text: string): boolean {
  const t = normalize(text);
  return PHRASES.some((p) => t.includes(p));
}
