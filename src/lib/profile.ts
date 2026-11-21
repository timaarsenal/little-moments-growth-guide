import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ChildProfile = Tables<"child_profiles">;

export const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 30, 45, 60] as const;

/** The signed-in parent's child profile, or null before onboarding. RLS limits rows to the owner. */
export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async (): Promise<ChildProfile | null> => {
    const { data, error } = await supabase.from("child_profiles").select("*").maybeSingle();
    if (error) throw error;
    return data;
  },
});
