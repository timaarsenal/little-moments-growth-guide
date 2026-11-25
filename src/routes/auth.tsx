import { createFileRoute, redirect } from "@tanstack/react-router";

import type { AuthMode } from "@/components/balapan/AuthScreen";

// The login screen lives at "/". Old links and redirects to "/auth" land there.
export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: AuthMode } =>
    search["mode"] === "signup" || search["mode"] === "forgot" ? { mode: search["mode"] } : { mode: "signin" },
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/", search: { mode: search.mode ?? "signin" }, replace: true });
  },
});
