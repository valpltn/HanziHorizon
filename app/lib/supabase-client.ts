import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./supabase-config";

let client: ReturnType<typeof createBrowserClient> | undefined;

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient(
      supabaseUrl,
      supabasePublishableKey,
    );
  }
  return client;
}
