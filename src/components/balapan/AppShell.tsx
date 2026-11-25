import { Link } from "@tanstack/react-router";
import { BarChart3, MessageCircleHeart, Sun, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { Brand } from "./Brand";
import { Disclaimer } from "./Disclaimer";
import { LangSwitch } from "./LangSwitch";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-background/90 px-5 py-3 backdrop-blur">
      <Brand />
      <LangSwitch />
    </header>
  );
}

function BottomNav() {
  const { t } = useI18n();
  const items = [
    { to: "/today", label: t("nav.today"), Icon: Sun },
    { to: "/assistant", label: t("nav.assistant"), Icon: MessageCircleHeart },
    { to: "/progress", label: t("nav.progress"), Icon: BarChart3 },
    { to: "/profile", label: t("nav.profile"), Icon: UserRound },
  ] as const;

  return (
    <nav
      aria-label={t("nav.label")}
      className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="grid grid-cols-4 gap-1 rounded-3xl border border-border bg-card p-1.5">
        {items.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-1 min-h-11 rounded-2xl py-2 text-xs font-bold text-muted-foreground transition-colors"
            activeProps={{ className: "bg-primary text-primary-foreground" }}
          >
            <Icon className="size-6" aria-hidden />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** `fill` pins the page to the screen height (chat): the content area scrolls inside instead of the page. */
export function AppShell({ children, nav = true, fill = false }: { children: ReactNode; nav?: boolean; fill?: boolean }) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-md flex-col bg-background bg-warm-glow",
        fill ? "h-dvh overflow-hidden" : "min-h-screen",
      )}
    >
      <AppHeader />
      <main className={cn("flex flex-1 flex-col px-5 pt-2", fill && "min-h-0", nav ? "pb-safe-nav" : "pb-6")}>
        <div className={cn("flex-1", fill && "flex min-h-0 flex-col")}>{children}</div>
        <Disclaimer className={fill ? "mt-2" : "mt-10"} />
      </main>
      {nav && <BottomNav />}
    </div>
  );
}
