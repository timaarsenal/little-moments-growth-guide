import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { saveMoment } from "@/lib/moments";
import { profileQuery } from "@/lib/profile";

interface Props {
  userId: string;
  day: string;
  activity: { key: string; title: string };
  consented: boolean;
}

/** "📸 Save a moment": asks for photo-storage consent once, then opens the camera / gallery. */
export function MomentButton({ userId, day, activity, consented }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function agree() {
    const { error } = await supabase.from("child_profiles").update({ photo_consent_at: new Date().toISOString() }).eq("user_id", userId);
    if (error) {
      toast.error(t("common.error", { message: error.message }));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: profileQuery.queryKey });
    setConsentOpen(false);
    input.current?.click();
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      await saveMoment(userId, file, activity, day);
      await queryClient.invalidateQueries({ queryKey: ["moments"] });
      toast.success(t("moments.saved"));
    } catch (err) {
      toast.error(t("common.error", { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <input ref={input} type="file" accept="image/*" className="hidden" aria-hidden tabIndex={-1} onChange={(e) => void onFile(e.target.files?.[0])} />
      <Button variant="soft" size="sm" disabled={busy} onClick={() => (consented ? input.current?.click() : setConsentOpen(true))}>
        {busy ? <><Loader2 className="animate-spin" aria-hidden />{t("moments.uploading")}</> : t("moments.save")}
      </Button>
      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle>{t("moments.consentTitle")}</DialogTitle>
            <DialogDescription>{t("moments.consentText")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConsentOpen(false)}>{t("moments.consentCancel")}</Button>
            <Button onClick={() => void agree()}>{t("moments.consentAgree")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
