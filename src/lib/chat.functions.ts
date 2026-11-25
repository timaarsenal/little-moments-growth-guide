import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { chatInputSchema, type ChatInput } from "./chat-input";

/** Serializable RPC compatibility; the visible chat consumes the streaming route. */
export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ChatInput) => chatInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { streamAssistant } = await import("./chat.server");
    return streamAssistant(data, context, () => {}, new AbortController().signal);
  });
