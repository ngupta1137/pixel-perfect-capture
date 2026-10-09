import type { Citation, Outcome, Part as WirePart, SearchRequest, SearchResponse } from "./verity";
import type {
  AepStatus, AsOfResult, DraftRow, Escalation, FlagReceipt, Health, Part, ReadEvent,
  ReplayRecord, ReviewTask, Trust, UnitRecord,
} from "./contracts";

const ENTITLEMENTS: Record<string, string> = {
  pharmacy_advocate: "KB-PHARM, KB-SHARED",
  pharmacy_supervisor: "KB-PHARM, KB-SHARED",
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

function match(req: SearchRequest): Fixture {
  const q = req.query.toLowerCase();
  const has = (s: string) => q.includes(s);

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
  if (has("id card")) {
    if (req.role === "pharmacy_advocate" || req.role === "pharmacy_supervisor") {
      return {
        outcome: "not_authorized",
        message: "This is owned by Member Services (KB-INS). Transfer or ask that team.",
        text: null,
        owner_team: "Member Services",
        intent: "id_card_replacement",
      };
    }
    return {
      outcome: "answer",
      message: "ID card replacement · Member Services · v2 · effective 2026-01-15",
      text: "Members can request a replacement ID card online, in the app, or by calling Member Services. A new card arrives by mail in 7 to 10 days.",
      citations: [cite("U-IN-002", 2, "ID card replacement", "Member Services", "2026-01-15", false)],
      intent: "id_card_replacement",
    };
  }
  if ((has("days supply") || has("90")) && req.plan_year === 2027) {
    return {
      outcome: "answer",
      message: "Days supply by mail (plan year 2027) · Pharmacy Ops · v2 · effective 2027-01-01",
      text: "For plan year 2027, a 100-day supply is available by mail for most maintenance medications.",
      citations: [cite("U-PH-007", 2, "Days supply by mail", "Pharmacy Ops", "2027-01-01", false)],
      intent: "days_supply",
    };
  }
  if (has("days supply") || has("90")) {
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
  if (has("copay")) {
    if (!req.state) {
      return { outcome: "needs_clarification", message: "Which state is the member's plan in?", text: null, intent: "copay_assistance" };
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
  if (has("how long") && has("mail")) {
    return {
      outcome: "answer",
      message: "Mail order delivery time · Pharmacy Ops · v1 · effective 2026-01-15",
      text: "Mail order prescriptions typically arrive within 7 to 10 business days after the prescription is received from the doctor.",
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
    `5. Hard partitions [D]: lob=${req.lob ?? "unknown"}, state=${req.state ?? "unknown"}, plan_year=${req.plan_year ?? 2026}, channel=${req.channel}`,
    `6. Search [D]: ${n} candidate unit(s)`,
    `7. Eligibility [D]: ${f.outcome === "not_authorized" ? "blocked by entitlements" : "eligible"}`,
    `8. Applicability [D]: ${f.outcome === "needs_clarification" ? "missing state" : "checked"}`,
    `9. Authority and recency [D]: ${f.outcome === "stale" ? "past review date" : f.outcome === "conflict" ? "sources disagree" : "ok"}`,
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
      },
    ],
    trace: buildTrace(req, f, request_id),
    engine: "mock-0.1",
  };
}

/* ------------------------------------------------------------------ */
/* UI fixtures (UI_SPEC section 3). Synthetic; numbers are illustrative. */
/* ------------------------------------------------------------------ */

export const UNITS: UnitRecord[] = [
  {
    unitId: "U-PH-003", version: 1, kb: "KB-PHARM", category: "Disclosures", title: "Pricing disclaimer (Rx)",
    owner: "Compliance", approver: "Rita (Legal)", effectiveDate: "2026-01-15", reviewDate: "2027-01-15", planYear: 2026,
    verbatim: true, mustReadBeforeBenefits: true, trust: "approved", spanish: "Translation out of date",
    text: "The prices I share today are estimates based on your current plan and may change. Your final cost will be confirmed when your prescription is processed.",
    history: [{ version: 1, effectiveDate: "2026-01-15", approver: "Rita (Legal)" }],
  },
  {
    unitId: "U-SH-002", version: 2, kb: "KB-SHARED", category: "Call handling", title: "Call closing: no impact on membership",
    owner: "Compliance", approver: "Rita (Legal)", effectiveDate: "2026-01-15", reviewDate: "2027-01-15", planYear: 2026,
    verbatim: true, mustReadBeforeBenefits: false, trust: "approved", spanish: "Current",
    text: "Your decision today has no impact on your plan membership. Is there anything else I can help you with today?",
    history: [
      { version: 1, effectiveDate: "2025-01-15", approver: "Rita (Legal)" },
      { version: 2, effectiveDate: "2026-01-15", approver: "Rita (Legal)" },
    ],
  },
  {
    unitId: "U-PH-006", version: 1, kb: "KB-PHARM", category: "Mail order", title: "Mail order delivery time",
    owner: "Pharmacy Ops", approver: "Owen (Pharmacy Ops)", effectiveDate: "2026-01-15", reviewDate: "2027-01-15", planYear: 2026,
    verbatim: false, mustReadBeforeBenefits: false, trust: "approved", spanish: "Current",
    text: "Mail order prescriptions typically arrive within 7 to 10 business days after the prescription is received from the doctor.",
    history: [{ version: 1, effectiveDate: "2026-01-15", approver: "Owen (Pharmacy Ops)" }],
  },
  {
    unitId: "U-PH-007", version: 1, kb: "KB-PHARM", category: "Mail order", title: "Days supply by mail (90-day)",
    owner: "Pharmacy Ops", approver: "Owen (Pharmacy Ops)", effectiveDate: "2026-01-15", reviewDate: "2026-12-31", planYear: 2026,
    verbatim: false, mustReadBeforeBenefits: false, trust: "conflict", spanish: "None",
    text: "A 90-day supply is available by mail for most maintenance medications.",
    history: [{ version: 1, effectiveDate: "2026-01-15", approver: "Owen (Pharmacy Ops)" }],
  },
  {
    unitId: "U-PH-007", version: 2, kb: "KB-PHARM", category: "Mail order", title: "Days supply by mail",
    owner: "Pharmacy Ops", approver: "Owen (Pharmacy Ops)", effectiveDate: "2027-01-01", reviewDate: "2027-12-31", planYear: 2027,
    verbatim: false, mustReadBeforeBenefits: false, trust: "approved", spanish: "None",
    text: "For plan year 2027, a 100-day supply is available by mail for most maintenance medications.",
    history: [
      { version: 1, effectiveDate: "2026-01-15", approver: "Owen (Pharmacy Ops)" },
      { version: 2, effectiveDate: "2027-01-01", approver: "Owen (Pharmacy Ops)" },
    ],
  },
  {
    unitId: "U-PH-107", version: 3, kb: "KB-PHARM", category: "Mail order", title: "Days supply by mail (100-day, legacy)",
    owner: "Outbound Pharmacy", approver: "Owen (Pharmacy Ops)", effectiveDate: "2025-11-01", reviewDate: "2026-11-01", planYear: 2026,
    verbatim: false, mustReadBeforeBenefits: false, trust: "conflict", spanish: "None",
    text: "Members can get up to a 100-day supply of maintenance medications by mail.",
    history: [{ version: 3, effectiveDate: "2025-11-01", approver: "Owen (Pharmacy Ops)" }],
  },
  {
    unitId: "U-PH-008", version: 1, kb: "KB-PHARM", category: "Mail order", title: "Mail order shipping cost",
    owner: "Pharmacy Ops", approver: "Owen (Pharmacy Ops)", effectiveDate: "2025-06-30", reviewDate: "2026-06-30", planYear: 2026,
    verbatim: false, mustReadBeforeBenefits: false, trust: "stale", spanish: "None",
    text: "Standard shipping for mail order is at no extra cost.",
    history: [{ version: 1, effectiveDate: "2025-06-30", approver: "Owen (Pharmacy Ops)" }],
  },
  {
    unitId: "U-PH-010", version: 1, kb: "KB-PHARM", category: "Cost help", title: "Copay assistance program (Kentucky pilot)",
    owner: "Pharmacy Ops", approver: "Owen (Pharmacy Ops)", effectiveDate: "2026-03-01", reviewDate: "2027-03-01", planYear: 2026,
    verbatim: false, mustReadBeforeBenefits: false, trust: "approved", spanish: "None",
    text: "Members in Kentucky can enroll in the Rx copay assistance pilot through an advocate. Eligibility is confirmed in the pharmacy system before enrollment.",
    history: [{ version: 1, effectiveDate: "2026-03-01", approver: "Owen (Pharmacy Ops)" }],
  },
  {
    unitId: "U-IN-002", version: 2, kb: "KB-INS", category: "ID cards", title: "ID card replacement",
    owner: "Member Services", approver: "Olivia (Member Services)", effectiveDate: "2026-01-15", reviewDate: "2027-01-15", planYear: 2026,
    verbatim: false, mustReadBeforeBenefits: false, trust: "approved", spanish: "Current",
    text: "Members can request a replacement ID card online, in the app, or by calling Member Services. A new card arrives by mail in 7 to 10 days.",
    history: [
      { version: 1, effectiveDate: "2025-01-15", approver: "Olivia (Member Services)" },
      { version: 2, effectiveDate: "2026-01-15", approver: "Olivia (Member Services)" },
    ],
  },
  {
    unitId: "U-IN-005", version: 1, kb: "KB-INS", category: "Eligibility", title: "Special enrollment period basics",
    owner: "Member Services", approver: "Olivia (Member Services)", effectiveDate: "2026-01-15", reviewDate: "2027-01-15", planYear: 2026,
    verbatim: false, mustReadBeforeBenefits: false, trust: "approved", spanish: "None",
    text: "Some life events, such as moving out of the plan's service area, allow a member to change plans outside the annual election period.",
    history: [{ version: 1, effectiveDate: "2026-01-15", approver: "Olivia (Member Services)" }],
  },
];

/** Latest unit version for a plan year (falls back to any version). */
export function findUnit(unitId: string, version?: number): UnitRecord | undefined {
  const all = UNITS.filter((u) => u.unitId === unitId);
  return (version ? all.find((u) => u.version === version) : undefined) ?? all.at(-1);
}

/** Units visible in a scope, one row per unit id, for the given plan year. */
export function unitsInScope(scope: string[], planYear: 2026 | 2027): UnitRecord[] {
  const byId = new Map<string, UnitRecord>();
  for (const u of UNITS) {
    if (!scope.includes(u.kb)) continue;
    const cur = byId.get(u.unitId);
    if (u.planYear <= planYear && (!cur || u.version > cur.version)) byId.set(u.unitId, u);
  }
  return [...byId.values()];
}

/** Next steps written for advocates when Verity cannot answer (fixture wording). */
const NEXT_STEPS: Partial<Record<Outcome, (p: WirePart) => string>> = {
  insufficient_evidence: () =>
    "Tell the member you will confirm and call back. Do not answer from memory. Ask your supervisor if the member needs an answer now.",
  not_authorized: (p) =>
    `Transfer to ${p.owner_team ?? "the owning team"}. Say: "Let me connect you with the team that handles this."`,
  stale: () =>
    "Do not read this as current. Tell the member you are confirming the latest information, then ask your supervisor.",
  conflict: () =>
    "Do not pick a version. Tell the member you are confirming the correct amount, then ask your supervisor.",
  safety_escalation: () => "Stay on the line and transfer to the nurse line or 911 now.",
};

const TRUST_BY_OUTCOME: Partial<Record<Outcome, Trust>> = { answer: "approved", stale: "stale", conflict: "conflict" };

/** Wire part (engine shape) to the section 3 UI part. */
export function toViewPart(p: WirePart): Part {
  const trust = TRUST_BY_OUTCOME[p.outcome] ?? "approved";
  return {
    part: p.part,
    outcome: p.outcome,
    text: p.text,
    message: p.message,
    nextStep: p.next_step ?? NEXT_STEPS[p.outcome]?.(p) ?? null,
    ownerTeam: p.owner_team,
    mustReadBeforeBenefits: p.citations.some((c) => findUnit(c.unit_id, c.version)?.mustReadBeforeBenefits ?? false),
    citations: p.citations.map((c) => ({
      unitId: c.unit_id,
      version: c.version,
      title: c.title,
      effectiveDate: c.effective_date,
      owner: c.owner,
      verbatim: c.verbatim,
      trust,
    })),
  };
}

export const AEP_STATUS: AepStatus = { opensOn: "Oct 15, 2026", planYear: 2027, approved: 38, total: 51 };

export const ESCALATIONS: Escalation[] = [
  { id: "esc-1", advocate: "Priya", query: "how many days supply can I get by mail", kind: "flagged", at: "09:42" },
  { id: "esc-2", advocate: "Priya", query: "is there a shipping fee for mail order", kind: "unanswered", at: "10:15" },
  { id: "esc-3", advocate: "Jordan", query: "does my plan cover a shingles vaccine at the pharmacy", kind: "unanswered", at: "11:03" },
];

export function recordReadEvent(unitId: string, version: number, person: string): ReadEvent {
  return { unitId, version, person, at: new Date().toISOString() };
}

export function flagAnswer(unitId: string | null, reason: string): FlagReceipt {
  return { unitId, owner: (unitId && findUnit(unitId)?.owner) || "Knowledge Ops", reason };
}

export const REVIEW_TASKS: ReviewTask[] = [
  { id: "T-1", kind: "conflict", unitId: "U-PH-007", title: "Days supply by mail", owner: "Pharmacy Ops", demand: 41, due: "2026-10-12", verifier: "Owen", status: "open" },
  { id: "T-2", kind: "stale", unitId: "U-PH-008", title: "Mail order shipping cost", owner: "Pharmacy Ops", demand: 23, due: "2026-10-09", verifier: "Owen", status: "open" },
  { id: "T-3", kind: "aep_2027", unitId: "U-IN-005", title: "Special enrollment period basics", owner: "Member Services", demand: 12, due: "2026-10-14", verifier: "Olivia", status: "claimed" },
  { id: "T-4", kind: "flagged", unitId: "U-PH-006", title: "Mail order delivery time", owner: "Pharmacy Ops", demand: 7, due: "2026-10-20", verifier: "Owen", status: "open" },
];

export const DRAFTS: DraftRow[] = [
  {
    draftId: "D-101", unitId: "U-PH-003", title: "Pricing disclaimer (Rx)", kind: "verbatim change", routeTo: "Legal",
    proposedBy: "Dana", status: "In review with Legal", canDecide: false, whyNot: "Needs Legal: verbatim wording",
    diff: ["The prices I share today are estimates", "-may change", "+will not change"],
    impact: { allowed: false, checked: 24, blocking: [{ caseId: "G-007", query: "Rx pricing disclaimer", was: "may change", now: "will not change" }] },
  },
  {
    draftId: "D-102", unitId: "U-PH-006", title: "Mail order delivery time", kind: "standard change", routeTo: "Author",
    proposedBy: "Owen", status: "In review with Owner", canDecide: false, whyNot: "You proposed this: a second person must decide",
    diff: ["Mail order prescriptions typically arrive within", "-7 to 10", "+5 to 8", "business days"],
    impact: { allowed: true, checked: 24, blocking: [] },
  },
];

export const REPLAYS: ReplayRecord[] = [
  {
    requestId: "req-1760001000000", query: "Rx pricing disclaimer", persona: "pharmacy_advocate",
    context: { lob: "MAPD", state: "KY", planYear: 2026 },
    trace: mockSearch({ query: "Rx pricing disclaimer", role: "pharmacy_advocate", channel: "advocate_view", lob: "MAPD", state: "KY" }).trace,
    units: [{ unitId: "U-PH-003", version: 1, approver: "Rita (Legal)", effective: "2026-01-15" }], outcome: "answer",
  },
];

export const AS_OF: AsOfResult[] = [
  { unitId: "U-PH-007", asOf: "2026-06-01", version: 1, approver: "Owen (Pharmacy Ops)", effectiveFrom: "2026-01-15", effectiveTo: "2026-12-31" },
  { unitId: "U-PH-007", asOf: "2027-02-01", version: 2, approver: "Owen (Pharmacy Ops)", effectiveFrom: "2027-01-01", effectiveTo: null },
];

export const AUDIT_EVENTS = [
  { id: "A-1", at: "2026-10-08T14:02:00Z", actor: "Dana", action: "propose", unitId: "U-PH-003", detail: "Draft D-101" },
  { id: "A-2", at: "2026-10-08T14:20:00Z", actor: "Marcus", action: "denied", unitId: "U-PH-003", capability: "get_unit", reason: "KB-PHARM is outside scope" },
];

export const HEALTH: Health = {
  verbatimCompliance: 0.97, consistency: 0.99,
  aepReady: { done: 38, needed: 51, byOwner: [{ owner: "Pharmacy Ops", done: 17, needed: 22 }, { owner: "Member Services", done: 14, needed: 19 }, { owner: "Compliance", done: 7, needed: 10 }] },
  oldestGapDays: 19, reviewHoursPerUnit: 3.5, unansweredRate: 0.06,
};
