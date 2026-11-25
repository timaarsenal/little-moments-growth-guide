import { Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { shareWeeklyCard, weeklyCardImage } from "@/lib/share-card";

/** Weekly recap card: "You spent N minutes of development with your child this week" + share as a picture. */
export function WeeklySummary({ minutes }: { minutes: number }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  async function share() {
    setBusy(true);
    try {
      const blob = await weeklyCardImage(t("minutes.summaryTitle"), t("minutes.summary", { n: minutes }), minutes);
      await shareWeeklyCard(blob, t("minutes.shareText", { n: minutes }));
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) toast.error(t("common.error", { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-3xl bg-primary-soft p-5 shadow-soft">
      <p className="text-sm font-bold uppercase tracking-wide text-primary">{t("minutes.summaryTitle")}</p>
      <p className="mt-2 text-xl font-bold">{t("minutes.summary", { n: minutes })}</p>
      <Button className="mt-4" onClick={() => void share()} disabled={busy}>
        <Share2 aria-hidden />
        {t("minutes.share")}
      </Button>
    </section>
  );
}
