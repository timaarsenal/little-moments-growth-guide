import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, Trash2, Moon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/balapan/AppShell";
import { BedtimeRitual } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { ANCHORS, RITUAL_TEMPLATES, isAnchor, ritualTitle, ritualsQuery, type Anchor } from "@/lib/rituals";

export const Route = createFileRoute("/_authenticated/rituals")({
  head: () => ({
    meta: [
      { title: "Ритуалы — Balapan" },
      { name: "description", content: "Ежедневные ритуалы малыша: после подъёма, перед едой и перед сном." },
      { property: "og:title", content: "Ритуалы — Balapan" },
      { property: "og:description", content: "Ежедневные ритуалы малыша в Balapan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(ritualsQuery(context.user.id)),
  component: Rituals,
});

function Rituals() {
  const { t } = useI18n();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const key = ritualsQuery(user.id).queryKey;
  const { data: rituals } = useSuspenseQuery(ritualsQuery(user.id));
  const [title, setTitle] = useState("");
  const [anchor, setAnchor] = useState<Anchor>("wake");
  const [minutes, setMinutes] = useState(10);

  const fail = (err: unknown) => toast.error(t("common.error", { message: err instanceof Error ? err.message : String(err) }));
  const add = useMutation({
    mutationFn: async (r: { anchor: Anchor; template_key: string | null; title: string; minutes: number }) => {
      const { error } = await supabase.from("rituals").insert({ user_id: user.id, ...r });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rituals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ritual"] }).then(() => queryClient.invalidateQueries({ queryKey: key })),
    onError: fail,
  });

  return (
    <AppShell>
      <h1 className="mt-2 text-3xl font-bold">{t("rituals.title")}</h1>
      <p className="mt-1 text-muted-foreground">{t("rituals.hint")}</p>

      <h2 className="mt-6 font-bold">{t("rituals.mine")}</h2>
      {rituals.length === 0 ? (
        <p className="mt-2 rounded-3xl border-2 border-dashed border-border p-5 text-center font-semibold text-muted-foreground">{t("rituals.empty")}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {rituals.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-3xl bg-sleep p-4">
              {r.anchor === "bed" ? <BedtimeRitual className="h-10 w-11 shrink-0" /> : <Moon className="size-6 shrink-0 text-sleep-foreground" aria-hidden />}
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-sleep-foreground">{ritualTitle(r, t)}</p>
                <p className="text-sm text-sleep-foreground/80">{isAnchor(r.anchor) ? t(`rituals.anchors.${r.anchor}`) : ""} · {t("today.min", { n: r.minutes })}</p>
              </div>
              <Button size="icon" variant="ghost" aria-label={t("rituals.delete")} onClick={() => remove.mutate(r.id)} disabled={remove.isPending}>
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-6 font-bold">{t("rituals.templates")}</h2>
      <ul className="mt-2 space-y-2">
        {RITUAL_TEMPLATES.map((tpl) => {
          const added = rituals.some((r) => r.template_key === tpl.key);
          return (
            <li key={tpl.key} className="flex items-center gap-3 rounded-3xl border border-border bg-card p-4">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{t(`rituals.t.${tpl.key}`)}</p>
                <p className="text-sm text-muted-foreground">{t(`rituals.anchors.${tpl.anchor}`)} · {t("today.min", { n: tpl.minutes })}</p>
              </div>
              <Button size="sm" variant={added ? "ghost" : "soft"} disabled={added || add.isPending}
                onClick={() => add.mutate({ anchor: tpl.anchor, template_key: tpl.key, title: "", minutes: tpl.minutes })}>
                {added ? <Check aria-hidden /> : <Plus aria-hidden />}
                {added ? t("rituals.added") : t("rituals.add")}
              </Button>
            </li>
          );
        })}
      </ul>

      <form
        className="mt-6 space-y-3 rounded-3xl border border-border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          add.mutate({ anchor, template_key: null, title: title.trim().slice(0, 120), minutes }, { onSuccess: () => setTitle("") });
        }}
      >
        <h2 className="font-bold">{t("rituals.custom")}</h2>
        <Input aria-label={t("rituals.custom")} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={t("rituals.customPlaceholder")} className="h-12 rounded-2xl" />
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <div className="space-y-1">
            <Label htmlFor="anchor">{t("rituals.anchor")}</Label>
            <Select value={anchor} onValueChange={(v) => isAnchor(v) && setAnchor(v)}>
              <SelectTrigger id="anchor" className="h-12 rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>{ANCHORS.map((a) => <SelectItem key={a} value={a}>{t(`rituals.anchors.${a}`)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="rmin">{t("rituals.minutes")}</Label>
            <Input id="rmin" type="number" min={1} max={60} value={minutes} onChange={(e) => setMinutes(Math.max(1, Math.min(60, Number(e.target.value) || 1)))} className="h-12 rounded-2xl" />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={!title.trim() || add.isPending}><Plus aria-hidden />{t("rituals.add")}</Button>
      </form>
    </AppShell>
  );
}
