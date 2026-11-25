import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";

export function HelpDialog() {
  const { t } = useI18n();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="mt-3 max-w-full whitespace-normal"><Phone aria-hidden />{t("help.button")}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle>{t("help.title")}</DialogTitle>
          <DialogDescription>{t("help.intro")}</DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-border">
          {["112", "103", "150", "111"].map((number) => (
            <div key={number} className="flex items-center gap-4 py-3">
              <div className="min-w-0 flex-1"><p className="text-xl font-bold">{number}</p><p className="mt-1 text-sm text-muted-foreground">{t(`help.e${number}`)}</p></div>
              <Button asChild size="icon" variant="soft"><a href={`tel:${number}`} aria-label={`${t("help.call")} ${number}`}><Phone aria-hidden /></a></Button>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{t("help.clinic")}</p>
      </DialogContent>
    </Dialog>
  );
}