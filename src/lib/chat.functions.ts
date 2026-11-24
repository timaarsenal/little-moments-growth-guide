import { createServerFn } from "@tanstack/react-start";
import { GatewayError, generateResponse } from "@lovable.dev/ai-gateway";
import { z } from "zod";

import { translate } from "@/i18n";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ageInMonths } from "./age";
import { readStoredPlan } from "./ai-plan";
import { CHAT_COLUMNS, CHAT_MODEL_HISTORY, toChatMessage, type ChatMessage } from "./chat";
import { mentionsCrisis } from "./crisis";
import { CATEGORIES } from "./types";

const AI_TIMEOUT_MS = 45_000;

const activitySchema = z.object({
  key: z.string().max(120),
  title: z.string().max(160),
  category: z.enum(CATEGORIES),
  duration_min: z.number().int().min(1).max(60),
  why: z.string().max(500),
  steps: z.array(z.string().max(500)).max(10),
  materials: z.array(z.string().max(120)).max(10),
});

const inputSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  lang: z.enum(["ru", "kz"]),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activity: activitySchema.nullable(),
});

const REPLY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "needs_help"],
  properties: {
    reply: { type: "string" },
    needs_help: { type: "boolean" },
  },
} as const;

const replySchema = z.object({ reply: z.string().trim().min(1).max(4000), needs_help: z.boolean() });

const INSTRUCTIONS = `You are the Balapan assistant: a warm, supportive helper for busy parents of toddlers aged 1–3.
Style:
- Reply in LANGUAGE only. Be warm and brief: 2–5 short sentences, or a short list of up to 4 items when steps help.
- Use the context: the child's age in months, interests, today's activities with their results and the parent's mood. Never invent facts that are not in the context.
- Ideas must be safe and age-appropriate: an adult always supervises; no small objects a child under 3 could choke on; no screens.
- Never shame or blame the parent. Praise effort, normalise tiredness and skipped activities.
- You are not a doctor: give no diagnoses or medication advice. For health or development worries, gently suggest seeing a pediatrician.
Safety (most important):
- If the parent describes severe exhaustion, despair, hopelessness, thoughts of harming themselves, or fear of harming the child: do NOT give therapy or long advice. Acknowledge their feelings in 2–3 gentle sentences, say they are not alone, softly recommend talking to a doctor or psychologist (or someone they trust), mention 112 if there is immediate danger, and set needs_help to true.
- Otherwise set needs_help to false.
Output JSON: { "reply": string, "needs_help": boolean }.`;

async function askAssistant(instructions: string, input: { role: "user" | "assistant"; content: string }[]) {
  try {
    const response = await generateResponse(
      {
        model: "openai/gpt-6-astra",
        instructions,
        input,
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", name: "assistant_reply", schema: REPLY_SCHEMA, strict: true } },
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
    const parsed = replySchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.error("[chat] unusable AI reply", { id: response.id, status: response.status });
      return null;
    }
    return parsed.data;
  } catch (err) {
    if (err instanceof GatewayError) {
      console.error("[chat] AI unavailable", { code: err.code, status: err.httpStatus, ids: err.ids });
    } else {
      console.error("[chat] AI call failed", err);
    }
    return null;
  }
}

/** Save the parent's message, ask the assistant with the child's context, save and return both messages. */
export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: z.input<typeof inputSchema>) => inputSchema.parse(raw))
  .handler(async ({ data, context }): Promise<{ user: ChatMessage; assistant: ChatMessage }> => {
    const { supabase, userId } = context;
    const { text, lang, today, activity } = data;

    const [profileRes, planRes, logsRes, moodRes, historyRes] = await Promise.all([
      supabase.from("child_profiles").select("birth_date, interests").maybeSingle(),
      supabase.from("daily_plans").select("source, activities").eq("plan_date", today).eq("language", "both").maybeSingle(),
      supabase.from("activity_logs").select("activity_key, title, status, reaction").eq("plan_date", today),
      supabase.from("parent_moods").select("mood").eq("mood_date", today).maybeSingle(),
      supabase
        .from("chat_messages")
        .select("role, content, activity_title")
        .order("created_at", { ascending: false })
        .limit(CHAT_MODEL_HISTORY),
    ]);
    for (const res of [profileRes, planRes, logsRes, moodRes, historyRes]) {
      if (res.error) throw res.error;
    }

    const { data: userRow, error: userError } = await supabase
      .from("chat_messages")
      .insert({
        user_id: userId,
        role: "user",
        content: text,
        activity_key: activity?.key ?? null,
        activity_title: activity?.title ?? null,
      })
      .select(CHAT_COLUMNS)
      .single();
    if (userError) throw userError;

    const plan = planRes.data ? readStoredPlan(planRes.data.source, planRes.data.activities) : null;
    const logs = new Map((logsRes.data ?? []).map((l) => [l.activity_key, l]));
    const contextJson = JSON.stringify({
      child: profileRes.data
        ? {
            age_months: ageInMonths(profileRes.data.birth_date, today),
            interests: profileRes.data.interests || "not specified",
          }
        : null,
      today: {
        date: today,
        parent_mood: moodRes.data?.mood ?? "not asked",
        activities: (plan?.items ?? []).map((item) => ({
          title: item[lang].title,
          category: item.category,
          minutes: item.duration_min,
          time: item.start_time,
          result: logs.get(item.key)?.status ?? "not marked yet",
          child_reaction: logs.get(item.key)?.reaction ?? null,
        })),
      },
      parent_is_asking_about_activity: activity
        ? {
            title: activity.title,
            category: activity.category,
            minutes: activity.duration_min,
            why: activity.why,
            steps: activity.steps,
            materials: activity.materials,
            result: logs.get(activity.key)?.status ?? "not marked yet",
            child_reaction: logs.get(activity.key)?.reaction ?? null,
          }
        : null,
    });
    const language = lang === "kz" ? "Kazakh (Cyrillic script)" : "Russian";
    const instructions = `${INSTRUCTIONS.replace("LANGUAGE", language)}\n\nContext (JSON):\n${contextJson}`;

    const history = [...(historyRes.data ?? [])].reverse().map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.role === "user" && m.activity_title ? `[about activity: ${m.activity_title}] ${m.content}` : m.content,
    }));
    const input = [
      ...history,
      { role: "user" as const, content: activity ? `[about activity: ${activity.title}] ${text}` : text },
    ];

    const crisis = mentionsCrisis(text);
    const ai = await askAssistant(instructions, input);
    const showHelp = crisis || Boolean(ai?.needs_help);
    const content = ai?.reply ?? translate(lang, showHelp ? "assistant.fallbackHelp" : "assistant.fallback");

    const { data: assistantRow, error: assistantError } = await supabase
      .from("chat_messages")
      .insert({ user_id: userId, role: "assistant", content, show_help: showHelp })
      .select(CHAT_COLUMNS)
      .single();
    if (assistantError) throw assistantError;

    return { user: toChatMessage(userRow), assistant: toChatMessage(assistantRow) };
  });
