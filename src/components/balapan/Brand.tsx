import { Link } from "@tanstack/react-router";

import { Chick } from "@/components/illustrations";

export function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2">
<Chick className="size-10" />
      <span className="font-display text-xl font-extrabold text-foreground">Balapan</span>
    </Link>
  );
}
