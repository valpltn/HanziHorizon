// Sites injects these public values when available. The explicit public fallback
// keeps source-built deployments functional when NEXT_PUBLIC variables are not
// substituted into Vinext client bundles. No privileged secret belongs here.
export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://hbkoamrjgjogpojvtjba.supabase.co";

export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_lRWeqfNVlKs7X_viBNsPEg_SUyD5QG-";
