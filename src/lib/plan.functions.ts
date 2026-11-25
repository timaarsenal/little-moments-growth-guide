import { createServerFn } from "@tanstack/react-start";
import { GatewayError, generateResponse } from "@lovable.dev/ai-gateway";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { ageInMonths, shiftISO } from "./age";
import { AI_INSTRUCTIONS, AI_PLAN_SCHEMA, buildAiInput, mergeWithLibrary, parseAiPlan, readStoredPlan, type PlanPrefs } from "./ai-plan";
import { DEFAULT_CITY, fetchWeather, formatTemp, isCity, weatherReason } from "./weather";
import { isWeekendDate, planSlots, type Slot } from "./schedule";
import type { DayPlan, LogLite } from "./types";

/** Stored plans hold both languages, so one row per day serves RU and KZ. */
const PLAN_LANGUAGE = "both";
const HISTORY_DAYS = 30;
const AI_TIMEOUT_MS = 60_000;

async function askAi(ageMonths: number, slots: Slot[], history: LogLite[], weekend: boolean, today: string, prefs: PlanPrefs) {
  try {
    const response = await generateResponse(
      {
        model: "openai/gpt-6-astra",
        instructions: AI_INSTRUCTIONS,
        input: buildAiInput(ageMonths, slots, history, weekend, prefs),
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", name: "day_plan", schema: AI_PLAN_SCHEMA, strict: true } },
      },
      { signal: AbortSignal.timeout(AI_TIMEOUT_MS) },
    );
    let raw = "";
    for (const item of response.output) {
      if (item.type !== "message") continue;
      for (const part of item.content) {
        if (part.type === "output_text") raw += part.text;
      }
    }
    const items = parseAiPlan(raw, slots, today, prefs);
    if (!items) console.error("[plan] AI returned an unusable plan", { status: response.status, id: response.id });
    return items;
  } catch (err) {
    if (err instanceof GatewayError) {
      console.error("[plan] AI unavailable, using library", { code: err.code, status: err.httpStatus, ids: err.ids });
    } else {
      console.error("[plan] AI call failed, using library", err);
    }
    return null;
  }
}

/**
 * Today's plan for the signed-in parent. Generated once per day (AI first, library fallback) and stored,
 * so the cards stay the same all day and across RU/KZ switches.
 */
export const getTodayPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { today: string }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.today)) throw new Error("Invalid date");
    return { today: input.today };
  })
  .handler(async ({ data, context }): Promise<DayPlan> => {
    const { supabase, userId } = context;
    const { today } = data;

    const readCached = async () => {
      const { data: row, error } = await supabase
        .from("daily_plans")
        .select("source, activities")
        .eq("plan_date", today)
        .eq("language", PLAN_LANGUAGE)
        .maybeSingle();
      if (error) throw error;
      return row ? readStoredPlan(row.source, row.activities) : null;
    };

    const cached = await readCached();
    if (cached) return cached;

    const { data: profile, error: profileError } = await supabase.from("child_profiles").select("*").maybeSingle();
    if (profileError) throw profileError;
    if (!profile) throw new Error("No child profile");

    const weekend = isWeekendDate(today);
    const slots = planSlots(profile, weekend);
    if (slots.length === 0) return { source: "library", items: [] };

    const { data: logs, error: logsError } = await supabase
      .from("activity_logs")
      .select("activity_key, title, category, status, reaction, plan_date")
      .gte("plan_date", shiftISO(today, -HISTORY_DAYS))
      .lt("plan_date", today)
      .order("plan_date", { ascending: false });
    if (logsError) throw logsError;

    let weather: string | null = null;
    try {
      const w = await fetchWeather(isCity(profile.city) ? profile.city : DEFAULT_CITY);
      const reason = weatherReason(w);
      if (reason) weather = `stay home: ${reason}, ${formatTemp(reason === "hot" ? w.max : w.min)}`;
    } catch (err) {
      console.error("[plan] weather unavailable", err);
    }
    const prefs: PlanPrefs = {
      interests: profile.interest_tags,
      customInterest: profile.interests.trim(),
      bilingual: profile.bilingual,
      weather,
    };
    const aiItems = await askAi(ageInMonths(profile.birth_date, today), slots, logs, weekend, today, prefs);
    const plan = mergeWithLibrary(slots, aiItems, logs, `${userId}:${today}`);

    // Keep the first stored plan if another request for the same day finished first.
    const { error: saveError } = await supabase.from("daily_plans").upsert(
      {
        user_id: userId,
        plan_date: today,
        language: PLAN_LANGUAGE,
        source: plan.source,
        activities: plan.items as unknown as Json,
      },
      { onConflict: "user_id,plan_date,language", ignoreDuplicates: true },
    );
    if (saveError) {
      console.error("[plan] could not store plan", saveError);
      return plan;
    }
    return (await readCached()) ?? plan;
  });
