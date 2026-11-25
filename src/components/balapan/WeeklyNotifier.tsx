import { useEffect } from "react";
import { useI18n } from "@/i18n";
import { weekIndex, weeklyNoticeKey } from "@/lib/weekly-notice";

export const NOTIFY_PREF = "balapan.weeklyNotify";
const SENT = "balapan.weeklySent";

/** Shows a system notification once per week when the app is opened and the parent allowed it. */
export function WeeklyNotifier({ months, name }: { months: number; name: string }) {
  const { t } = useI18n();
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (localStorage.getItem(NOTIFY_PREF) !== "on") return;
    const now = new Date();
    const wk = String(weekIndex(now));
    if (localStorage.getItem(SENT) === wk) return;
    localStorage.setItem(SENT, wk);
    try {
      new Notification(t("weekly.title"), { body: t(weeklyNoticeKey(months, now), { name }), icon: "/favicon.ico" });
    } catch { /* some mobile browsers only allow SW notifications */ }
  }, [months, name, t]);
  return null;
}
