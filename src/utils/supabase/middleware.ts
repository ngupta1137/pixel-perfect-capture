import { createServerClient, type CookieOptions } from "@supabase/ssr";

const supabaseUrl =
  (typeof process !== "undefined"
    ? process.env["NEXT_PUBLIC_SUPABASE_URL"] || process.env["SUPABASE_URL"]
    : undefined) ||
  "https://ekdzbjkegokvgukypnvk.supabase.co";

const supabaseKey =
  (typeof process !== "undefined"
    ? process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ||
      process.env["SUPABASE_ANON_KEY"]
    : undefined) ||
  "sb_publishable_7XOtV6YYCbh4Uq9FInnNTA_di9qQZwu";

/**
 * Parses and refreshes Supabase auth cookies for standard Web Request / Response objects
 * (compatible with TanStack Start, Nitro, and Cloudflare Workers).
 */
export const updateSession = async (request: Request): Promise<{ response: Response; user: unknown }> => {
  const headers = new Headers(request.headers);
  const response = new Response(null, { headers });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get("cookie") || "";
        return cookieHeader
          .split(";")
          .map((c) => c.trim())
          .filter(Boolean)
          .map((c) => {
            const [name, ...val] = c.split("=");
            return { name: name || "", value: val.join("=") };
          });
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          let cookieStr = `${name}=${value}`;
          if (options?.path) cookieStr += `; Path=${options.path}`;
          if (options?.maxAge) cookieStr += `; Max-Age=${options.maxAge}`;
          if (options?.domain) cookieStr += `; Domain=${options.domain}`;
          if (options?.sameSite) cookieStr += `; SameSite=${options.sameSite}`;
          if (options?.secure) cookieStr += "; Secure";
          if (options?.httpOnly) cookieStr += "; HttpOnly";
          response.headers.append("Set-Cookie", cookieStr);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  return { response, user };
};
