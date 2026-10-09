import { createContext, useContext, useState, type ReactNode } from "react";
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
    if (initialPerson) return initialPerson;
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

  // Switching person never touches the shared demo store.
  const setPersona = (id: string) => {
    const p = findPerson(id) ?? DEFAULT_PERSON;
    setP(p);
    setAuthenticated(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("verity_authenticated", "true");
      sessionStorage.setItem("verity_active_persona", p.id);
    }
  };

  const signOut = () => {
    setAuthenticated(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("verity_authenticated");
      sessionStorage.removeItem("verity_active_persona");
    }
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
