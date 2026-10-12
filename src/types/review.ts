export type ReviewStatus =
  | "Pending review"
  | "Requested changes"
  | "Approved"
  | "Rejected";

export interface ReviewQueueItem {
  id: string;
  unit_id?: string | undefined;
  source_id?: string | undefined;
  is_demo?: boolean | undefined;
  title: string;
  preview: string;
  content: string;
  source_doc: string;
  section: string;
  type: "Policy" | "Procedure" | "Guidance" | "Benefit Details" | "FAQ" | "Legal";
  verbatim?: number | undefined;
  proposer?: string | undefined;
  status: ReviewStatus;
  extracted_on: string;
  lob: string;
  state: string;
  suggested_effective_date: string;
  key_points: string[];
  reviewer_notes?: string | undefined;
  assigned_reviewer?: string | undefined;
  demand?: number | undefined;
  due_date?: string | undefined;
  reverified?: boolean | undefined;
  version?: number | undefined;
  version_id?: string | undefined;
  supersedes?: string | undefined;
  duplicate_of?: string | undefined;
  is_duplicate_review?: boolean | undefined;
  history?: undefined | {
    action: string;
    by: string;
    at: string;
    note?: string | undefined;
  }[];
}

export const INITIAL_REVIEW_QUEUE: ReviewQueueItem[] = [
  {
    id: "REV-001",
    unit_id: "U-PH-KY-001",
    title: "Copay assistance program overview",
    preview:
      "The Copay Assistance Program helps eligible members reduce out-of-pocket costs...",
    content:
      "Members in Kentucky can enroll in the Rx copay assistance pilot through an advocate. Eligibility is confirmed in the pharmacy system before enrollment.",
    source_doc: "S05_source_Kentucky_Copay_Assistance.md",
    section: "Section 1",
    type: "Policy",
    status: "Pending review",
    extracted_on: "12 Oct 2026",
    lob: "MAPD",
    state: "Kentucky (KY)",
    suggested_effective_date: "01 Jan 2026",
    assigned_reviewer: "Owen (Knowledge owner)",
    demand: 45,
    due_date: "2026-10-20",
    key_points: [
      "Available for eligible members in Kentucky",
      "Applies to select maintenance medications",
      "Eligibility confirmed in pharmacy system before enrollment",
    ],
    history: [
      {
        action: "Proposed draft",
        by: "Dana (Knowledge author)",
        at: "12 Oct 2026, 09:30 AM",
        note: "Extracted from S05_source_Kentucky_Copay_Assistance.md",
      },
    ],
  },
  {
    id: "REV-CONF-001",
    unit_id: "U-PH-007",
    title: "Conflict Ticket: Days supply by mail (90-day vs 100-day)",
    preview:
      "Conflict between U-PH-007 (90-day supply) and U-PH-107 (100-day legacy rule)...",
    content:
      "Conflicting source guidance identified between approved units:\n• U-PH-007 (Pharmacy Ops): A 90-day supply is available by mail for most maintenance medications.\n• U-PH-107 (Outbound Pharmacy): Members can get up to a 100-day supply of maintenance medications by mail.\n\nResolution workflow: Knowledge Ops uploads or applies consolidating source document S04 (90-day supply only), marking both U-PH-007 and U-PH-107 superseded. Legal / Knowledge Owner approves the consolidated draft.",
    source_doc: "Conflict Report: U-PH-007 vs U-PH-107",
    section: "Mail Order Maintenance Supply",
    type: "Procedure",
    status: "Pending review",
    extracted_on: "12 Oct 2026",
    lob: "MAPD",
    state: "All states",
    suggested_effective_date: "12 Oct 2026",
    assigned_reviewer: "Knowledge Ops (Owen)",
    demand: 64,
    due_date: "2026-10-18",
    supersedes: "U-PH-007, U-PH-107",
    key_points: [
      "Linked Conflicting Unit A: U-PH-007 (Days supply by mail: 90-day)",
      "Linked Conflicting Unit B: U-PH-107 (Days supply by mail: 100-day, legacy)",
      "Resolution target: Upload/apply S04 consolidating unit",
      "Draft unit marks both A and B superseded",
    ],
    history: [
      {
        action: "Conflict reported for resolution",
        by: "Priya (Pharmacy advocate)",
        at: "12 Oct 2026, 10:15 AM",
        note: "Advocate reported conflicting sources on query 'How many days supply can I get by mail?'. Both units linked.",
      },
    ],
  },
];
