import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/** The family's private photos, newest first, with short-lived signed links (the bucket is private). */
export const momentsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["moments", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("moments").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      if (!data.length) return [];
      const { data: signed, error: sErr } = await supabase.storage.from("moments").createSignedUrls(data.map((m) => m.photo_path), 3600);
      if (sErr) throw sErr;
      const urls = new Map(signed.map((s) => [s.path, s.signedUrl]));
      return data.map((m) => ({ ...m, url: urls.get(m.photo_path) ?? null }));
    },
    staleTime: 30 * 60_000,
  });

export async function saveMoment(userId: string, file: File, activity: { key: string; title: string }, day: string) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("moments").upload(path, file, { contentType: file.type || "image/jpeg" });
  if (upErr) throw upErr;
  const { error } = await supabase.from("moments").insert({ user_id: userId, plan_date: day, activity_key: activity.key, activity_title: activity.title, photo_path: path });
  if (error) {
    await supabase.storage.from("moments").remove([path]);
    throw error;
  }
}
