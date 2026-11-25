// Default thread names are stored in the language used at creation; show them in the current one.
const DEFAULT_TITLES = new Set(["Новая переписка", "Жаңа хат алмасу", "Новый чат", "Жаңа чат"]);
export function threadTitle(title: string | null, t: (k: string) => string): string {
  return !title || DEFAULT_TITLES.has(title.trim()) ? t("assistant.untitled") : title;
}
