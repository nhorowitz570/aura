import { createClient } from "@supabase/supabase-js";

// Server-only admin client (uses the service role key). NEVER import this
// from client components. Used for privileged operations like fully deleting
// a user from auth.users (which cascades all their rows).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local and your Vercel env vars to enable admin operations.",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
