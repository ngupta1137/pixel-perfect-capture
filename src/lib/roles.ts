// Demo entry roles. Membership is derived from capabilities in personas.json
// (via rights.ts), never from a person's name or persona key. Choosing a role
// only narrows which demo people are offered; permissions stay with the person.
import { PEOPLE, can, type Capability, type Person } from "@/lib/rights";

export interface DemoRole {
  id: "consumer" | "author" | "reviewer" | "admin";
  title: string;
  purpose: string;
  tasks: string[];
  matches: (p: Person) => boolean;
}

const any = (p: Person, caps: Capability[]) => caps.some((c) => can(p, c));
const AUTHOR: Capability[] = ["ingest_source", "propose_unit"];
const REVIEW: Capability[] = ["approve_standard", "approve_legal"];
const ADMIN: Capability[] = ["manage_access", "view_audit", "view_owner_queue", "view_analytics", "view_evals"];

export const DEMO_ROLES: DemoRole[] = [
  {
    id: "consumer",
    title: "Knowledge consumer / Advocate",
    purpose: "Ask questions and get approved, cited answers within your scope.",
    tasks: ["Ask & search", "Verbatim disclosures", "Member chat and voice"],
    matches: (p) => can(p, "search") && !any(p, [...AUTHOR, ...REVIEW, ...ADMIN]),
  },
  {
    id: "author",
    title: "Knowledge author",
    purpose: "Ingest sources, review extracted units and propose drafts.",
    tasks: ["Source ingestion", "Extracted units", "Knowledge gaps"],
    matches: (p) => any(p, AUTHOR),
  },
  {
    id: "reviewer",
    title: "Reviewer / Approver",
    purpose: "Compare wording, check impact and record a named decision.",
    tasks: ["Review queue", "Approve or reject", "Re-verify units"],
    matches: (p) => any(p, REVIEW) && !any(p, AUTHOR),
  },
  {
    id: "admin",
    title: "Administrator / Knowledge owner",
    purpose: "Own freshness, access, audit, evaluations and program health.",
    tasks: ["Access & rights", "Audit replay", "Analytics & evaluations"],
    matches: (p) => any(p, ADMIN) && !any(p, [...AUTHOR, ...REVIEW]),
  },
];

export const peopleForRole = (role: DemoRole) => PEOPLE.filter(role.matches);
