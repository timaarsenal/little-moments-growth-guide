import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { shiftISO } from "./age";
import type { LogLite } from "./types";

export const HISTORY_DAYS = 30;

/** The parent's activity marks for the last 30 days up to and including `today`. */
export const logsQuery = (userId: string, today: string) =>
  queryOptions({
    queryKey: ["logs", userId, today],
    queryFn: async (): Promise<LogLite[]> => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("activity_key, title, category, status, reaction, plan_date")
        .gte("plan_date", shiftISO(today, -HISTORY_DAYS))
        .lte("plan_date", today)
        .order("plan_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
