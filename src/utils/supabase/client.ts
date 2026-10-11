import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL : undefined) ||
  (typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
    : undefined) ||
  "https://ekdzbjkegokvgukypnvk.supabase.co";

const supabaseKey =
  (typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY
    : undefined) ||
  (typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    : undefined) ||
  "sb_publishable_7XOtV6YYCbh4Uq9FInnNTA_di9qQZwu";

export const createClient = () =>
  createBrowserClient(supabaseUrl, supabaseKey);
