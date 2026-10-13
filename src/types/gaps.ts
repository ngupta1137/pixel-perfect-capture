export type GapType = "Insufficient" | "Conflicting" | "Outdated";
export type GapSeverity = "High" | "Medium" | "Low";
export type GapStatus = "Open" | "In review" | "Planned" | "Resolved";

export interface KnowledgeGap {
  id: string;
  topic: string;
  description: string;
  type: GapType;
  severity: GapSeverity;
  lastIdentified: string;
  relatedSearches: number;
  status: GapStatus;
  lob: string;
  state: string;
  summary: string;
  reasons: string[];
  activity: {
    user: string;
    action: string;
    date: string;
  }[];
  searchInsights?: {
    totalQueries: number;
    sampleQueries: string[];
    topChannels: string[];
  };
  relatedContent?: {
    id: string;
    title: string;
    type: string;
    similarity: string;
  }[];
  domain?: "Pharmacy" | "Insurance";
  knowledge_base?: "KB-PHARM" | "KB-INS";
  ownerTeam?: string;
  assignedOwner?: string;
  disposition?: "unit_created" | "process_fix";
  disposition_reason?: string;
  system_note?: string;
  resolved_by?: string;
  resolved_at?: string;
}

export const SEEDED_KNOWLEDGE_GAPS: KnowledgeGap[] = [
  {
    id: "GAP-001",
    topic: "Specialty and oncology medication mail-order delivery",
    description: "Members asking if specialty oncology medications can be filled via 90-day mail delivery.",
    type: "Insufficient",
    severity: "High",
    lastIdentified: "12 Oct 2026",
    relatedSearches: 28,
    status: "Open",
    lob: "MAPD",
    state: "All states",
    domain: "Pharmacy",
    knowledge_base: "KB-PHARM",
    ownerTeam: "Pharmacy Ops",
    assignedOwner: "Owen (Knowledge owner)",
    summary:
      "Advocates inquired whether specialty oncology drugs can be dispensed for 90 days by mail. S01 policy strictly applies to non-specialty maintenance medications.",
    reasons: [
      "Insufficient or no approved specialty mail-order policy",
      "High number of member inquiries on oral cancer therapy",
      "Essential for member affordability and clinical safety",
    ],
    activity: [
      {
        user: "System",
        action: "Identified from member and advocate searches (Scenario S03)",
        date: "12 Oct 2026",
      },
    ],
    searchInsights: {
      totalQueries: 28,
      sampleQueries: [
        "Can I get a 90-day supply of a specialty oncology drug by mail?",
        "Mail delivery for oral chemotherapy copay",
        "Is oncology medicine allowed under 90-day maintenance rule?",
      ],
      topChannels: ["Advocate portal (18)", "Member chat (7)", "Voice assistant (3)"],
    },
    relatedContent: [
      {
        id: "U-PH-001",
        title: "90-day mail-order supply eligibility",
        type: "Policy",
        similarity: "65%",
      },
    ],
  },
  {
    id: "GAP-002",
    topic: "Dental coverage and dental implant eligibility",
    description: "Members asking if comprehensive dental implants and prosthodontics are covered.",
    type: "Insufficient",
    severity: "High",
    lastIdentified: "11 Oct 2026",
    relatedSearches: 22,
    status: "Open",
    lob: "MAPD",
    state: "All states",
    domain: "Insurance",
    knowledge_base: "KB-INS",
    ownerTeam: "Insurance Benefits Ops",
    assignedOwner: "Olivia (Knowledge owner)",
    summary:
      "Frequent inquiries from members regarding dental implant coverage and preventive dental benefit limits. No dental knowledge units are currently published in the demo library.",
    reasons: [
      "No approved dental benefit units published in KB-INS",
      "High volume of member customer service escalations",
      "Requires clarification from Insurance Benefits Committee",
    ],
    activity: [
      {
        user: "System",
        action: "Identified from advocate searches (Scenario S03 / Golden Set)",
        date: "11 Oct 2026",
      },
    ],
    searchInsights: {
      totalQueries: 22,
      sampleQueries: [
        "Does this plan cover dental implants?",
        "What is the annual dental allowance for dentures?",
        "Do I need pre-authorization for dental crowns?",
      ],
      topChannels: ["Advocate portal (14)", "Member chat (8)"],
    },
    relatedContent: [
      {
        id: "U-IN-001",
        title: "Annual out-of-pocket maximum",
        type: "Benefit Details",
        similarity: "48%",
      },
    ],
  },
  {
    id: "GAP-003",
    topic: "Formulary Exception Appeals Escalation Process",
    description: "Prescribers and members inquiring about non-formulary drug tiering appeal escalation workflows.",
    type: "Insufficient",
    severity: "High",
    lastIdentified: "10 Oct 2026",
    relatedSearches: 19,
    status: "Open",
    lob: "MAPD",
    state: "All states",
    domain: "Pharmacy",
    knowledge_base: "KB-PHARM",
    ownerTeam: "Pharmacy Ops",
    assignedOwner: "Owen (Knowledge owner)",
    summary:
      "Prescribers and members frequently inquire about formulary exception and appeal workflows. Escalations are handled operationally via Provider Portal form FA-992 rather than requiring a published knowledge unit.",
    reasons: [
      "Frequent inquiries regarding formulary tiering appeals",
      "Process governed by operational claims workflow (FA-992)",
      "High impact on member escalations",
    ],
    activity: [
      {
        user: "System",
        action: "Identified from advocate searches (Scenario S03 / Golden Set)",
        date: "10 Oct 2026",
      },
    ],
    searchInsights: {
      totalQueries: 19,
      sampleQueries: [
        "How do I appeal a tier exception denial?",
        "Where do I send the formulary exception escalation form?",
        "Can a member appeal a formulary exception decision by phone?",
      ],
      topChannels: ["Advocate portal (14)", "Member chat (5)"],
    },
    relatedContent: [
      {
        id: "U-PH-021",
        title: "Formulary exceptions",
        type: "Policy",
        similarity: "78%",
      },
    ],
  },
  {
    id: "GAP-006",
    topic: "Vision hardware allowance for 2026",
    description: "Members inquiring about frame allowance, contact lens benefits, and exam copays.",
    type: "Insufficient",
    severity: "Medium",
    lastIdentified: "10 Oct 2026",
    relatedSearches: 17,
    status: "Open",
    lob: "MAPD",
    state: "All states",
    domain: "Insurance",
    knowledge_base: "KB-INS",
    ownerTeam: "Insurance Benefits Ops",
    assignedOwner: "Olivia (Knowledge owner)",
    summary:
      "Questions regarding annual vision hardware benefit allowances and participating optical network providers. Currently absent from active benefit schedule.",
    reasons: [
      "Vision benefit schedule not ingested into KB-INS",
      "Regular queries during open enrollment and benefits check",
    ],
    activity: [
      {
        user: "System",
        action: "Identified from advocate searches (Scenario S03)",
        date: "10 Oct 2026",
      },
    ],
    searchInsights: {
      totalQueries: 17,
      sampleQueries: [
        "What is the vision hardware allowance for 2026?",
        "Does the plan cover progressive lenses or designer frames?",
        "Can I use my vision benefit online for contacts?",
      ],
      topChannels: ["Advocate portal (12)", "Member chat (5)"],
    },
    relatedContent: [
      {
        id: "U-IN-001",
        title: "Annual out-of-pocket maximum",
        type: "Benefit Details",
        similarity: "52%",
      },
    ],
  },
  {
    id: "GAP-004",
    topic: "Acupuncture and herbal naturopathy alternative benefits",
    description: "Member inquiries regarding coverage for holistic therapies and licensed acupuncturists.",
    type: "Insufficient",
    severity: "Medium",
    lastIdentified: "09 Oct 2026",
    relatedSearches: 14,
    status: "In review",
    lob: "Commercial",
    state: "All states",
    domain: "Insurance",
    knowledge_base: "KB-INS",
    ownerTeam: "Insurance Benefits Ops",
    assignedOwner: "Olivia (Knowledge owner)",
    summary:
      "Alternative medicine benefit limits and clinical criteria for chronic pain acupuncture sessions. Draft guidance under review.",
    reasons: [
      "Emerging benefit demand with no standard policy unit",
      "Clinical guidelines required from medical director",
    ],
    activity: [
      {
        user: "Olivia (Knowledge owner)",
        action: "Draft scheduled for Q4 review cycle",
        date: "09 Oct 2026",
      },
    ],
    searchInsights: {
      totalQueries: 14,
      sampleQueries: [
        "Does the plan cover acupuncture for lower back pain?",
        "Is naturopathic medicine covered under alternative care?",
        "How many acupuncture visits per year are allowed?",
      ],
      topChannels: ["Member chat (9)", "Advocate portal (5)"],
    },
    relatedContent: [
      {
        id: "U-SH-001",
        title: "Opening statement",
        type: "Policy",
        similarity: "30%",
      },
    ],
  },
  {
    id: "GAP-005",
    topic: "Prior plan year mail-order rules (2025)",
    description: "Queries regarding legacy 2025 mail-order rules, refill windows, and superseded copays.",
    type: "Outdated",
    severity: "Low",
    lastIdentified: "08 Oct 2026",
    relatedSearches: 9,
    status: "Planned",
    lob: "MAPD",
    state: "All states",
    domain: "Pharmacy",
    knowledge_base: "KB-PHARM",
    ownerTeam: "Pharmacy Ops",
    assignedOwner: "Owen (Knowledge owner)",
    summary:
      "Members asking what the rules were in plan year 2025 before the 2026 mail-order updates took effect. The knowledge store is 2026-only.",
    reasons: [
      "Historical plan year content retired or omitted from active repository",
      "Occasional retroactive claims inquiries",
    ],
    activity: [
      {
        user: "Owen (Knowledge owner)",
        action: "Archival reference ticket created",
        date: "08 Oct 2026",
      },
    ],
    searchInsights: {
      totalQueries: 9,
      sampleQueries: [
        "What were the mail-order rules in the 2025 plan year?",
        "Has the maintenance drug refill schedule changed since 2025?",
        "Legacy 2025 mail-order copay schedule",
      ],
      topChannels: ["Advocate portal (6)", "Member chat (3)"],
    },
    relatedContent: [
      {
        id: "U-PH-001",
        title: "90-day mail-order supply eligibility",
        type: "Policy",
        similarity: "70%",
      },
    ],
  },
];
