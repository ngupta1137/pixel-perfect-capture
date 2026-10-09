import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_PERSON, can, findPerson, isMemberAudience, type Person } from "./rights";

export interface Channel { id: string; label: string }

export const CHANNELS: Channel[] = [
  { id: "advocate_view", label: "Advocate view" },
  { id: "member_chat", label: "Member chat" },
  { id: "voice", label: "Voice" },
];
export const MEMBER_CHANNELS = ["member_chat", "voice"];
const STAFF_CHANNELS = ["advocate_view", "voice"];
const STORAGE_KEY = "verity:person";

interface SessionState {
  person: Person;
  /** False until the saved person is restored after hydration; guards wait for it. */
  ready: boolean;
  channel: string;
  setPerson: (id: string) => void;
  setChannel: (id: string) => void;
  allowedChannels: Channel[];
  can: (cap: string) => boolean;
}

const SessionContext = createContext<SessionState | null>(null);

const channelsFor = (p: Person) =>
  CHANNELS.filter((c) => (isMemberAudience(p) ? MEMBER_CHANNELS : STAFF_CHANNELS).includes(c.id));

export function SessionProvider({ children }: { children: ReactNode }) {
  const [person, setP] = useState<Person>(DEFAULT_PERSON);
  const [ready, setReady] = useState(false);
  const [channel, setC] = useState("advocate_view");
  const allowedChannels = channelsFor(person);

  const apply = (p: Person) => {
    setP(p);
    setC((current) => {
      const ids = channelsFor(p).map((c) => c.id);
      return ids.includes(current) ? current : (ids[0] ?? "advocate_view");
    });
  };

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) apply(findPerson(saved));
    } catch {
      /* storage unavailable: keep the default person */
    }
    setReady(true);
  }, []);

  const setPerson = (id: string) => {
    const p = findPerson(id);
    apply(p);
    try {
      window.localStorage.setItem(STORAGE_KEY, p.id);
    } catch {
      /* ignore */
    }
  };
  const setChannel = (id: string) => {
    if (allowedChannels.some((c) => c.id === id)) setC(id);
  };

  return (
    <SessionContext.Provider
      value={{ person, ready, channel, setPerson, setChannel, allowedChannels, can: (cap) => can(person, cap) }}
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
