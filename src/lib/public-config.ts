// Public browser connection settings. This publishable key grants no access without RLS.
// Environment variables override these defaults for separate deployments.
export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ugfnhcnplyfkxfbkemui.supabase.co";
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_WmAWFgTjvaUYtixDVTbcMw_epOJW2Ar";
