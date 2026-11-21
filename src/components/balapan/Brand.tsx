import { Link } from "@tanstack/react-router";

export function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span
        aria-hidden
        className="grid size-10 place-items-center rounded-full bg-accent text-xl shadow-soft"
      >
        🐣
      </span>
      <span className="font-display text-xl font-bold text-foreground">Balapan</span>
    </Link>
  );
}
