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
export interface UnitMeta {
  kb: string;
  verifier: string;
  review_date: string;
  applies_to: string;
  channels: string[];
  read_before_benefits?: boolean;
  content_type?: "Policy" | "Procedure" | "Legal" | "Guidance";
  lob?: "MAPD" | "Commercial" | "Medicaid" | "Exchange" | "All";
  state?: string;
  section?: string;
  last_updated?: string;
  next_review?: string;
  next_review_status?: "Current" | "Upcoming" | "Overdue";
  approved_by?: string;
  approved_on?: string;
  summary?: string;
  key_points?: string[];
  source_doc?: {
    title: string;
    doc_id: string;
    section: string;
    ingested_at: string;
    ingested_by: string;
    snippet?: string;
  };
  related_unit_ids?: string[];
}

export const UNIT_META: Record<string, UnitMeta> = {
  "U-PH-010": {
    kb: "KB-PHARM",
    verifier: "Owen (Knowledge owner)",
    review_date: "2025-01-12",
    applies_to: "MAPD, All states",
    channels: ["advocate_view", "member_chat", "voice"],
    content_type: "Policy",
    lob: "MAPD",
    state: "All states",
    section: "Section 4.2",
    last_updated: "2024-01-12",
    next_review: "12 Jan 2025",
    next_review_status: "Current",
    approved_by: "Pharmacy Ops",
    approved_on: "14 Jan 2024",
    summary:
      "Explains the copay assistance program for eligible members in the MAPD plan, including key eligibility criteria, covered medications and important member guidance.",
    key_points: [
      "Available for eligible members",
      "Applies to select medications",
      "Members need to meet program criteria",
    ],
    source_doc: {
      title: "2024 MAPD Evidence of Coverage - Pharmacy Guidelines",
      doc_id: "DOC-MAPD-2024-PH",
      section: "Section 4.2: Prescription Drug Copay Assistance",
      ingested_at: "10 Jan 2024",
      ingested_by: "Dana (Knowledge author)",
      snippet:
        "Members enrolled in MAPD coverage may apply for copay assistance on qualified formulary items. Eligibility is verified electronically against plan records.",
    },
    related_unit_ids: ["U-PH-021", "U-PH-022", "U-PH-007"],
  },
  "U-PH-006": {
    kb: "KB-PHARM",
    verifier: "Owen (Knowledge owner)",
    review_date: "2025-01-10",
    applies_to: "Mail order, plan year 2024",
    channels: ["advocate_view", "member_chat", "voice"],
    content_type: "Procedure",
    lob: "MAPD",
    state: "All states",
    section: "Section 2.1",
    last_updated: "2024-01-10",
    next_review: "10 Jan 2025",
    next_review_status: "Current",
    approved_by: "Pharmacy Ops",
    approved_on: "12 Jan 2024",
    summary:
      "Covers standard mail-order pharmacy benefits, 7 to 10 day delivery windows, and routine prescription refill protocols.",
    key_points: [
      "Standard shipping included at no extra cost",
      "7 to 10 business day delivery window",
      "Automatic refills available for maintenance drugs",
    ],
    source_doc: {
      title: "2024 Mail Order Pharmacy Handbook",
      doc_id: "DOC-MAIL-2024",
      section: "Section 2.1: Fulfillment Standards",
      ingested_at: "08 Jan 2024",
      ingested_by: "Dana (Knowledge author)",
    },
    related_unit_ids: ["U-PH-007", "U-PH-008", "U-PH-012"],
  },
  "U-PH-003": {
    kb: "KB-PHARM",
    verifier: "Rita (Legal)",
    review_date: "2027-01-15",
    applies_to: "All Rx plans, all states",
    channels: ["advocate_view", "member_chat", "voice"],
    read_before_benefits: true,
    content_type: "Legal",
    lob: "MAPD",
    state: "All states",
    section: "Section 1.0",
    last_updated: "2024-01-08",
    next_review: "15 Jan 2027",
    next_review_status: "Current",
    approved_by: "Rita (Legal)",
    approved_on: "08 Jan 2024",
    summary:
      "Mandatory verbatim disclosure for drug pricing estimates provided over phone or chat channels before claim adjudication.",
    key_points: [
      "Verbatim script required before pricing quotes",
      "Estimates only until claims are finalized",
      "Mandatory compliance safeguard",
    ],
    source_doc: {
      title: "Medicare Part D Compliance & Communication Standards",
      doc_id: "DOC-LEGAL-CMS-2024",
      section: "Section 1.0: Required Disclosures",
      ingested_at: "05 Jan 2024",
      ingested_by: "Rita (Legal)",
    },
    related_unit_ids: ["U-SH-002", "U-SH-001"],
  },
  "U-SH-002": {
    kb: "KB-SHARED",
    verifier: "Rita (Legal)",
    review_date: "2027-01-15",
    applies_to: "All plans, all states",
    channels: ["advocate_view", "voice"],
    content_type: "Guidance",
    lob: "MAPD",
    state: "All states",
    section: "Section 5.3",
    last_updated: "2024-01-02",
    next_review: "15 Jan 2027",
    next_review_status: "Current",
    approved_by: "Rita (Legal)",
    approved_on: "02 Jan 2024",
    summary:
      "Standard call closing statement assuring members their decisions during the call do not jeopardize their plan enrollment.",
    key_points: [
      "Mandatory closing script for customer advocates",
      "Assures member protection and trust",
      "Applicable across all lines of business",
    ],
    source_doc: {
      title: "Omnichannel Call Closing Protocols",
      doc_id: "DOC-SHARED-CLOSING",
      section: "Section 5.3: Disclosures",
      ingested_at: "01 Jan 2024",
      ingested_by: "Rita (Legal)",
    },
    related_unit_ids: ["U-SH-001", "U-PH-003"],
  },
  "U-PH-007": {
    kb: "KB-PHARM",
    verifier: "Owen (Knowledge owner)",
    review_date: "2026-12-31",
    applies_to: "Mail order, plan year 2024",
    channels: ["advocate_view", "member_chat", "voice"],
    content_type: "Procedure",
    lob: "MAPD",
    state: "All states",
    section: "Section 3.1",
    last_updated: "2023-12-20",
    next_review: "31 Dec 2026",
    next_review_status: "Current",
    approved_by: "Pharmacy Ops",
    approved_on: "20 Dec 2023",
    summary:
      "Specifies the standard 90-day maintenance medication supply limit available through home delivery mail-order pharmacy.",
    key_points: [
      "90-day supply maximum for maintenance medications",
      "Applies to participating mail pharmacies",
      "Specialty exclusions apply",
    ],
    source_doc: {
      title: "2024 Mail Order Pharmacy Handbook",
      doc_id: "DOC-MAIL-2024",
      section: "Section 3.1: Supply Limits",
      ingested_at: "18 Dec 2023",
      ingested_by: "Dana (Knowledge author)",
    },
    related_unit_ids: ["U-PH-006", "U-PH-107", "U-PH-207"],
  },
  "U-SH-015": {
    kb: "KB-SHARED",
    verifier: "Owen (Knowledge owner)",
    review_date: "2024-12-18",
    applies_to: "All plans, all states",
    channels: ["advocate_view", "member_chat", "voice"],
    content_type: "Procedure",
    lob: "MAPD",
    state: "All states",
    section: "Section 1.4",
    last_updated: "2023-12-18",
    next_review: "18 Dec 2024",
    next_review_status: "Current",
    approved_by: "Member Services Ops",
    approved_on: "18 Dec 2023",
    summary:
      "Instructions for ordering replacement physical ID cards, downloading digital cards from the member portal, and verifying identity.",
    key_points: [
      "Digital card available instantly in mobile portal",
      "Physical replacements ship in 5 to 7 business days",
      "Temporary proof of coverage printable online",
    ],
    source_doc: {
      title: "Member Services Onboarding & Identification Guide",
      doc_id: "DOC-MEM-ID-2024",
      section: "Section 1.4: Card Issuance",
      ingested_at: "15 Dec 2023",
      ingested_by: "Dana (Knowledge author)",
    },
    related_unit_ids: ["U-SH-016", "U-SH-001"],
  },
  "U-SH-016": {
    kb: "KB-SHARED",
    verifier: "Owen (Knowledge owner)",
    review_date: "2024-12-12",
    applies_to: "All plans, all states",
    channels: ["advocate_view", "member_chat", "voice"],
    content_type: "Procedure",
    lob: "MAPD",
    state: "All states",
    section: "Section 2.3",
    last_updated: "2023-12-12",
    next_review: "12 Dec 2024",
    next_review_status: "Current",
    approved_by: "Provider Network Ops",
    approved_on: "12 Dec 2023",
    summary:
      "Guidance on member selection and effective date rules when changing assigned primary care physicians in HMO/PPO plans.",
    key_points: [
      "Changes take effect the 1st of following month",
      "In-network provider verification required",
      "Auto-assignment rules apply for unassigned members",
    ],
    source_doc: {
      title: "Provider Network Administration Manual",
      doc_id: "DOC-PROV-PCP-2024",
      section: "Section 2.3: Member Provider Changes",
      ingested_at: "10 Dec 2023",
      ingested_by: "Dana (Knowledge author)",
    },
    related_unit_ids: ["U-SH-015"],
  },
  "U-PH-021": {
    kb: "KB-PHARM",
    verifier: "Owen (Knowledge owner)",
    review_date: "2024-12-05",
    applies_to: "Formulary, all states",
    channels: ["advocate_view", "member_chat", "voice"],
    content_type: "Policy",
    lob: "MAPD",
    state: "All states",
    section: "Section 4.1",
    last_updated: "2023-12-05",
    next_review: "05 Dec 2024",
    next_review_status: "Current",
    approved_by: "Pharmacy Ops",
    approved_on: "05 Dec 2023",
    summary:
      "Criteria and clinical submission guidelines for tiering and non-formulary drug exception requests.",
    key_points: [
      "Prescriber supporting statement required",
      "Standard 72-hour / Expedited 24-hour determinations",
      "Tier exception rules for brand name medications",
    ],
    source_doc: {
      title: "2024 Comprehensive Formulary Administration Guidelines",
      doc_id: "DOC-FORM-2024",
      section: "Section 4.1: Formulary Exceptions",
      ingested_at: "01 Dec 2023",
      ingested_by: "Dana (Knowledge author)",
    },
    related_unit_ids: ["U-PH-022", "U-PH-023", "U-PH-020"],
  },
  "U-PH-022": {
    kb: "KB-PHARM",
    verifier: "Rita (Legal)",
    review_date: "2024-12-02",
    applies_to: "Clinical oversight, all states",
    channels: ["advocate_view"],
    content_type: "Policy",
    lob: "MAPD",
    state: "All states",
    section: "Section 4.5",
    last_updated: "2023-12-02",
    next_review: "02 Dec 2024",
    next_review_status: "Upcoming",
    approved_by: "Clinical Governance Committee",
    approved_on: "02 Dec 2023",
    summary:
      "Internal clinical protocol outlining medical director oversight and Pharmacy & Therapeutics committee review guidelines.",
    key_points: [
      "Currently in annual P&T review cycle",
      "Requires medical director sign-off",
      "Updated guidance pending final approval",
    ],
    source_doc: {
      title: "Clinical Governance & P&T Committee Bylaws",
      doc_id: "DOC-CLIN-GOV-2024",
      section: "Section 4.5: Review Standards",
      ingested_at: "28 Nov 2023",
      ingested_by: "Dana (Knowledge author)",
    },
    related_unit_ids: ["U-PH-021", "U-PH-023"],
  },
  "U-PH-023": {
    kb: "KB-PHARM",
    verifier: "Owen (Knowledge owner)",
    review_date: "2024-11-28",
    applies_to: "Formulary, all states",
    channels: ["advocate_view", "member_chat", "voice"],
    content_type: "Policy",
    lob: "MAPD",
    state: "All states",
    section: "Section 4.3",
    last_updated: "2023-11-28",
    next_review: "28 Nov 2024",
    next_review_status: "Current",
    approved_by: "Pharmacy Ops",
    approved_on: "28 Nov 2023",
    summary:
      "Outlines required prerequisite trial medication rules before coverage of higher-cost second-line alternatives.",
    key_points: [
      "Requires proven trial of generic first-line therapy",
      "Automatic electronic claim verification",
      "Prescriber medical necessity override path",
    ],
    source_doc: {
      title: "2024 Comprehensive Formulary Administration Guidelines",
      doc_id: "DOC-FORM-2024",
      section: "Section 4.3: Step Therapy Protocols",
      ingested_at: "25 Nov 2023",
      ingested_by: "Dana (Knowledge author)",
    },
    related_unit_ids: ["U-PH-021", "U-PH-020"],
  },
  "U-PH-024": {
    kb: "KB-PHARM",
    verifier: "Owen (Knowledge owner)",
    review_date: "2024-11-24",
    applies_to: "Prior Authorization, all states",
    channels: ["advocate_view", "member_chat", "voice"],
    content_type: "Procedure",
    lob: "MAPD",
    state: "All states",
    section: "Section 5.1",
    last_updated: "2023-11-24",
    next_review: "24 Nov 2024",
    next_review_status: "Current",
    approved_by: "Pharmacy Ops",
    approved_on: "24 Nov 2023",
    summary: "Standard and expedited turnaround timelines for medication prior authorization submissions.",
    key_points: ["Standard determination within 72 hours", "Expedited determination within 24 hours", "Peer-to-peer physician consult available"],
    related_unit_ids: ["U-PH-021", "U-PH-025"],
  },
  "U-PH-025": {
    kb: "KB-PHARM",
    verifier: "Owen (Knowledge owner)",
    review_date: "2024-11-20",
    applies_to: "Specialty pharmacy, all states",
    channels: ["advocate_view", "voice"],
    content_type: "Procedure",
    lob: "MAPD",
    state: "All states",
    section: "Section 6.2",
    last_updated: "2023-11-20",
    next_review: "20 Nov 2024",
    next_review_status: "Current",
    approved_by: "Specialty Pharmacy Ops",
    approved_on: "20 Nov 2023",
    summary: "Enrollment steps, clinical onboarding, and home injection training for specialty tier medications.",
    key_points: ["Dedicated clinical care coordinator assigned", "Temperature-controlled priority courier shipping", "Refill reminders via automated SMS/call"],
    related_unit_ids: ["U-PH-024", "U-PH-006"],
  },
  "U-PH-026": {
    kb: "KB-PHARM",
    verifier: "Owen (Knowledge owner)",
    review_date: "2024-11-15",
    applies_to: "Emergency overrides, all states",
    channels: ["advocate_view", "voice"],
    content_type: "Policy",
    lob: "MAPD",
    state: "All states",
    section: "Section 3.4",
    last_updated: "2023-11-15",
    next_review: "15 Nov 2024",
    next_review_status: "Current",
    approved_by: "Pharmacy Ops",
    approved_on: "15 Nov 2023",
    summary: "Emergency 72-hour transitional supply policy when prior authorization or formulary check is pending.",
    key_points: ["Available once per transition period", "Immediate retail pharmacy dispensing override", "Zero cost penalty for members during emergency"],
    related_unit_ids: ["U-PH-024", "U-PH-021"],
  },
  "U-SH-027": {
    kb: "KB-SHARED",
    verifier: "Rita (Legal)",
    review_date: "2024-11-10",
    applies_to: "Dual coverage, all states",
    channels: ["advocate_view", "member_chat"],
    content_type: "Guidance",
    lob: "MAPD",
    state: "All states",
    section: "Section 7.1",
    last_updated: "2023-11-10",
    next_review: "10 Nov 2024",
    next_review_status: "Current",
    approved_by: "Coordination of Benefits Unit",
    approved_on: "10 Nov 2023",
    summary: "Determines primary vs secondary payer hierarchy when a member holds commercial and Medicare dual coverage.",
    key_points: ["NAIC model coordination rules apply", "Automated real-time secondary payer billing", "Coordination questionnaire updated annually"],
    related_unit_ids: ["U-SH-028"],
  },
  "U-SH-028": {
    kb: "KB-SHARED",
    verifier: "Rita (Legal)",
    review_date: "2024-11-05",
    applies_to: "Appeals, all states",
    channels: ["advocate_view", "voice"],
    content_type: "Legal",
    lob: "MAPD",
    state: "All states",
    section: "Section 8.0",
    last_updated: "2023-11-05",
    next_review: "05 Nov 2024",
    next_review_status: "Current",
    approved_by: "Rita (Legal)",
    approved_on: "05 Nov 2023",
    summary: "CMS-mandated member grievance and appeal rights, submission windows, and escalation procedures.",
    key_points: ["60 calendar days from initial denial to file appeal", "Fast-track 72-hour appeal for urgent health needs", "Independent Review Entity (IRE) rights"],
    related_unit_ids: ["U-PH-003", "U-SH-002"],
  },
  "U-PH-206": {
    kb: "KB-PHARM",
    verifier: "Owen (Knowledge owner)",
    review_date: "2027-12-31",
    applies_to: "Mail order, plan year 2027",
    channels: ["advocate_view", "member_chat", "voice"],
    content_type: "Procedure",
    lob: "MAPD",
    state: "All states",
    section: "Section 2.2",
    last_updated: "2023-11-01",
    next_review: "31 Dec 2027",
    next_review_status: "Current",
    approved_by: "Owen (Knowledge owner)",
    approved_on: "01 Nov 2023",
    summary: "Updated 2027 delivery standard: 6 to 9 business days after prescription is received.",
    key_points: ["6 to 9 business day delivery", "Plan year 2027", "Expedited carrier integration"],
    related_unit_ids: ["U-PH-207", "U-PH-204"],
  },
  "U-PH-207": {
    kb: "KB-PHARM",
    verifier: "Owen (Knowledge owner)",
    review_date: "2027-12-31",
    applies_to: "Mail order, plan year 2027",
    channels: ["advocate_view", "member_chat", "voice"],
    content_type: "Procedure",
    lob: "MAPD",
    state: "All states",
    section: "Section 3.2",
    last_updated: "2023-10-28",
    next_review: "31 Dec 2027",
    next_review_status: "Current",
    approved_by: "Owen (Knowledge owner)",
    approved_on: "28 Oct 2023",
    summary: "Maintenance supply by mail for plan year 2027 is 84 days.",
    key_points: ["84-day maximum supply", "Plan year 2027 CMS alignment", "Applies to 2027 AEP renewals"],
    related_unit_ids: ["U-PH-206", "U-PH-007"],
  },
  "U-SH-001": {
    kb: "KB-SHARED",
    verifier: "Rita (Legal)",
    review_date: "2026-01-15",
    applies_to: "All calls, all states",
    channels: ["advocate_view", "voice"],
    content_type: "Legal",
    lob: "MAPD",
    state: "All states",
    section: "Section 1.1",
    last_updated: "2023-10-25",
    next_review: "15 Jan 2026",
    next_review_status: "Current",
    approved_by: "Rita (Legal)",
    approved_on: "25 Oct 2023",
    summary: "Standard call opening disclosure stating call recording for quality and training purposes.",
    key_points: ["Verbatim call greeting", "Required for all inbound advocate interactions", "CMS compliance rule"],
    verbatim: true,
    related_unit_ids: ["U-SH-002", "U-PH-003"],
  },
  "U-SH-010": {
    kb: "KB-SHARED",
    verifier: "Rita (Legal)",
    review_date: "2026-01-15",
    applies_to: "Enrollment changes",
    channels: ["advocate_view"],
    content_type: "Legal",
    lob: "MAPD",
    state: "All states",
    section: "Section 1.3A",
    last_updated: "2023-10-20",
    next_review: "15 Jan 2026",
    next_review_status: "Current",
    approved_by: "Rita (Legal)",
    approved_on: "20 Oct 2023",
    summary: "Verbatim enrollment disclosure statement regarding plan status change (Fragment A).",
    key_points: ["Verbatim script", "Subject to legal verification", "Used during enrollment modifications"],
    verbatim: true,
    related_unit_ids: ["U-SH-011"],
  },
  "U-SH-011": {
    kb: "KB-SHARED",
    verifier: "Rita (Legal)",
    review_date: "2026-01-15",
    applies_to: "Enrollment queries",
    channels: ["advocate_view"],
    content_type: "Legal",
    lob: "MAPD",
    state: "All states",
    section: "Section 1.3B",
    last_updated: "2023-10-18",
    next_review: "15 Jan 2026",
    next_review_status: "Current",
    approved_by: "Rita (Legal)",
    approved_on: "18 Oct 2023",
    summary: "Verbatim enrollment disclosure statement regarding no plan status change (Fragment B).",
    key_points: ["Verbatim script", "Subject to legal verification", "Used when requests do not impact enrollment"],
    verbatim: true,
    related_unit_ids: ["U-SH-010"],
  },
  "U-PH-204": {
    kb: "KB-PHARM",
    verifier: "Owen (Knowledge owner)",
    review_date: "2027-01-01",
    applies_to: "Mail order, 2027 copy",
    channels: ["advocate_view"],
    content_type: "Procedure",
    lob: "MAPD",
    state: "All states",
    section: "Section 3.3",
    last_updated: "2023-10-15",
    next_review: "01 Jan 2027",
    next_review_status: "Current",
    approved_by: "Owen (Knowledge owner)",
    approved_on: "15 Oct 2023",
    summary: "Combined mail order supply (84 days) and delivery window (6 to 9 days) for 2027.",
    key_points: ["Consolidated 2027 mail order text", "Candidate for post-AEP retirement into U-PH-207"],
    related_unit_ids: ["U-PH-206", "U-PH-207"],
  },
  "U-PH-012": {
    kb: "KB-PHARM",
    verifier: "Owen (Knowledge owner)",
    review_date: "2025-09-30",
    applies_to: "Mail delivery",
    channels: ["advocate_view"],
    content_type: "Procedure",
    lob: "MAPD",
    state: "All states",
    section: "Section 2.4",
    last_updated: "2023-10-10",
    next_review: "30 Sep 2025",
    next_review_status: "Overdue",
    approved_by: "Owen (Knowledge owner)",
    approved_on: "10 Oct 2023",
    summary: "Policy regarding Saturday mail delivery of urgent prescriptions at no extra charge.",
    key_points: ["Review expired on 2025-09-30", "Needs re-verification by Pharmacy Ops"],
    related_unit_ids: ["U-PH-006", "U-PH-008"],
  },
  "U-PH-020": {
    kb: "KB-PHARM",
    verifier: "Owen (Knowledge owner)",
    review_date: "2026-12-31",
    applies_to: "Formulary, all states",
    channels: ["advocate_view"],
    content_type: "Policy",
    lob: "MAPD",
    state: "All states",
    section: "Section 4.4",
    last_updated: "2023-10-05",
    next_review: "31 Dec 2026",
    next_review_status: "Current",
    approved_by: "Owen (Knowledge owner)",
    approved_on: "05 Oct 2023",
    summary: "Luminexa drug formulary classification as a Tier 3 preferred brand medication.",
    key_points: ["Tier 3 Preferred Brand", "Requires clinical review for tier reduction exception"],
    related_unit_ids: ["U-PH-021", "U-PH-023"],
  },
  "U-PH-008": {
    kb: "KB-PHARM",
    verifier: "Owen (Knowledge owner)",
    review_date: "2025-06-30",
    applies_to: "Mail order",
    channels: ["advocate_view"],
    content_type: "Procedure",
    lob: "MAPD",
    state: "All states",
    section: "Section 2.5",
    last_updated: "2023-10-01",
    next_review: "30 Jun 2025",
    next_review_status: "Overdue",
    approved_by: "Owen (Knowledge owner)",
    approved_on: "01 Oct 2023",
    summary: "Standard shipping for mail order prescriptions is provided at no extra cost.",
    key_points: ["Review expired on 2025-06-30", "Queued for re-verification"],
    related_unit_ids: ["U-PH-006", "U-PH-012"],
  },
  "U-PH-107": {
    kb: "KB-PHARM",
    verifier: "Owen (Knowledge owner)",
    review_date: "2026-11-01",
    applies_to: "Mail order, legacy",
    channels: ["advocate_view"],
    content_type: "Procedure",
    lob: "MAPD",
    state: "All states",
    section: "Section 3.1-legacy",
    last_updated: "2023-09-20",
    next_review: "01 Nov 2026",
    next_review_status: "Current",
    approved_by: "Owen (Knowledge owner)",
    approved_on: "20 Sep 2023",
    summary: "Legacy rule stating up to 100-day supply of maintenance medications by mail.",
    key_points: ["Legacy 100-day rule in conflict with 90-day standard U-PH-007"],
    related_unit_ids: ["U-PH-007"],
  },
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
      unit("U-PH-010", "Copay assistance program", "Pharmacy Ops", false, "approved", [
        { version: 1, effective_date: "2026-03-01", approver: "Owen (Knowledge owner)",
          text: "Members in Kentucky can enroll in the Rx copay assistance pilot through an advocate. Eligibility is confirmed in the pharmacy system before enrollment." },
      ]),
      unit("U-PH-006", "Mail order benefits", "Pharmacy Ops", false, "approved", [
        { version: 1, effective_date: "2026-01-15", approver: "Owen (Knowledge owner)",
          text: "7 to 10 business days after the prescription is received." },
      ]),
      unit("U-PH-003", "Rx pricing disclaimer", "Compliance", true, "approved", [
        { version: 1, effective_date: "2026-01-15", approver: "Rita (Legal)",
          text: "The prices I share today are estimates based on your current plan and may change. Your final cost will be confirmed when your prescription is processed." },
      ]),
      unit("U-SH-002", "Call closing: no impact on membership", "Compliance", true, "approved", [
        { version: 1, effective_date: "2025-06-01", approver: "Rita (Legal)", text: "Your decision today has no impact on your plan membership." },
        { version: 2, effective_date: "2026-01-15", approver: "Rita (Legal)",
          text: "Your decision today has no impact on your plan membership. Is there anything else I can help you with today?" },
      ]),
      unit("U-PH-007", "Days supply by mail (90-day)", "Pharmacy Ops", false, "approved", [
        { version: 1, effective_date: "2024-01-01", approver: "Pharmacy Ops", text: "A 90-day supply is available by mail for most maintenance medications." },
      ]),
      unit("U-SH-015", "Member ID card", "Member Services Ops", false, "approved", [
        { version: 1, effective_date: "2024-01-01", approver: "Member Services Ops", text: "Replacement ID cards ship in 5 to 7 business days. Digital cards are accessible immediately via the portal." },
      ]),
      unit("U-SH-016", "Change primary care provider", "Provider Network Ops", false, "approved", [
        { version: 1, effective_date: "2024-01-01", approver: "Provider Network Ops", text: "Members can change their primary care physician online or via advocate support, effective the 1st of next month." },
      ]),
      unit("U-PH-021", "Formulary exceptions", "Pharmacy Ops", false, "approved", [
        { version: 1, effective_date: "2023-01-01", approver: "Owen (Knowledge owner)", text: "Initial exception criteria." },
        { version: 2, effective_date: "2024-01-01", approver: "Pharmacy Ops", text: "Prescribers may request tier exceptions or non-formulary drug coverage by submitting clinical justification." },
      ]),
      unit("U-PH-022", "Clinical review process", "Clinical Governance Committee", false, "under_review", [
        { version: 1, effective_date: "2024-01-01", approver: "Clinical Governance Committee", text: "Clinical review workflows require clinical pharmacist evaluation and medical director concurrence." },
      ]),
      unit("U-PH-023", "Step therapy requirements", "Pharmacy Ops", false, "approved", [
        { version: 1, effective_date: "2024-01-01", approver: "Pharmacy Ops", text: "Step therapy requires trying first-line generic medications prior to second-line brand approvals." },
      ]),
      unit("U-PH-024", "Prior authorization turnaround times", "Pharmacy Ops", false, "approved", [
        { version: 1, effective_date: "2024-01-01", approver: "Pharmacy Ops", text: "Standard prior authorization requests are reviewed within 72 hours; expedited urgent requests within 24 hours." },
      ]),
      unit("U-PH-025", "Specialty pharmacy enrollment", "Specialty Pharmacy Ops", false, "approved", [
        { version: 1, effective_date: "2024-01-01", approver: "Specialty Pharmacy Ops", text: "Specialty medications require specialized cold-chain shipment and dedicated advocate clinical onboarding." },
      ]),
      unit("U-PH-026", "Emergency 72-hour supply", "Pharmacy Ops", false, "approved", [
        { version: 1, effective_date: "2024-01-01", approver: "Pharmacy Ops", text: "A temporary 72-hour emergency supply is authorized when urgent therapy cannot wait for prior authorization." },
      ]),
      unit("U-SH-027", "Coordination of benefits (COB)", "Coordination of Benefits Unit", false, "approved", [
        { version: 1, effective_date: "2024-01-01", approver: "Rita (Legal)", text: "When a member is covered by both commercial and Medicare plans, standard payer hierarchy rules dictate primary claims." },
      ]),
      unit("U-SH-028", "Appeals and grievances filing", "Compliance", true, "approved", [
        { version: 1, effective_date: "2024-01-01", approver: "Rita (Legal)", text: "Members have 60 calendar days from a denial notice to file an appeal in writing or via customer service." },
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
      unit("U-PH-107", "Days supply by mail (100-day, legacy)", "Outbound Pharmacy", false, "conflict", [
        { version: 3, effective_date: "2025-11-01", approver: "Owen (Knowledge owner)", text: "Members can get up to a 100-day supply of maintenance medications by mail." },
      ]),
    ],
    audit: [
      { at: "2026-10-08T14:02:00Z", actor: "Dana", action: "denied", target: "approve U-PH-207", detail: "Approve own draft", capability: "approve_standard", reason: "Maker-checker: the proposer cannot approve" },
      { at: "2026-10-07T10:30:00Z", actor: "Alex", action: "denied", target: "/", detail: "Open Ask", capability: "search", reason: "Access administrators cannot search content" },
      { at: "2026-01-15T09:00:00Z", actor: "Rita (Legal)", action: "approve", target: "U-PH-003", detail: "Verbatim v1 approved" },
    ],
    reviewTasks: [
      { id: "R-1", kind: "conflict", unit_ids: ["U-PH-007", "U-PH-107"], owner: "Pharmacy Ops", status: "open" },
      { id: "R-2", kind: "stale", unit_ids: ["U-PH-008"], owner: "Pharmacy Ops", status: "open" },
    ],
    feedback: [],
    chainDrafts: [],
    reverified: [],
    access: {
      pharmacy_advocate: ["KB-PHARM", "KB-SHARED"],
      insurance_advocate: ["KB-INS", "KB-SHARED"],
      advocate_supervisor: ["KB-PHARM", "KB-SHARED"],
      member_chat: ["KB-PHARM", "KB-INS"],
      ai_agent: ["KB-PHARM", "KB-SHARED"],
    },
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
