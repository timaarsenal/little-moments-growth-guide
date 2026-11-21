import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export function Disclaimer({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <p className={cn("px-4 text-center text-xs leading-snug text-muted-foreground", className)}>
      {t("app.disclaimer")}
    </p>
  );
}
