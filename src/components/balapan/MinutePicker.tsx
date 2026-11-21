import { useI18n } from "@/i18n";
import { MINUTE_OPTIONS } from "@/lib/profile";
import { cn } from "@/lib/utils";

export function MinutePicker({
  label,
  emoji,
  value,
  onChange,
}: {
  label: string;
  emoji: string;
  value: number;
  onChange: (minutes: number) => void;
}) {
  const { t } = useI18n();
  return (
    <fieldset className="rounded-3xl bg-card p-4 shadow-soft">
      <legend className="sr-only">{label}</legend>
      <div className="mb-3 flex items-center gap-2" aria-hidden>
        <span className="text-2xl">{emoji}</span>
        <span className="text-lg font-bold">{label}</span>
      </div>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-4 gap-2">
        {MINUTE_OPTIONS.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={value === m}
            onClick={() => onChange(m)}
            className={cn(
              "h-12 rounded-2xl text-sm font-bold transition-colors",
              value === m
                ? "bg-primary text-primary-foreground shadow-lift"
                : "bg-muted text-foreground hover:bg-primary-soft",
            )}
          >
            {m === 0 ? t("onboarding.none") : t("common.minutes", { n: m })}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
