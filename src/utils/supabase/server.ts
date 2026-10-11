import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  (typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    : undefined) ||
  "https://ekdzbjkegokvgukypnvk.supabase.co";

const supabaseKey =
  (typeof process !== "undefined"
    ? process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY
    : undefined) ||
  "sb_publishable_7XOtV6YYCbh4Uq9FInnNTA_di9qQZwu";

export interface CookieAdapter {
  getAll: () => Array<{ name: string; value: string }>;
  setAll?: (cookies: Array<{ name: string; value: string; options?: CookieOptions }>) => void;
}

/**
 * Creates a server-side Supabase client.
 * In TanStack Start / Node / Nitro environments, pass an optional cookie adapter
 * or invoke directly for server-side RPC / API operations.
 */
export const createClient = (cookieStore?: CookieAdapter) => {
  if (cookieStore) {
    return createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookieStore.setAll?.(cookiesToSet);
          } catch {
            // Handled in read-only server contexts
          }
        },
      },
    });
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  });
};
