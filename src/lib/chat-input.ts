import { z } from "zod";
import { CATEGORIES } from "./types";

export const chatInputSchema = z.object({
  threadId: z.string().uuid(),
  text: z.string().trim().min(1).max(2000),
  lang: z.enum(["ru", "kz"]),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activity: z.object({
    key: z.string().max(120), title: z.string().max(160), category: z.enum(CATEGORIES),
    duration_min: z.number().int().min(1).max(60), why: z.string().max(500),
    steps: z.array(z.string().max(500)).max(10), materials: z.array(z.string().max(120)).max(10),
  }).nullable(),
});
export type ChatInput = z.infer<typeof chatInputSchema>;