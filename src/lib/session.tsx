import { createContext, useContext, useState, type ReactNode } from "react";
import { DEFAULT_PERSON, PEOPLE, can as canDo, findPerson, type Capability, type Person } from "./rights";

export type { Person };
export interface Channel { id: string; label: string }

export const CHANNELS: Channel[] = [
  { id: "advocate_view", label: "Advocate view" },
  { id: "member_chat", label: "Member chat" },
  { id: "voice", label: "Voice" },
];

export const MEMBER_CHANNELS = ["member_chat", "voice"];
export { PEOPLE };

const channelsFor = (p: Person) => (p.memberAudience ? CHANNELS.filter((c) => MEMBER_CHANNELS.includes(c.id)) : CHANNELS);

interface SessionState {
  /** The signed-in person. Kept as `persona` too for older callers. */
  person: Person;
  persona: Person;
  channel: string;
  setPersona: (id: string) => void;
  setChannel: (id: string) => void;
  allowedChannels: Channel[];
  can: (c: Capability) => boolean;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [person, setP] = useState<Person>(DEFAULT_PERSON);
  const [channel, setC] = useState(DEFAULT_PERSON.memberAudience ? "member_chat" : "advocate_view");
  const allowedChannels = channelsFor(person);

  // Switching person never touches the shared demo store.
  const setPersona = (id: string) => {
    const p = findPerson(id) ?? DEFAULT_PERSON;
    setP(p);
    if (p.memberAudience) setC("member_chat");
    else if (!channelsFor(p).some((c) => c.id === channel)) setC("advocate_view");
  };
  const setChannel = (id: string) => {
    if (allowedChannels.some((c) => c.id === id)) setC(id);
  };

  return (
    <SessionContext.Provider
      value={{ person, persona: person, channel, setPersona, setChannel, allowedChannels, can: (c) => canDo(person, c) }}
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
