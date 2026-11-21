import { useI18n } from "@/i18n";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Lang; label: string }[] = [
  { value: "ru", label: "RU" },
  { value: "kz", label: "KZ" },
];

export function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div role="radiogroup" aria-label="Язык / Тіл" className="flex rounded-full bg-muted p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={lang === o.value}
          onClick={() => setLang(o.value)}
          className={cn(
            "h-9 min-w-11 rounded-full px-3 text-sm font-extrabold transition-colors",
            lang === o.value ? "bg-card text-primary shadow-soft" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
