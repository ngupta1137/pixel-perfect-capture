// Everything about who may do what comes from src/data/personas.json.
// Never branch on a person's name or persona key: ask for a capability instead.
import policy from "@/data/personas.json";

export type Capability = keyof typeof policy.capabilities;
export type ViewKey = keyof typeof policy.views;

export interface Person {
  id: string;
  name: string;
  persona: string;
  label: string;
  group: string;
  /** Role the engine enforces entitlements for (falls back to the persona key). */
  role: string;
  kbs: string[];
  capabilities: Capability[];
  /** Minimal citations and no internal owners: the member audience. */
  memberAudience: boolean;
}

type PersonaDef = (typeof policy.personas)[keyof typeof policy.personas];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const PEOPLE: Person[] = policy.people.map((p) => {
  const def = (policy.personas as Record<string, PersonaDef>)[p.persona]!;
  return {
    id: slug(p.name),
    name: p.name,
    persona: p.persona,
    label: def.label,
    group: def.group,
    role: def.entitlement_role ?? p.persona,
    kbs: p.kbs,
    capabilities: def.capabilities as Capability[],
    memberAudience: def.citation_detail === "minimal" && def.sees_internal_owner === false,
  };
});

export const GROUPS: string[] = [...new Set(PEOPLE.map((p) => p.group))];
export const DEFAULT_PERSON: Person = PEOPLE[0]!;
export const CAPABILITY_TEXT = policy.capabilities as Record<Capability, string>;
export const VIEWS = policy.views as Record<ViewKey, Capability[]>;

export const findPerson = (id: string | null | undefined) => PEOPLE.find((p) => p.id === id);
export const can = (p: Person, c: Capability) => p.capabilities.includes(c);
export const canView = (p: Person, v: ViewKey) => VIEWS[v].some((c) => can(p, c));

/** Pages and the views that open them. A page opens if the person can use any listed view. */
export const PAGES = [
  { to: "/", label: "Ask", views: ["ask"] },
  { to: "/work", label: "My work", views: ["author_ingest"] },
  { to: "/legal", label: "Legal queue", views: ["author_queue"] },
  { to: "/review", label: "Needs my review", views: ["needs_review"] },
  {
    to: "/author",
    label: "Author",
    views: ["author_ingest", "author_queue", "author_owner", "author_gaps", "author_insights", "author_access", "author_audit"],
  },
  { to: "/library", label: "Knowledge library", views: ["units"] },
  { to: "/evals", label: "Evaluations", views: ["evals"] },
  { to: "/agents", label: "Agents & integrations", views: ["agents"] },
  { to: "/access", label: "Access", views: ["author_access"] },
  { to: "/audit", label: "Audit", views: ["audit_replay", "author_audit"] },
  { to: "/health", label: "Analytics", views: ["analytics"] },
  { to: "/rights", label: "Rights", views: ["rights"], public: true },
  { to: "/platform", label: "Platform", views: [], public: true },
] as const satisfies readonly { to: string; label: string; views: readonly ViewKey[]; public?: boolean }[];

export type PagePath = (typeof PAGES)[number]["to"];

export const pageFor = (to: PagePath) => PAGES.find((p) => p.to === to)!;
export const canOpen = (p: Person, to: PagePath) => {
  const pg = pageFor(to);
  return ("public" in pg && pg.public) || pg.views.some((v) => canView(p, v));
};
/** Capabilities that would open a page, for the Denied message. */
export const pageCaps = (to: PagePath): Capability[] => [...new Set(pageFor(to).views.flatMap((v) => VIEWS[v]))];
export const navFor = (p: Person) => PAGES.filter((pg) => canOpen(p, pg.to));
export const homeRoute = (p: Person): PagePath => navFor(p)[0]?.to ?? "/rights";

export const NEVER_TOGETHER = policy.never_together as [Capability, Capability][];
export const personaDef = (key: string) => (policy.personas as Record<string, PersonaDef>)[key]!;
