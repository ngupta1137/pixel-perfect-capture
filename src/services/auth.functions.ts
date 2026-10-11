import { createServerFn } from "@tanstack/react-start";
import type { AuthenticatedUser } from "./auth.server";

export interface EstablishSessionResponse {
  ok: boolean;
  token?: string;
  user?: AuthenticatedUser;
  error?: string;
}

export const establishSessionFn = createServerFn({ method: "POST" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }): Promise<EstablishSessionResponse> => {
    try {
      const { createSession } = await import("./auth.server");
      const { token, user } = createSession(data.userId);

      try {
        const { setCookie } = await import("@tanstack/react-start/server");
        setCookie("verity_session", token, {
          path: "/",
          sameSite: "lax",
          httpOnly: true,
          maxAge: 86400, // 24 hours
        });
      } catch {
        // Outside HTTP context (e.g. tests)
      }

      return { ok: true, token, user };
    } catch (err: any) {
      return { ok: false, error: err.message || "Failed to establish server session." };
    }
  });

export const getCurrentSessionFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ authenticated: boolean; user?: AuthenticatedUser }> => {
    try {
      const { getRequestSessionToken, validateSessionToken } = await import(
        "./auth.server"
      );
      const token = await getRequestSessionToken();
      if (!token) return { authenticated: false };

      const user = validateSessionToken(token);
      if (!user) return { authenticated: false };

      return { authenticated: true, user };
    } catch {
      return { authenticated: false };
    }
  }
);

export const destroySessionFn = createServerFn({ method: "POST" })
  .validator((d: { token?: string }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    try {
      const { destroySession, getRequestSessionToken } = await import("./auth.server");
      const token = data?.token || (await getRequestSessionToken());
      if (token) {
        destroySession(token);
      }

      try {
        const { deleteCookie } = await import("@tanstack/react-start/server");
        deleteCookie("verity_session", { path: "/" });
      } catch {}

      return { ok: true };
    } catch {
      return { ok: false };
    }
  });
