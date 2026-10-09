import type { Choice, Citation, Outcome, SearchRequest, SearchResponse } from "./verity";

const ENTITLEMENTS: Record<string, string> = {
  pharmacy_advocate: "KB-PHARM, KB-SHARED",
  insurance_advocate: "KB-INS, KB-SHARED",
  member_chat: "KB-PHARM (member-safe), KB-SHARED",
};

interface Fixture {
  outcome: Outcome;
  message: string;
  text: string | null;
  owner_team?: string | null;
  citations?: Citation[];
  intent: string;
  next_step?: string;
  choices?: Choice[];
}

const cite = (
  unit_id: string,
  version: number,
  title: string,
  owner: string,
  effective_date: string,
  verbatim: boolean,
  text?: string,
): Citation => ({ unit_id, version, title, owner, effective_date, verbatim, ...(text ? { text } : {}) });

const GAP: Fixture = {
  outcome: "insufficient_evidence",
  message: "No approved content found. Logged as a gap for the knowledge team.",
  text: null,
  intent: "unknown",
};

export const NEXT_STEPS: Partial<Record<Outcome, string>> = {
  needs_clarification: "Ask the member, then pick the answer below. Verity will check again.",
  insufficient_evidence: "Say: \u201cLet me check that and follow up with you.\u201d Do not answer from memory.",
  conflict: "Say: \u201cLet me confirm the exact supply for your plan.\u201d Do not quote either number until the owners resolve it.",
  stale: "Do not quote this as current. Say you will confirm and follow up.",
  safety_escalation: "Stay on the line and connect the member to a person now.",
};

/** Unit facts shown in the Unit drawer. */
export interface UnitMeta { kb: string; verifier: string; review_date: string; applies_to: string; channels: string[]; read_before_benefits?: boolean }
export const UNIT_META: Record<string, UnitMeta> = {
  "U-PH-003": { kb: "KB-PHARM", verifier: "Rita (Legal)", review_date: "2027-01-15", applies_to: "All Rx plans, all states", channels: ["advocate_view", "member_chat", "voice"], read_before_benefits: true },
  "U-SH-002": { kb: "KB-SHARED", verifier: "Rita (Legal)", review_date: "2027-01-15", applies_to: "All plans, all states", channels: ["advocate_view", "voice"] },
  "U-PH-006": { kb: "KB-PHARM", verifier: "Owen (Knowledge owner)", review_date: "2026-12-31", applies_to: "Mail order, plan year 2026", channels: ["advocate_view", "member_chat", "voice"] },
  "U-PH-206": { kb: "KB-PHARM", verifier: "Owen (Knowledge owner)", review_date: "2027-12-31", applies_to: "Mail order, plan year 2027", channels: ["advocate_view", "member_chat", "voice"] },
  "U-PH-007": { kb: "KB-PHARM", verifier: "Owen (Knowledge owner)", review_date: "2026-12-31", applies_to: "Mail order, plan year 2026", channels: ["advocate_view", "member_chat", "voice"] },
  "U-PH-107": { kb: "KB-PHARM", verifier: "Owen (Knowledge owner)", review_date: "2026-11-01", applies_to: "Mail order, legacy", channels: ["advocate_view"] },
  "U-PH-207": { kb: "KB-PHARM", verifier: "Owen (Knowledge owner)", review_date: "2027-12-31", applies_to: "Mail order, plan year 2027", channels: ["advocate_view", "member_chat", "voice"] },
  "U-PH-008": { kb: "KB-PHARM", verifier: "Owen (Knowledge owner)", review_date: "2026-06-30", applies_to: "Mail order", channels: ["advocate_view"] },
  "U-PH-010": { kb: "KB-PHARM", verifier: "Owen (Knowledge owner)", review_date: "2026-12-31", applies_to: "Kentucky only", channels: ["advocate_view"] },
  "U-PH-020": { kb: "KB-PHARM", verifier: "Owen (Knowledge owner)", review_date: "2026-12-31", applies_to: "Formulary, all states", channels: ["advocate_view"] },
};

const YEAR_CHOICES = [
  { label: "2026", set: { plan_year: "2026" } },
  { label: "2027", set: { plan_year: "2027" } },
];
const STATE_CHOICES = ["KY", "FL", "OH"].map((s) => ({ label: s, set: { state: s } }));

function match(req: SearchRequest): Fixture {
  const q = req.query.toLowerCase();
  const has = (s: string) => q.includes(s);
  // undefined = caller did not send a year (older callers): plan year 2026. null = cleared.
  const year = req.plan_year === undefined ? "2026" : req.plan_year;

  if (has("chest pain") || has("can't breathe") || has("can’t breathe")) {
    return {
      outcome: "safety_escalation",
      message: "Urgent language detected. Human handoff.",
      text: "This sounds urgent. If this is a medical emergency, call 911 now. I am connecting you with a person who can help right away.",
      intent: "safety",
    };
  }
  if (has("pricing disclaimer")) {
    if (req.role === "insurance_advocate") {
      return {
        outcome: "not_authorized",
        message: "This is owned by Compliance (KB-PHARM). Transfer or ask that team.",
        text: null,
        owner_team: "Compliance",
        next_step: "Transfer to Pharmacy",
        intent: "pricing_disclaimer",
      };
    }
    return {
      outcome: "answer",
      message: "Pricing disclaimer (Rx) · Compliance · v1 · effective 2026-01-15",
      text: "The prices I share today are estimates based on your current plan and may change. Your final cost will be confirmed when your prescription is processed.",
      citations: [cite("U-PH-003", 1, "Pricing disclaimer (Rx)", "Compliance", "2026-01-15", true)],
      intent: "pricing_disclaimer",
    };
  }
  if (has("closing")) {
    return {
      outcome: "answer",
      message: "Call closing: no impact on membership · Compliance · v2 · effective 2026-01-15",
      text: "Your decision today has no impact on your plan membership. Is there anything else I can help you with today?",
      citations: [cite("U-SH-002", 2, "Call closing: no impact on membership", "Compliance", "2026-01-15", true)],
      intent: "call_closing",
    };
  }
  if (has("days supply") || has("how many days") || has("90")) {
    if (!year) return { outcome: "needs_clarification", message: "Which plan year: 2026 or 2027?", text: null, choices: YEAR_CHOICES, intent: "days_supply" };
    if (year === "2027") {
      return {
        outcome: "answer",
        message: "Days supply by mail (2027) · Pharmacy Ops · v1 · effective 2027-01-01",
        text: "Maintenance supply by mail is 84 days.",
        citations: [cite("U-PH-207", 1, "Days supply by mail (2027)", "Pharmacy Ops", "2027-01-01", false)],
        intent: "days_supply",
      };
    }
    return {
      outcome: "conflict",
      message: "Two approved sources disagree. Both shown; routed to owners.",
      text: null,
      owner_team: "Pharmacy Ops, Outbound Pharmacy",
      citations: [
        cite("U-PH-007", 1, "Days supply by mail (90-day)", "Pharmacy Ops", "2026-01-15", false,
          "A 90-day supply is available by mail for most maintenance medications."),
        cite("U-PH-107", 3, "Days supply by mail (100-day, legacy)", "Outbound Pharmacy", "2025-11-01", false,
          "Members can get up to a 100-day supply of maintenance medications by mail."),
      ],
      intent: "days_supply",
    };
  }
  if (has("luminexa")) {
    return {
      outcome: "insufficient_evidence",
      message: "The approved unit gives the tier but does not state a copay.",
      text: null,
      citations: [cite("U-PH-020", 1, "Luminexa formulary tier", "Pharmacy Ops", "2026-01-15", false)],
      intent: "drug_copay",
    };
  }
  if (has("copay")) {
    if (!req.state) {
      return { outcome: "needs_clarification", message: "Which state is the member's plan in?", text: null, choices: STATE_CHOICES, intent: "copay_assistance" };
    }
    if (req.state === "KY") {
      return {
        outcome: "answer",
        message: "Copay assistance program (Kentucky pilot) · Pharmacy Ops · v1 · effective 2026-03-01",
        text: "Members in Kentucky can enroll in the Rx copay assistance pilot through an advocate. Eligibility is confirmed in the pharmacy system before enrollment.",
        citations: [cite("U-PH-010", 1, "Copay assistance program (Kentucky pilot)", "Pharmacy Ops", "2026-03-01", false)],
        intent: "copay_assistance",
      };
    }
    return {
      outcome: "insufficient_evidence",
      message: "Approved content exists but does not apply here. Logged as a gap.",
      text: null,
      intent: "copay_assistance",
    };
  }
  if (has("shipping fee")) {
    return {
      outcome: "stale",
      message: "Past its review date (2026-06-30). Do not present as current; owner notified.",
      text: "Standard shipping for mail order is at no extra cost.",
      citations: [cite("U-PH-008", 1, "Mail order shipping cost", "Pharmacy Ops", "2025-06-30", false)],
      intent: "shipping_cost",
    };
  }
  if (has("mail order delivery") || (has("how long") && has("mail"))) {
    if (!year) return { outcome: "needs_clarification", message: "Which plan year: 2026 or 2027?", text: null, choices: YEAR_CHOICES, intent: "mail_delivery_time" };
    if (year === "2027") {
      return {
        outcome: "answer",
        message: "Mail order delivery time (2027) · Pharmacy Ops · v1 · effective 2027-01-01",
        text: "6 to 9 business days after the prescription is received.",
        citations: [cite("U-PH-206", 1, "Mail order delivery time (2027)", "Pharmacy Ops", "2027-01-01", false)],
        intent: "mail_delivery_time",
      };
    }
    return {
      outcome: "answer",
      message: "Mail order delivery time · Pharmacy Ops · v1 · effective 2026-01-15",
      text: "7 to 10 business days after the prescription is received.",
      citations: [cite("U-PH-006", 1, "Mail order delivery time", "Pharmacy Ops", "2026-01-15", false)],
      intent: "mail_delivery_time",
    };
  }
  return GAP;
}

function buildTrace(req: SearchRequest, f: Fixture, requestId: string): string[] {
  const ent = ENTITLEMENTS[req.role] ?? "none";
  const safety = f.outcome === "safety_escalation";
  const trace = [
    `1. Resolve role and entitlements [D]: ${req.role}: ${ent}`,
    "2. Redact PHI/PII [D]: nothing to redact",
    `3. Safety pre-check [D+P]: ${safety ? "urgent language detected, human handoff" : "clear"}`,
  ];
  if (safety) return trace;
  const n = f.citations?.length ?? 0;
  return [
    ...trace,
    `4. Query understanding [P]: intent=${f.intent}`,
    `5. Hard partitions [D]: lob=${req.lob ?? "unknown"}, state=${req.state ?? "unknown"}, plan_year=${req.plan_year === undefined ? "2026" : (req.plan_year ?? "unknown")}, channel=${req.channel}`,
    `6. Search [D]: ${n} candidate unit(s)`,
    `7. Eligibility [D]: ${f.outcome === "not_authorized" ? "blocked by entitlements" : "eligible"}`,
    `8. Applicability [D]: ${f.outcome === "needs_clarification" ? "missing state" : "checked"}`,
    f.outcome === "stale" || f.outcome === "conflict"
      ? `9. Authority and recency [H]: ${f.outcome === "stale" ? "past review date, owner notified" : "sources disagree, routed to owners"}`
      : "9. Authority and recency [D]: ok",
    `10. Compose [D]: ${f.text ? (f.citations?.[0]?.verbatim ? "verbatim" : "grounded") : "no text"}`,
    "11. Verify [D+P]: passed",
    `12. Return outcome per part [D]: ${f.outcome}`,
    `13. Persist record [D]: ${requestId}`,
  ];
}

export function mockSearch(req: SearchRequest): SearchResponse {
  const f = match(req);
  const request_id = `req-${Date.now()}`;
  return {
    request_id,
    outcome: f.outcome,
    parts: [
      {
        part: f.intent,
        outcome: f.outcome,
        message: f.message,
        text: f.text,
        owner_team: f.owner_team ?? null,
        citations: f.citations ?? [],
        next_step: f.next_step ?? NEXT_STEPS[f.outcome] ?? null,
        choices: f.choices ?? [],
        trust: f.outcome === "answer" ? "approved" : f.outcome === "stale" ? "stale" : f.outcome === "conflict" ? "conflict" : null,
      },
    ],
    trace: buildTrace(req, f, request_id),
    engine: "mock-0.1",
  };
}

// ---------------------------------------------------------------------------
// Demo store seed. The shared demo store (src/services/demoStore.ts) starts
// from these fixtures and returns to them on "Reset demo".
import type { DemoState, DemoUnit } from "./demoStore";

const unit = (
  unit_id: string, title: string, owner: string, verbatim: boolean, status: string,
  versions: { version: number; text: string; effective_date: string; approver: string }[],
): DemoUnit => ({ unit_id, title, owner, verbatim, status, versions });

export function seedDemoState(): DemoState {
  return {
    epoch: 0,
    requests: [],
    readEvents: [],
    drafts: [],
    units: [
      unit("U-PH-003", "Pricing disclaimer (Rx)", "Compliance", true, "approved", [
        { version: 1, effective_date: "2026-01-15", approver: "Rita (Legal)",
          text: "The prices I share today are estimates based on your current plan and may change. Your final cost will be confirmed when your prescription is processed." },
      ]),
      unit("U-SH-002", "Call closing: no impact on membership", "Compliance", true, "approved", [
        { version: 1, effective_date: "2025-06-01", approver: "Rita (Legal)", text: "Your decision today has no impact on your plan membership." },
        { version: 2, effective_date: "2026-01-15", approver: "Rita (Legal)",
          text: "Your decision today has no impact on your plan membership. Is there anything else I can help you with today?" },
      ]),
      unit("U-PH-006", "Mail order delivery time", "Pharmacy Ops", false, "approved", [
        { version: 1, effective_date: "2026-01-15", approver: "Owen (Knowledge owner)",
          text: "7 to 10 business days after the prescription is received." },
      ]),
      unit("U-PH-007", "Days supply by mail (90-day)", "Pharmacy Ops", false, "approved", [
        { version: 1, effective_date: "2026-01-15", approver: "Owen (Knowledge owner)", text: "A 90-day supply is available by mail for most maintenance medications." },
      ]),
      unit("U-PH-107", "Days supply by mail (100-day, legacy)", "Outbound Pharmacy", false, "conflict", [
        { version: 3, effective_date: "2025-11-01", approver: "Owen (Knowledge owner)", text: "Members can get up to a 100-day supply of maintenance medications by mail." },
      ]),
      unit("U-PH-206", "Mail order delivery time (2027)", "Pharmacy Ops", false, "approved", [
        { version: 1, effective_date: "2027-01-01", approver: "Owen (Knowledge owner)", text: "6 to 9 business days after the prescription is received." },
      ]),
      unit("U-PH-207", "Days supply by mail (2027)", "Pharmacy Ops", false, "approved", [
        { version: 1, effective_date: "2027-01-01", approver: "Owen (Knowledge owner)", text: "Maintenance supply by mail is 84 days." },
      ]),
      unit("U-SH-001", "Opening statement", "Compliance", true, "approved", [
        { version: 1, effective_date: "2026-01-15", approver: "Rita (Legal)", text: "Thank you for calling. This call may be recorded for quality and training purposes." },
      ]),
      unit("U-SH-010", "Enrollment impact (fragment A)", "Compliance", true, "approved", [
        { version: 1, effective_date: "2026-01-15", approver: "Rita (Legal)", text: "Your request will affect your plan enrollment." },
      ]),
      unit("U-SH-011", "Enrollment impact (fragment B)", "Compliance", true, "approved", [
        { version: 1, effective_date: "2026-01-15", approver: "Rita (Legal)", text: "Your request will not affect your plan enrollment." },
      ]),
      unit("U-PH-204", "Mail order supply and delivery (2027 copy)", "Pharmacy Ops", false, "approved", [
        { version: 1, effective_date: "2027-01-01", approver: "Owen (Knowledge owner)", text: "Maintenance supply by mail is 84 days, delivered in 6 to 9 business days." },
      ]),
      unit("U-PH-012", "Saturday mail delivery", "Pharmacy Ops", false, "stale", [
        { version: 1, effective_date: "2025-09-30", approver: "Owen (Knowledge owner)", text: "Mail order packages can be delivered on Saturdays at no extra cost." },
      ]),
      unit("U-PH-020", "Luminexa formulary tier", "Pharmacy Ops", false, "approved", [
        { version: 1, effective_date: "2026-01-15", approver: "Owen (Knowledge owner)", text: "Luminexa is a Tier 3 preferred brand drug." },
      ]),
      unit("U-PH-008", "Mail order shipping cost", "Pharmacy Ops", false, "stale", [
        { version: 1, effective_date: "2025-06-30", approver: "Owen (Knowledge owner)", text: "Standard shipping for mail order is at no extra cost." },
      ]),
      unit("U-PH-010", "Copay assistance program (Kentucky pilot)", "Pharmacy Ops", false, "approved", [
        { version: 1, effective_date: "2026-03-01", approver: "Owen (Knowledge owner)",
          text: "Members in Kentucky can enroll in the Rx copay assistance pilot through an advocate. Eligibility is confirmed in the pharmacy system before enrollment." },
      ]),
    ],
    audit: [
      { at: "2026-01-15T09:00:00Z", actor: "Rita (Legal)", action: "approve", target: "U-PH-003", detail: "Verbatim v1 approved" },
    ],
    reviewTasks: [
      { id: "R-1", kind: "conflict", unit_ids: ["U-PH-007", "U-PH-107"], owner: "Pharmacy Ops", status: "open" },
      { id: "R-2", kind: "stale", unit_ids: ["U-PH-008"], owner: "Pharmacy Ops", status: "open" },
    ],
    feedback: [],
    chainDrafts: [],
    reverified: [],
  };
}

// ---------------------------------------------------------------------------
// Authoring chain fixtures: the sample source and what extraction finds in it.
import type { GateResult } from "./demoStore";

export const AEP_SAMPLE = {
  id: "SYN-AEP-2027",
  title: "AEP contact-center script 2027",
  text: [
    "Thank you for calling. This call may be recorded for quality and training purposes.",
    "The prices I give you today are estimates based on your current plan and might change. Your final cost will be confirmed once your prescription is processed.",
    "Fragment A: Your request will affect your plan enrollment.",
    "Fragment B: Your request will not affect your plan enrollment.",
    "For plan year 2027, maintenance supply by mail is 84 days. Delivery takes 6 to 9 business days after the prescription is received.",
    "Mail order packages can be delivered on Saturdays at no extra cost.",
    "[Coaching note: smile while you read the opening.]",
    "[Editor note: check with Legal before the October print run.]",
  ].join("\n\n"),
};

export type CandidateStatus = "unchanged" | "changed_flagged" | "changed" | "new" | "skipped";
export interface Candidate {
  cid: string;
  title: string;
  text: string;
  status: CandidateStatus;
  match?: { unit_id: string; version: number; text: string; exact?: boolean };
  duplicates?: { unit_id: string; title: string; similarity: number }[];
  route?: "legal" | "owner";
  owner_team?: string;
  verbatim?: boolean;
  tags?: string[];
  banner?: string;
  note?: string;
  suggestion?: string;
  skip_reason?: string;
  target_unit_id?: string;
  effective_date?: string;
  gate?: GateResult;
}

const P003 = "The prices I share today are estimates based on your current plan and may change. Your final cost will be confirmed when your prescription is processed.";
const LEGACY = "The prices I give you today are estimates based on your current plan and might change. Your final cost will be confirmed once your prescription is processed.";
const DAYS_2027 = "Maintenance supply by mail is 84 days. Delivery takes 6 to 9 business days after the prescription is received.";

export const AEP_CANDIDATES: Candidate[] = [
  { cid: "C1", title: "Opening statement", text: "Thank you for calling. This call may be recorded for quality and training purposes.", status: "unchanged",
    match: { unit_id: "U-SH-001", version: 1, text: "Thank you for calling. This call may be recorded for quality and training purposes.", exact: true }, verbatim: true, note: "Verbatim: exact match." },
  { cid: "C2", title: "Pricing disclaimer (legacy wording)", text: LEGACY, status: "changed_flagged", verbatim: true,
    match: { unit_id: "U-PH-003", version: 1, text: P003 }, duplicates: [{ unit_id: "U-PH-003", title: "Pricing disclaimer (Rx)", similarity: 0.67 }],
    route: "legal", owner_team: "Legal", target_unit_id: "U-PH-003", effective_date: "2027-01-01",
    banner: "Any change to verbatim is flagged. A model may raise priority but never clears a flag.",
    gate: { checked: 27, blocking: [{ case: "golden-pricing-disclaimer-01: \"pricing disclaimer\"", was: P003, now: LEGACY }], blocked_reason: "Blocked: contradicts approved U-PH-003" } },
  { cid: "C3", title: "Enrollment impact, fragment A", text: "Your request will affect your plan enrollment.", status: "unchanged", verbatim: true,
    match: { unit_id: "U-SH-010", version: 1, text: "Your request will affect your plan enrollment.", exact: true },
    banner: "Conflict note: two verbatim units disagree. Escalate.", suggestion: "Split: keep fragments A and B as separate units until Legal decides which applies." },
  { cid: "C4", title: "Enrollment impact, fragment B", text: "Your request will not affect your plan enrollment.", status: "unchanged", verbatim: true,
    match: { unit_id: "U-SH-011", version: 1, text: "Your request will not affect your plan enrollment.", exact: true },
    banner: "Conflict note: two verbatim units disagree. Escalate." },
  { cid: "C5", title: "Days supply by mail (2027)", text: DAYS_2027, status: "changed",
    match: { unit_id: "U-PH-207", version: 1, text: "Maintenance supply by mail is 84 days." },
    duplicates: [{ unit_id: "U-PH-204", title: "Mail order supply and delivery (2027 copy)", similarity: 0.81 }],
    route: "owner", owner_team: "Pharmacy Ops", tags: ["plan_year: 2027"], target_unit_id: "U-PH-207", effective_date: "2027-01-01",
    suggestion: "Merge: U-PH-204 says the same thing; retire it once this version is approved.",
    gate: { checked: 27, blocking: [] } },
  { cid: "C6", title: "Saturday mail delivery", text: "Mail order packages can be delivered on Saturdays at no extra cost.", status: "changed",
    match: { unit_id: "U-PH-012", version: 1, text: "Mail order packages can be delivered on Saturdays at no extra cost." },
    route: "owner", owner_team: "Pharmacy Ops", target_unit_id: "U-PH-012", effective_date: "2027-01-01",
    note: "Stale: review expired 2026-09-30", gate: { checked: 27, blocking: [] } },
  { cid: "C7", title: "Coaching note", text: "[Coaching note: smile while you read the opening.]", status: "skipped", skip_reason: "Coaching note for advocates, not member-facing knowledge." },
  { cid: "C8", title: "Editor note", text: "[Editor note: check with Legal before the October print run.]", status: "skipped", skip_reason: "Editor note about the document, not knowledge." },
];

/** Things that must be true before the 2027 Annual Election Period. */
export const AEP_READINESS = [
  { label: "Delivery time 2027 approved (U-PH-206)", unit_id: "U-PH-206", min_version: 1 },
  { label: "Opening statement checked (U-SH-001)", unit_id: "U-SH-001", min_version: 1 },
  { label: "Days supply 2027 with delivery (U-PH-207 v2)", unit_id: "U-PH-207", min_version: 2 },
  { label: "Saturday delivery re-verified (U-PH-012)", unit_id: "U-PH-012", reverify: true },
  { label: "Enrollment fragments conflict resolved (U-SH-010 / U-SH-011)", unit_id: "U-SH-011", reverify: true },
] as const;

/** Review queue seed demand (searches in the last 30 days, synthetic). */
export const REVIEW_DEMAND: Record<string, { demand: number; due: string }> = {
  "U-PH-008": { demand: 41, due: "2026-10-12" },
  "U-PH-012": { demand: 18, due: "2026-10-14" },
  "U-PH-007": { demand: 63, due: "2026-10-10" },
  "U-SH-011": { demand: 29, due: "2026-10-13" },
  "U-PH-207": { demand: 52, due: "2026-10-15" },
};
export const CHANGE_NOTICES = [
  { id: "CN-2027-04", title: "CMS: 2027 mail-order maximum days supply update", unit_id: "U-PH-207", due: "2026-10-15", demand: 0 },
];
