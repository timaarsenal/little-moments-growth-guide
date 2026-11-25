import { createFileRoute } from "@tanstack/react-router";

import type { ChatStreamEvent } from "@/lib/chat";
import { chatInputSchema } from "@/lib/chat-input";

/** Streams one assistant reply as newline-delimited JSON events; the caller's bearer token scopes every read and write. */
export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { authenticateChatRequest } = await import("@/lib/chat-auth.server");
        const auth = await authenticateChatRequest(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });
        const parsed = chatInputSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        const { streamAssistant } = await import("@/lib/chat.server");
        const encoder = new TextEncoder();
        const body = new ReadableStream<Uint8Array>({
          async start(controller) {
            const emit = (event: ChatStreamEvent) => {
              try { controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)); } catch { /* client gone */ }
            };
            try {
              await streamAssistant(parsed.data, auth, emit, request.signal);
            } catch (err) {
              console.error("[chat] request failed", err);
              emit({ type: "error" });
            } finally {
              try { controller.close(); } catch { /* already closed */ }
            }
          },
        });
        return new Response(body, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
      },
    },
  },
});
