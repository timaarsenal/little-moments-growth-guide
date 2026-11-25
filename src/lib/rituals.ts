import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { shiftISO } from "./age";

export const ANCHORS = ["wake", "meal", "nap", "bed"] as const;
export type Anchor = (typeof ANCHORS)[number];
export const isAnchor = (v: unknown): v is Anchor => typeof v === "string" && (ANCHORS as readonly string[]).includes(v);

export const RITUAL_TEMPLATES: { key: string; anchor: Anchor; minutes: number }[] = [
  { key: "morning_hug", anchor: "wake", minutes: 5 },
  { key: "walk_lunch", anchor: "meal", minutes: 20 },
  { key: "wash_hands", anchor: "meal", minutes: 3 },
  { key: "nap_story", anchor: "nap", minutes: 10 },
  { key: "bath_book_lullaby", anchor: "bed", minutes: 25 },
];

export type Ritual = Tables<"rituals">;
export type RitualCheckRow = Tables<"ritual_checks">;

export const ritualsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["rituals", userId],
    queryFn: async (): Promise<Ritual[]> => {
      const { data, error } = await supabase.from("rituals").select("*").eq("user_id", userId).order("created_at");
      if (error) throw error;
      return [...data].sort((a, b) => ANCHORS.indexOf(a.anchor as Anchor) - ANCHORS.indexOf(b.anchor as Anchor));
    },
  });

/** Ritual check-offs for the last `days` days up to `today`. */
export const ritualChecksQuery = (userId: string, today: string, days = 42) =>
  queryOptions({
    queryKey: ["ritual-checks", userId, today, days],
    queryFn: async (): Promise<RitualCheckRow[]> => {
      const { data, error } = await supabase
        .from("ritual_checks")
        .select("*")
        .eq("user_id", userId)
        .gte("check_date", shiftISO(today, -days))
        .lte("check_date", today);
      if (error) throw error;
      return data;
    },
  });

export function ritualTitle(r: Pick<Ritual, "template_key" | "title">, t: (k: string) => string) {
  return r.template_key ? t(`rituals.t.${r.template_key}`) : r.title;
}
