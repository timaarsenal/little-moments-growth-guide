import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Images, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/balapan/AppShell";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { momentsQuery } from "@/lib/moments";

export const Route = createFileRoute("/_authenticated/moments")({
  head: () => ({
    meta: [
      { title: "Моменты — Balapan" },
      { name: "description", content: "Закрытый альбом фото ваших занятий с малышом." },
      { property: "og:title", content: "Моменты — Balapan" },
      { property: "og:description", content: "Закрытый альбом фото занятий с малышом." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Moments,
});

function Moments() {
  const { t, lang } = useI18n();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const q = useQuery(momentsQuery(user.id));
  const remove = useMutation({
    mutationFn: async (m: { id: string; photo_path: string }) => {
      const { error: sErr } = await supabase.storage.from("moments").remove([m.photo_path]);
      if (sErr) throw sErr;
      const { error } = await supabase.from("moments").delete().eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(t("moments.deleted"));
      await queryClient.invalidateQueries({ queryKey: ["moments"] });
    },
    onError: (err) => toast.error(t("common.error", { message: err instanceof Error ? err.message : String(err) })),
  });

  const byDate = new Map<string, NonNullable<typeof q.data>>();
  for (const m of q.data ?? []) byDate.set(m.plan_date, [...(byDate.get(m.plan_date) ?? []), m]);
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(lang === "kz" ? "kk-KZ" : "ru-RU", { day: "numeric", month: "long", year: "numeric" });

  return (
    <AppShell>
      <h1 className="mt-2 text-3xl font-bold">{t("moments.album")}</h1>
      {q.isPending ? (
        <div className="mt-10 flex justify-center"><Loader2 className="size-8 animate-spin text-primary" aria-hidden /></div>
      ) : byDate.size === 0 ? (
        <div className="mt-6 rounded-3xl border-2 border-dashed border-border p-6 text-center">
          <Images className="mx-auto size-10 text-primary" aria-hidden />
          <p className="mt-2 font-semibold text-muted-foreground">{t("moments.empty")}</p>
        </div>
      ) : (
        [...byDate.entries()].map(([date, items]) => (
          <section key={date} className="mt-6">
            <h2 className="font-bold text-muted-foreground">{fmt(date)}</h2>
            <div className="mt-2 space-y-4">
              {items.map((m) => (
                <figure key={m.id} className="overflow-hidden rounded-3xl bg-card shadow-soft">
                  {m.url && <img src={m.url} alt={m.activity_title} className="aspect-square w-full object-cover" loading="lazy" />}
                  <figcaption className="flex items-center justify-between gap-2 p-3">
                    <span className="min-w-0 font-bold">{m.activity_title}</span>
                    <Button variant="ghost" size="sm" className="shrink-0 text-destructive" disabled={remove.isPending}
                      onClick={() => { if (window.confirm(t("moments.deleteConfirm"))) remove.mutate(m); }}>
                      <Trash2 aria-hidden />{t("moments.delete")}
                    </Button>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))
      )}
    </AppShell>
  );
}
