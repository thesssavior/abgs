import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let client: ReturnType<typeof createClient> | null = null;

export function supabase() {
  if (!client) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("Supabase credentials not configured");
    }
    client = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return client;
}
