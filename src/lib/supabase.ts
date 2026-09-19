import { supabaseUrl, supabasePublishableKey } from "@/lib/public-config";
import { createBrowserClient } from "@supabase/ssr";
export function db() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
