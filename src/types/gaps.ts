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
}

export const SEEDED_KNOWLEDGE_GAPS: KnowledgeGap[] = [
  {
    id: "GAP-001",
    topic: "Prior authorization for GLP-1 medications",
    description: "Members are asking about coverage criteria and required documentation.",
    type: "Insufficient",
    severity: "High",
    lastIdentified: "12 Jan 2024",
    relatedSearches: 28,
    status: "Open",
    lob: "MAPD",
    state: "All states",
    domain: "Pharmacy",
    knowledge_base: "KB-PHARM",
    ownerTeam: "Pharmacy Ops",
    assignedOwner: "Owen (Knowledge owner)",
    summary:
      "Members are asking about coverage criteria and required documentation for GLP-1 medications (e.g., semaglutide, tirzepatide). There is no approved knowledge unit covering this topic.",
    reasons: [
      "Insufficient or no approved content",
      "High number of member questions",
      "Important for coverage and access decisions",
    ],
    activity: [
      {
        user: "System",
        action: "Identified from member searches",
        date: "12 Jan 2024",
      },
    ],
    searchInsights: {
      totalQueries: 28,
      sampleQueries: [
        "Is Ozempic covered under MAPD 2024?",
        "Prior authorization criteria for Wegovy weight loss",
        "Formulary status for Mounjaro vs Ozempic",
      ],
      topChannels: ["Advocate portal (18)", "Member chat (7)", "Voice assistant (3)"],
    },
    relatedContent: [
      {
        id: "U-PH-021",
        title: "Formulary exceptions & tiering reviews",
        type: "Policy",
        similarity: "65%",
      },
      {
        id: "U-PH-024",
        title: "Prior authorization turnaround times",
        type: "Procedure",
        similarity: "58%",
      },
    ],
  },
  {
    id: "GAP-002",
    topic: "Home delivery for specialty medications",
    description: "Conflicting information across regional policies.",
    type: "Conflicting",
    severity: "High",
    lastIdentified: "10 Jan 2024",
    relatedSearches: 17,
    status: "In review",
    lob: "MAPD",
    state: "All states",
    domain: "Pharmacy",
    knowledge_base: "KB-PHARM",
    ownerTeam: "Pharmacy Ops",
    assignedOwner: "Owen (Knowledge owner)",
    summary:
      "Conflicting information across regional policies regarding courier signature requirements and cold-chain storage guidelines for high-cost biologic home delivery.",
    reasons: [
      "Discrepancy between regional handbook and master specialty protocol",
      "Potential compliance risk regarding refrigerated shipment receipt",
      "Escalated to Pharmacy Ops and Legal",
    ],
    activity: [
      {
        user: "Dana (Knowledge author)",
        action: "Draft proposed and routed to review",
        date: "10 Jan 2024",
      },
      {
        user: "System",
        action: "Conflict detected between U-PH-007 and U-PH-107",
        date: "09 Jan 2024",
      },
    ],
    searchInsights: {
      totalQueries: 17,
      sampleQueries: [
        "Does someone need to sign for refrigerated specialty medicine?",
        "Specialty home delivery cold chain guidelines",
      ],
      topChannels: ["Advocate portal (12)", "Voice assistant (5)"],
    },
    relatedContent: [
      {
        id: "U-PH-025",
        title: "Specialty pharmacy enrollment & onboarding",
        type: "Procedure",
        similarity: "82%",
      },
    ],
  },
  {
    id: "GAP-003",
    topic: "Coverage for weight management programs",
    description: "No approved content for new program.",
    type: "Insufficient",
    severity: "Medium",
    lastIdentified: "08 Jan 2024",
    relatedSearches: 14,
    status: "Open",
    lob: "Commercial",
    state: "All states",
    domain: "Insurance",
    knowledge_base: "KB-INS",
    ownerTeam: "Insurance Benefits Ops",
    assignedOwner: "Olivia (Knowledge owner)",
    summary:
      "Members inquiring about lifestyle coaching and nutritional support coverage under the new 2024 wellness benefit package.",
    reasons: [
      "New benefit year offering with no current unit published",
      "Moderate member query volume",
    ],
    activity: [
      {
        user: "System",
        action: "Identified from member searches",
        date: "08 Jan 2024",
      },
    ],
    searchInsights: {
      totalQueries: 14,
      sampleQueries: [
        "Does plan cover weight watchers or wellness coaching?",
        "Weight management program eligibility",
      ],
      topChannels: ["Member chat (10)", "Advocate portal (4)"],
    },
    relatedContent: [
      {
        id: "U-SH-015",
        title: "Member Services Onboarding & Identification Guide",
        type: "Procedure",
        similarity: "45%",
      },
    ],
  },
  {
    id: "GAP-004",
    topic: "Step therapy for asthma medications",
    description: "Existing content is out of date.",
    type: "Outdated",
    severity: "Medium",
    lastIdentified: "05 Jan 2024",
    relatedSearches: 11,
    status: "Open",
    lob: "Commercial",
    state: "All states",
    domain: "Pharmacy",
    knowledge_base: "KB-PHARM",
    ownerTeam: "Pharmacy Ops",
    assignedOwner: "Owen (Knowledge owner)",
    summary:
      "Formulary updates for generic combination inhalers not reflected in existing step therapy protocol unit U-PH-023.",
    reasons: [
      "Review date overdue",
      "New generic alternatives available on market",
    ],
    activity: [
      {
        user: "System",
        action: "Annual review reminder triggered",
        date: "05 Jan 2024",
      },
    ],
    searchInsights: {
      totalQueries: 11,
      sampleQueries: [
        "Is generic Advair required before Breo Ellipta?",
        "Asthma inhaler step therapy exception rules",
      ],
      topChannels: ["Advocate portal (9)", "Voice assistant (2)"],
    },
    relatedContent: [
      {
        id: "U-PH-023",
        title: "Step therapy requirements & trial protocols",
        type: "Policy",
        similarity: "91%",
      },
    ],
  },
  {
    id: "GAP-005",
    topic: "Out-of-network reimbursement process",
    description: "Members need clearer guidance.",
    type: "Outdated",
    severity: "Low",
    lastIdentified: "03 Jan 2024",
    relatedSearches: 9,
    status: "Planned",
    lob: "Commercial",
    state: "All states",
    domain: "Insurance",
    knowledge_base: "KB-INS",
    ownerTeam: "Insurance Benefits Ops",
    assignedOwner: "Olivia (Knowledge owner)",
    summary:
      "Direct member reimbursement claim form instructions and mailing addresses require clarification for emergency out-of-network pharmacy fills.",
    reasons: [
      "Member confusion on claim submission timelines",
      "Form revision pending from Claims Ops",
    ],
    activity: [
      {
        user: "Rita (Legal)",
        action: "Scheduled for Q1 review cycle",
        date: "03 Jan 2024",
      },
    ],
    searchInsights: {
      totalQueries: 9,
      sampleQueries: [
        "How to submit manual pharmacy claim receipt?",
        "Out of network pharmacy reimbursement form",
      ],
      topChannels: ["Advocate portal (6)", "Member chat (3)"],
    },
    relatedContent: [
      {
        id: "U-SH-028",
        title: "Appeals, grievances & reimbursement filing",
        type: "Legal",
        similarity: "74%",
      },
    ],
  },
];
