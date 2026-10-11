import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import {
  DEFAULT_PERSON,
  PEOPLE,
  can as canDo,
  findPerson,
  type Capability,
  type Person,
} from "./rights";

export type { Person };
export interface Channel {
  id: string;
  label: string;
  description?: string;
}

export const CHANNELS: Channel[] = [
  {
    id: "advocate_view",
    label: "Advocate view",
    description: "Internal advocate portal with full policy metadata & call context",
  },
  {
    id: "member_chat",
    label: "Member chat",
    description: "Self-service member conversational chat with plain answers",
  },
  {
    id: "voice",
    label: "Voice",
    description: "Hands-free voice assistant with speech recognition & spoken answers",
  },
];

export const MEMBER_CHANNELS = ["member_chat", "voice"];
export { PEOPLE };

/**
 * Returns the active session token for API / server function authorization.
 * Defaults to demo session token for the active persona if not yet negotiated.
 */
export function getActiveSessionToken(): string {
  if (typeof window !== "undefined") {
    const savedToken = sessionStorage.getItem("verity_session_token");
    if (savedToken) return savedToken;
    const persona = sessionStorage.getItem("verity_active_persona") || DEFAULT_PERSON.id;
    return `vty_sess_demo_${persona}`;
  }
  return `vty_sess_demo_${DEFAULT_PERSON.id}`;
}

interface SessionState {
  /** The signed-in person. Kept as `persona` too for older callers. */
  person: Person;
  persona: Person;
  channel: string;
  authenticated: boolean;
  setPersona: (id: string) => void;
  setChannel: (id: string) => void;
  signOut: () => void;
  allowedChannels: Channel[];
  can: (c: Capability) => boolean;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({
  children,
  initialPerson,
  initialAuthenticated,
}: {
  children: ReactNode;
  initialPerson?: Person;
  initialAuthenticated?: boolean;
}) {
  const [person, setP] = useState<Person>(() => {
    if (initialPerson) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("verity_active_persona", initialPerson.id);
        sessionStorage.setItem("verity_session_token", `vty_sess_demo_${initialPerson.id}`);
      }
      return initialPerson;
    }
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("verity_active_persona");
      if (saved) {
        const found = findPerson(saved);
        if (found) return found;
      }
    }
    return DEFAULT_PERSON;
  });

  const [authenticated, setAuthenticated] = useState<boolean>(() => {
    if (initialAuthenticated !== undefined) return initialAuthenticated;
    if (initialPerson) return true;
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("verity_authenticated") === "true";
    }
    return false;
  });

  const [channel, setC] = useState("voice");
  const allowedChannels = CHANNELS;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const activeId = person.id;
      sessionStorage.setItem("verity_active_persona", activeId);
      if (!sessionStorage.getItem("verity_session_token") || sessionStorage.getItem("verity_session_token")?.startsWith("vty_sess_demo_")) {
        sessionStorage.setItem("verity_session_token", `vty_sess_demo_${activeId}`);
      }
      void import("@/services/auth.functions")
        .then(({ establishSessionFn }) => establishSessionFn({ data: { userId: activeId } }))
        .then((res) => {
          if (res.ok && res.token && typeof window !== "undefined") {
            sessionStorage.setItem("verity_session_token", res.token);
          }
        })
        .catch(() => {});
    }
  }, [person.id]);

  // Switching person establishes a verified server session for the selected persona.
  const setPersona = (id: string) => {
    const p = findPerson(id) ?? DEFAULT_PERSON;
    setP(p);
    setAuthenticated(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("verity_authenticated", "true");
      sessionStorage.setItem("verity_active_persona", p.id);
      sessionStorage.setItem("verity_session_token", `vty_sess_demo_${p.id}`);
    }
    void import("@/services/auth.functions")
      .then(({ establishSessionFn }) => establishSessionFn({ data: { userId: p.id } }))
      .then((res) => {
        if (res.ok && res.token && typeof window !== "undefined") {
          sessionStorage.setItem("verity_session_token", res.token);
        }
      })
      .catch(() => {});
  };

  const signOut = () => {
    setAuthenticated(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("verity_authenticated");
      sessionStorage.removeItem("verity_active_persona");
      sessionStorage.removeItem("verity_session_token");
    }
    void import("@/services/auth.functions")
      .then(({ destroySessionFn }) => destroySessionFn({ data: {} }))
      .catch(() => {});
  };

  const setChannel = (id: string) => {
    if (CHANNELS.some((c) => c.id === id)) {
      setC(id);
    }
  };

  return (
    <SessionContext.Provider
      value={{
        person,
        persona: person,
        channel,
        authenticated,
        setPersona,
        setChannel,
        signOut,
        allowedChannels,
        can: (c) => canDo(person, c),
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
