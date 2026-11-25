import { GatewayError, streamResponse } from "@lovable.dev/ai-gateway";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { parse } from "partial-json";
import { z } from "zod";
import { translate } from "@/i18n";
import { ageInMonths } from "./age";
import { readStoredPlan } from "./ai-plan";
import { CHAT_COLUMNS, toChatMessage, type ChatStreamEvent } from "./chat";
import type { ChatInput } from "./chat-input";
import { mentionsCrisis } from "./crisis";
import { lightenPlan } from "./light-plan";

const AI_TIMEOUT_MS = 45_000;
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

async function askAssistant(instructions: string, input: { role: "user" | "assistant"; content: string }[], emit: (event: ChatStreamEvent) => void, signal: AbortSignal) {
  try {
    const stream = await streamResponse({
      model: "openai/gpt-6-astra", instructions, input, reasoning: { effort: "low" },
      text: { format: { type: "json_schema", name: "assistant_reply", schema: REPLY_SCHEMA, strict: true } },
    }, { signal: AbortSignal.any([signal, AbortSignal.timeout(AI_TIMEOUT_MS)]) });
    let raw = "";
    let complete = false;
    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        raw += event.delta;
        try {
          const partial: unknown = parse(raw);
          const parsed = z.object({ reply: z.string() }).safeParse(partial);
          if (parsed.success) emit({ type: "text", text: parsed.data.reply });
        } catch { /* incomplete JSON: await the next delta */ }
      }
      if (event.type === "response.completed") complete = true;
    }
    if (!complete) return null;
    const parsed = replySchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch (err) {
    if (err instanceof GatewayError) console.error("[chat] AI unavailable", { code: err.code, status: err.httpStatus, ids: err.ids });
    else console.error("[chat] AI failed", err);
    return null;
  }
}

export async function streamAssistant(data: ChatInput, context: { supabase: SupabaseClient<Database>; userId: string }, emit: (event: ChatStreamEvent) => void, signal: AbortSignal) {
    const { supabase, userId } = context;
    const { text, lang, today, activity, threadId } = data;
    const { data: thread, error: threadError } = await supabase.from("chat_threads").select("id, activity_key").eq("id", threadId).eq("user_id", userId).maybeSingle();
    if (threadError || !thread) throw new Error("Unknown chat thread");

    const [profileRes, planRes, logsRes, moodRes, historyRes] = await Promise.all([
      supabase.from("child_profiles").select("birth_date, interests").maybeSingle(),
      supabase.from("daily_plans").select("source, activities").eq("plan_date", today).eq("language", "both").maybeSingle(),
      supabase.from("activity_logs").select("activity_key, title, status, reaction").eq("plan_date", today),
      supabase.from("parent_moods").select("mood").eq("mood_date", today).maybeSingle(),
      supabase
        .from("chat_messages")
        .select("role, content, activity_title")
        .eq("thread_id", threadId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
,
    ]);
    for (const res of [profileRes, planRes, logsRes, moodRes, historyRes]) {
      if (res.error) throw res.error;
    }

    const { data: userRow, error: userError } = await supabase
      .from("chat_messages")
      .insert({
        user_id: userId,
        thread_id: threadId,
        role: "user",
        content: text,
        activity_key: activity?.key ?? null,
        activity_title: activity?.title ?? null,
      })
      .select(CHAT_COLUMNS)
      .single();
    if (userError) throw userError;

    emit({ type: "user", message: toChatMessage(userRow) });
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
        activities: (moodRes.data?.mood === "tired" ? lightenPlan(plan?.items ?? []) : (plan?.items ?? [])).map((item) => ({
          title: item[lang].title,
          category: item.category,
          minutes: item.duration_min,
          time: item.start_time,
          result: logs.get(item.key)?.status ?? "not marked yet",
          child_reaction: logs.get(item.key)?.reaction ?? null,
        })),
      },
      thread_activity_key: thread.activity_key,
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
    const ai = crisis ? null : await askAssistant(instructions, input, emit, signal);
    if (signal.aborted) throw new Error("Cancelled");
    const showHelp = crisis || Boolean(ai?.needs_help);
    const content = ai?.reply ?? translate(lang, showHelp ? "assistant.fallbackHelp" : "assistant.fallback");

    const { data: assistantRow, error: assistantError } = await supabase
      .from("chat_messages")
      .insert({ user_id: userId, thread_id: threadId, role: "assistant", content, show_help: showHelp })
      .select(CHAT_COLUMNS)
      .single();
    if (assistantError) throw assistantError;

    const assistant = toChatMessage(assistantRow);
    emit({ type: "done", message: assistant });
    return { user: toChatMessage(userRow), assistant };

}
