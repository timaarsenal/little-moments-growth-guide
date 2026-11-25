import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { shiftISO } from "./age";
import { readStoredPlan } from "./ai-plan";
import type { PlanItem } from "./types";

export const STATS_WEEKS = 6;

/** Activity marks for the last STATS_WEEKS weeks (with minutes) plus the last 7 days of stored plans. */
export const statsQuery = (userId: string, today: string) =>
  queryOptions({
    queryKey: ["stats", userId, today],
    queryFn: async () => {
      const [logs, plans] = await Promise.all([
        supabase
          .from("activity_logs")
          .select("plan_date, status, duration_min, category, activity_key")
          .eq("user_id", userId)
          .gte("plan_date", shiftISO(today, -(STATS_WEEKS * 7)))
          .lte("plan_date", today),
        supabase.from("daily_plans").select("plan_date, source, activities").eq("user_id", userId).gte("plan_date", shiftISO(today, -6)).lte("plan_date", today),
      ]);
      if (logs.error) throw logs.error;
      if (plans.error) throw plans.error;
      return {
        logs: logs.data,
        plans: plans.data.flatMap((p): { plan_date: string; items: PlanItem[] }[] => {
          const plan = readStoredPlan(p.source, p.activities);
          return plan ? [{ plan_date: p.plan_date, items: plan.items }] : [];
        }),
      };
    },
  });
