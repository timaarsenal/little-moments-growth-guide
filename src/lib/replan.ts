import type { QueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { localTodayISO } from "./age";

/** Profile inputs changed: drop today's stored plan so it is picked again with the new settings. */
export async function replanToday(userId: string, queryClient: QueryClient) {
  const { error } = await supabase.from("daily_plans").delete().eq("user_id", userId).eq("plan_date", localTodayISO());
  if (error) throw error;
  queryClient.removeQueries({ queryKey: ["plan"] });
}
