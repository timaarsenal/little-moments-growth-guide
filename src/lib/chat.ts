import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

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

export const chatQuery = (userId: string) =>
  queryOptions({
    queryKey: ["chat", userId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(CHAT_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(CHAT_SCREEN_LIMIT);
      if (error) throw error;
      return data.map(toChatMessage).reverse();
    },
  });
