import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  activity_title: string | null;
  show_help: boolean;
  created_at: string;
}

/** How many recent messages the chat screen shows and the model sees. */
export const CHAT_SCREEN_LIMIT = 200;
export const CHAT_MODEL_HISTORY = 30;

export const CHAT_COLUMNS = "id, role, content, activity_title, show_help, created_at";

export function toChatMessage(row: {
  id: string;
  role: string;
  content: string;
  activity_title: string | null;
  show_help: boolean;
  created_at: string;
}): ChatMessage {
  return { ...row, role: row.role === "user" ? "user" : "assistant" };
}

export type ChatThread = Tables<"chat_threads">;

export const threadsQuery = (userId: string) => queryOptions({
  queryKey: ["threads", userId],
  queryFn: async () => {
    const { data, error } = await supabase.from("chat_threads").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const threadQuery = (userId: string, threadId: string) => queryOptions({
  queryKey: ["thread", userId, threadId],
  queryFn: async () => {
    const { data, error } = await supabase.from("chat_threads").select("*").eq("user_id", userId).eq("id", threadId).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export async function createChatThread(userId: string, title: string, activityKey: string | null = null) {
  const { data, error } = await supabase.from("chat_threads").insert({ user_id: userId, title: title.slice(0, 160), activity_key: activityKey }).select("*").single();
  if (error) throw error;
  return data;
}

export type ChatStreamEvent =
  | { type: "user"; message: ChatMessage }
  | { type: "text"; text: string }
  | { type: "done"; message: ChatMessage }
  | { type: "error" };

export const chatQuery = (userId: string, threadId: string) =>
  queryOptions({
    queryKey: ["chat", userId, threadId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(CHAT_COLUMNS)
        .eq("user_id", userId)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: false })
        .limit(CHAT_SCREEN_LIMIT);
      if (error) throw error;
      return data.map(toChatMessage).reverse();
    },
  });
