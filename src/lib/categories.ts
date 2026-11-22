import { Footprints, Hand, Heart, MessageCircle, Palette, type LucideIcon } from "lucide-react";

import type { Category } from "./types";

export const CATEGORY_STYLE: Record<Category, { Icon: LucideIcon; chip: string; bar: string }> = {
  speech: { Icon: MessageCircle, chip: "bg-cat-speech text-cat-speech-foreground", bar: "bg-cat-speech-foreground" },
  gross_motor: { Icon: Footprints, chip: "bg-cat-gross text-cat-gross-foreground", bar: "bg-cat-gross-foreground" },
  fine_motor: { Icon: Hand, chip: "bg-cat-fine text-cat-fine-foreground", bar: "bg-cat-fine-foreground" },
  creative_sensory: { Icon: Palette, chip: "bg-cat-creative text-cat-creative-foreground", bar: "bg-cat-creative-foreground" },
  emotions_social: { Icon: Heart, chip: "bg-cat-emotions text-cat-emotions-foreground", bar: "bg-cat-emotions-foreground" },
};
