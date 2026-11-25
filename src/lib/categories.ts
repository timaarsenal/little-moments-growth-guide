import { Footprints, Hand, Heart, MessageCircle, Palette, type LucideIcon } from "lucide-react";

import type { Category } from "./types";

export const CATEGORY_STYLE: Record<Category, { Icon: LucideIcon; chip: string; bar: string }> = {
  speech: { Icon: MessageCircle, chip: "bg-cat-speech text-cat-speech-foreground", bar: "bg-bar-speech" },
  gross_motor: { Icon: Footprints, chip: "bg-cat-gross text-cat-gross-foreground", bar: "bg-bar-gross" },
  fine_motor: { Icon: Hand, chip: "bg-cat-fine text-cat-fine-foreground", bar: "bg-bar-fine" },
  creative_sensory: { Icon: Palette, chip: "bg-cat-creative text-cat-creative-foreground", bar: "bg-bar-creative" },
  emotions_social: { Icon: Heart, chip: "bg-cat-emotions text-cat-emotions-foreground", bar: "bg-bar-emotions" },
};
