import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import type { ChildProfile } from "./profile";
import { pickFromLibrary } from "./library";
import { ensureKazakh } from "./kazakh-fallback";
import { getTodayPlan } from "./plan.functions";
import { isWeekendDate, planSlots } from "./schedule";
import type { DayPlan, LogLite } from "./types";

/** Today's stored plan (shared by the Today and Assistant screens), with a library fallback if the server is unreachable. */
export function useTodayPlan(userId: string, today: string, profile: ChildProfile | null, history: LogLite[]) {
  const fetchPlan = useServerFn(getTodayPlan);
  return useQuery({
    queryKey: ["plan", userId, today],
    queryFn: async (): Promise<DayPlan> => {
      try {
        return await fetchPlan({ data: { today } });
      } catch (err) {
        console.error("[plan] plan request failed, using library", err);
        const slots = profile ? planSlots(profile, isWeekendDate(today)) : [];
        return { source: "library", items: ensureKazakh(pickFromLibrary(slots, history, `${userId}:${today}`), Boolean(profile?.bilingual), `${userId}:${today}`) };
      }
    },
    staleTime: Infinity,
    retry: false,
  });
}
