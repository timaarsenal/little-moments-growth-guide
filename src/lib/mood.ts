import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const MOODS = ["good", "ok", "tired"] as const;
export type Mood = (typeof MOODS)[number];

export function isMood(value: unknown): value is Mood {
  return typeof value === "string" && (MOODS as readonly string[]).includes(value);
}

/** The parent's answer to "How are you today?" for one day, or null when not asked yet. */
export const moodQuery = (userId: string, day: string) =>
  queryOptions({
    queryKey: ["mood", userId, day],
    queryFn: async (): Promise<Mood | null> => {
      const { data, error } = await supabase.from("parent_moods").select("mood").eq("mood_date", day).maybeSingle();
      if (error) throw error;
      return isMood(data?.mood) ? data.mood : null;
    },
  });
