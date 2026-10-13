import crypto from "node:crypto";
import { PEOPLE, type Capability, type Person } from "../lib/rights";

export interface AuthenticatedUser {
  id: string; // e.g. "dana", "owen", "rita", "priya"
  name: string;
  persona: string;
  role: string;
  label: string;
  group: string;
  capabilities: Capability[];
  kbs: string[];
  isDemo: boolean;
}

export interface ServerSession {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory server session store (source of truth for active sessions)
const activeSessions = new Map<string, ServerSession>();

export function toAuthenticatedUser(person: Person): AuthenticatedUser {
  return {
    id: person.id,
    name: person.name,
    persona: person.persona,
    role: person.role,
    label: person.label,
    group: person.group,
    capabilities: [...person.capabilities],
    kbs: [...person.kbs],
    isDemo: true,
  };
}

/**
 * Creates a cryptographically secure server-side session for a known user.
 */
export function createSession(userId: string): { token: string; user: AuthenticatedUser } {
  const normId = (userId || "").toLowerCase().trim();
  const person = PEOPLE.find(
    (p) => p.id === normId || p.name.toLowerCase() === normId
  );

  if (!person) {
    throw new Error(`Authentication rejected: User "${userId}" does not exist in directory.`);
  }

  const token = `vty_sess_${person.id}_${crypto.randomBytes(24).toString("hex")}`;
  const now = Date.now();
  const session: ServerSession = {
    token,
    userId: person.id,
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
  };

  activeSessions.set(token, session);
  return { token, user: toAuthenticatedUser(person) };
}

/**
 * Validates a session token and returns the trusted server-side user identity.
 * Roles and capabilities are NEVER read from caller-supplied input;
 * they are strictly derived from the verified user record on the server.
 */
export function validateSessionToken(token?: string | null): AuthenticatedUser | null {
  if (!token || typeof token !== "string" || !token.trim()) {
    return null;
  }

  const trimmed = token.trim();

  // 1. Check active server-side sessions
  const session = activeSessions.get(trimmed);
  if (session) {
    if (Date.now() > session.expiresAt) {
      activeSessions.delete(trimmed);
      return null;
    }
    const person = PEOPLE.find((p) => p.id === session.userId);
    return person ? toAuthenticatedUser(person) : null;
  }

  // 2. Deterministic demo session token support (e.g. "vty_sess_demo_dana")
  if (trimmed.startsWith("vty_sess_demo_")) {
    const personaId = trimmed.replace("vty_sess_demo_", "").toLowerCase();
    const person = PEOPLE.find(
      (p) => p.id === personaId || p.name.toLowerCase() === personaId
    );
    if (person) {
      return toAuthenticatedUser(person);
    }
  }

  return null;
}

/**
 * Invalidate a session token.
 */
export function destroySession(token: string): boolean {
  return activeSessions.delete(token.trim());
}

/**
 * Attempt to extract session token from HTTP headers or cookies if running
 * inside TanStack Start server runtime.
 */
export async function getRequestSessionToken(): Promise<string | null> {
  try {
    const { getRequestHeader, getCookie } = await import("@tanstack/react-start/server");
    const authHeader = getRequestHeader("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      return authHeader.slice(7).trim();
    }
    const customHeader = getRequestHeader("x-verity-session");
    if (customHeader) {
      return customHeader.trim();
    }
    const cookie = getCookie("verity_session");
    if (cookie) {
      return cookie.trim();
    }
  } catch {
    // Expected when called outside TanStack Start request context (e.g. tests)
  }
  return null;
}

/**
 * Resolve authenticated user from request payload or server request context.
 * Throws an authentication error if unauthenticated or invalid.
 */
export async function resolveRequestUser(
  reqData?: { sessionToken?: string },
  callerUser?: AuthenticatedUser
): Promise<AuthenticatedUser> {
  if (callerUser) {
    return callerUser;
  }

  // 1. Check payload sessionToken
  if (reqData?.sessionToken) {
    const user = validateSessionToken(reqData.sessionToken);
    if (user) return user;
    throw new Error("Authentication failed: Invalid or expired session token.");
  }

  // 2. Check HTTP headers/cookies
  const token = await getRequestSessionToken();
  if (token) {
    const user = validateSessionToken(token);
    if (user) return user;
    throw new Error("Authentication failed: Invalid or expired session cookie/header.");
  }

  throw new Error("Authentication required: No valid session token or session cookie provided.");
}

/**
 * Synchronous request authenticator for direct server function / test calls.
 */
export function authenticateRequest(
  reqData?: { sessionToken?: string },
  callerUser?: AuthenticatedUser
): AuthenticatedUser {
  if (callerUser) {
    return callerUser;
  }

  if (reqData?.sessionToken) {
    const user = validateSessionToken(reqData.sessionToken);
    if (user) return user;
    throw new Error("Authentication failed: Invalid or expired session token.");
  }

  throw new Error("Authentication required: No valid session token or session cookie provided.");
}

/**
 * Capability assertion: throws if user does not hold the required capability.
 */
export function requireCapability(
  user: AuthenticatedUser,
  capability: Capability,
  actionDescription: string = "perform this action"
): void {
  if (!user.capabilities.includes(capability)) {
    throw new Error(
      `Unauthorized: User "${user.name}" (${user.label}) lacks required capability "${capability}" to ${actionDescription}.`
    );
  }
}

/**
 * Any-capability assertion: throws if user lacks all listed capabilities.
 */
export function requireAnyCapability(
  user: AuthenticatedUser,
  capabilities: Capability[],
  actionDescription: string = "perform this action"
): void {
  if (!capabilities.some((c) => user.capabilities.includes(c))) {
    throw new Error(
      `Unauthorized: User "${user.name}" (${user.label}) lacks required authorization to ${actionDescription}.`
    );
  }
}
