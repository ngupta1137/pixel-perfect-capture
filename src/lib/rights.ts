import policy from "@/data/personas.json";

/** Rights come only from personas.json. Nothing here names a persona in a condition. */
export type Capability = keyof typeof policy.capabilities;
export type ViewKey = keyof typeof policy.views;
type PersonaKey = keyof typeof policy.personas;

export interface PersonaDef {
  label: string;
  group: string;
  entitlement_role: string | null;
  who: string;
  goal: string;
  capabilities: string[];
  citation_detail: string;
  sees_internal_owner: boolean;
  cannot_see: string;
  denied_example: string;
}

export interface Person {
  id: string;
  name: string;
  personaKey: string;
  persona: PersonaDef;
  /** Role sent to search: the persona's entitlement role, else the persona key. */
  role: string;
  capabilities: string[];
  scope: string[];
  views: ViewKey[];
}

export const CAPABILITIES = policy.capabilities as Record<string, string>;
export const NEVER_TOGETHER = policy.never_together;
export const PERSONA_DEFS = policy.personas as Record<string, PersonaDef>;
export const GROUPS = ["Consumers", "Authors and approvers", "Governance"] as const;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const PEOPLE: Person[] = policy.people.map((p) => {
  const persona = PERSONA_DEFS[p.persona as PersonaKey] as PersonaDef;
  const views = (Object.keys(policy.views) as ViewKey[]).filter((v) =>
    (policy.views[v] as string[]).some((c) => persona.capabilities.includes(c)),
  );
  return {
    id: slug(p.name),
    name: p.name,
    personaKey: p.persona,
    persona,
    role: persona.entitlement_role ?? p.persona,
    capabilities: persona.capabilities,
    scope: p.kbs,
    views,
  };
});

export const DEFAULT_PERSON = PEOPLE[0] as Person;
export const findPerson = (id: string | null | undefined) =>
  PEOPLE.find((p) => p.id === id) ?? DEFAULT_PERSON;

export const can = (person: Person, cap: string) => person.capabilities.includes(cap);
export const canAny = (person: Person, caps: readonly string[]) =>
  caps.length === 0 || caps.some((c) => can(person, c));

const viewCaps = (...keys: ViewKey[]) => keys.flatMap((k) => policy.views[k] as string[]);

export interface NavItem {
  to: "/" | "/work" | "/review" | "/legal" | "/access" | "/audit" | "/evals" | "/agents" | "/health" | "/rights";
  label: string;
  /** The person needs ANY of these capabilities. Empty = everyone. */
  caps: string[];
}

/** Order and labels from UI_SPEC section 1. */
export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Ask", caps: viewCaps("ask") },
  { to: "/work", label: "My work", caps: viewCaps("author_ingest") },
  { to: "/review", label: "Needs my review", caps: viewCaps("author_queue", "author_owner") },
  { to: "/legal", label: "Legal queue", caps: ["approve_legal"] },
  { to: "/access", label: "Access", caps: viewCaps("author_access") },
  { to: "/audit", label: "Audit", caps: viewCaps("author_audit") },
  { to: "/evals", label: "Evals", caps: viewCaps("evals") },
  { to: "/agents", label: "Agents", caps: viewCaps("agents") },
  { to: "/health", label: "Health", caps: viewCaps("analytics") },
  { to: "/rights", label: "Rights", caps: [] },
];

export const navFor = (person: Person) => NAV_ITEMS.filter((n) => canAny(person, n.caps));
export const routeCaps = (to: NavItem["to"]) => NAV_ITEMS.find((n) => n.to === to)?.caps ?? [];

/**
 * Home route: the person's strongest capability decides, checked in this order.
 */
const HOME_RULES: [string, NavItem["to"]][] = [
  ["search", "/"],
  ["ingest_source", "/work"],
  ["approve_legal", "/legal"],
  ["manage_access", "/access"],
  ["approve_standard", "/review"],
  ["run_evals", "/evals"],
  ["view_audit", "/audit"],
  ["view_analytics", "/health"],
];
export function homeRoute(person: Person): NavItem["to"] {
  return HOME_RULES.find(([cap]) => can(person, cap))?.[1] ?? "/rights";
}

/** Member-audience display: minimal citation detail and no internal owner. */
export const isMemberAudience = (person: Person) =>
  person.persona.citation_detail === "minimal" && !person.persona.sees_internal_owner;

/** Staff and advocate personas get the AEP banner: everyone except members and downstream agents. */
export const isStaff = (person: Person) =>
  person.persona.entitlement_role !== null
    ? !isMemberAudience(person)
    : !person.capabilities.every((c) => (policy.agent_allowed as string[]).includes(c));
