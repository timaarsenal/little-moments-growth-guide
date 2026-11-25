import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Authenticate raw streaming requests with a caller-scoped client, never privileged credentials. */
export async function authenticateChatRequest(request: Request) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const authorization = request.headers.get("authorization");
  if (!url || !key) throw new Error("Authentication unavailable");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7);
  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: authorization },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims.sub) return null;
  return { supabase, userId: data.claims.sub };
}