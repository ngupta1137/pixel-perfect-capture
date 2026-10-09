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
  };
}
