export type ReviewStatus =
  | "Pending review"
  | "Requested changes"
  | "Approved"
  | "Rejected";

export interface ReviewQueueItem {
  id: string;
  unit_id?: string;
  source_id?: string;
  is_demo?: boolean;
  title: string;
  preview: string;
  content: string;
  source_doc: string;
  section: string;
  type: "Policy" | "Procedure" | "Guidance" | "Benefit Details" | "FAQ" | "Legal";
  verbatim?: number;
  proposer?: string;
  status: ReviewStatus;
  extracted_on: string;
  lob: string;
  state: string;
  suggested_effective_date: string;
  key_points: string[];
  reviewer_notes?: string;
  assigned_reviewer?: string;
  demand?: number;
  due_date?: string;
  reverified?: boolean;
  version?: number;
  version_id?: string;
  supersedes?: string;
  duplicate_of?: string;
  is_duplicate_review?: boolean;
  history?: {
    action: string;
    by: string;
    at: string;
    note?: string;
  }[];
}

export const INITIAL_REVIEW_QUEUE: ReviewQueueItem[] = [
  {
    id: "REV-001",
    unit_id: "U-PH-001",
    title: "Copay assistance program overview",
    preview:
      "The Copay Assistance Program helps eligible members reduce out-of-pocket costs...",
    content:
      "The Copay Assistance Program helps eligible members reduce out-of-pocket costs for certain covered medications. Members must meet the program criteria to qualify. The program is available for the MAPD plan and applies to medications on the approved list.",
    source_doc: "Member Services Guide v3",
    section: "Section 4.2",
    type: "Policy",
    status: "Pending review",
    extracted_on: "12 Jan 2024",
    lob: "MAPD",
    state: "All states",
    suggested_effective_date: "01 Jan 2024",
    assigned_reviewer: "Owen (Knowledge owner)",
    demand: 45,
    due_date: "2024-01-20",
    key_points: [
      "Available for eligible members",
      "Applies to select medications",
      "Members must meet program criteria",
      "Program is available for MAPD plan",
    ],
    history: [
      {
        action: "Proposed draft",
        by: "Dana (Knowledge author)",
        at: "12 Jan 2024, 09:30 AM",
        note: "Extracted from Member Services Guide v3",
      },
    ],
  },
  {
    id: "REV-002",
    unit_id: "U-PH-002",
    title: "Eligibility criteria for copay assistance",
    preview:
      "Members must meet the program criteria to qualify for the copay assistance...",
    content:
      "Members must meet the program criteria to qualify for the copay assistance program. Household income must fall within the qualifying threshold, and the member must have active MAPD coverage.",
    source_doc: "Member Services Guide v3",
    section: "Section 4.2.1",
    type: "Policy",
    status: "Pending review",
    extracted_on: "12 Jan 2024",
    lob: "MAPD",
    state: "All states",
    suggested_effective_date: "01 Jan 2024",
    assigned_reviewer: "Owen (Knowledge owner)",
    demand: 38,
    due_date: "2024-01-20",
    key_points: [
      "Verified household income limits",
      "Active enrollment in eligible MAPD plan",
      "No concurrent federal subsidy disqualification",
    ],
    history: [
      {
        action: "Proposed draft",
        by: "Dana (Knowledge author)",
        at: "12 Jan 2024, 09:35 AM",
      },
    ],
  },
  {
    id: "REV-003",
    unit_id: "U-PH-003",
    title: "Medications covered under the program",
    preview:
      "The program applies to select medications on the approved list.",
    content:
      "The program applies to select Tier 3 and Tier 4 medications on the approved formulary schedule. Prior authorization may be required for select specialty lines.",
    source_doc: "Pharmacy Benefits Policy",
    section: "Section 3.1",
    type: "Policy",
    status: "Requested changes",
    extracted_on: "11 Jan 2024",
    lob: "MAPD",
    state: "All states",
    suggested_effective_date: "01 Jan 2024",
    assigned_reviewer: "Rita (Legal / Compliance)",
    demand: 29,
    due_date: "2024-01-18",
    key_points: [
      "Tier 3 and Tier 4 formulary medications",
      "Specialty drug co-pay relief provisions",
    ],
    reviewer_notes:
      "Please clarify whether biosimilars are explicitly included under the 2024 formulary relief tier.",
    history: [
      {
        action: "Proposed draft",
        by: "Dana (Knowledge author)",
        at: "11 Jan 2024, 11:00 AM",
      },
      {
        action: "Requested changes",
        by: "Rita (Legal / Compliance)",
        at: "11 Jan 2024, 02:15 PM",
        note: "Clarify biosimilar coverage clause.",
      },
    ],
  },
  {
    id: "REV-004",
    unit_id: "U-PH-007",
    title: "Mail order delivery time",
    preview:
      "Standard mailing time is 5 to 7 business days for most orders.",
    content:
      "Standard mailing time is 5 to 7 business days for maintenance prescription deliveries once processed. Expedited shipping is available upon physician urgent request.",
    source_doc: "Mail Order Procedure",
    section: "Section 2.3",
    type: "Procedure",
    status: "Pending review",
    extracted_on: "10 Jan 2024",
    lob: "MAPD",
    state: "All states",
    suggested_effective_date: "01 Jan 2024",
    assigned_reviewer: "Owen (Knowledge owner)",
    demand: 63,
    due_date: "2024-01-15",
    key_points: [
      "5 to 7 business day standard shipment",
      "Expedited delivery options",
    ],
    history: [
      {
        action: "Proposed draft",
        by: "Ian (Knowledge author)",
        at: "10 Jan 2024, 08:20 AM",
      },
    ],
  },
  {
    id: "REV-005",
    unit_id: "U-PH-005",
    title: "Formulary exceptions process",
    preview:
      "Members can request a formulary exception if a medication is not on the formulary...",
    content:
      "Members and prescribing clinicians can request a formulary exception when non-formulary alternatives are clinically contraindicated. Standard review turnaround is 72 hours; expedited review is 24 hours.",
    source_doc: "Clinical Review Guidelines",
    section: "Section 5.1",
    type: "Guidance",
    status: "Pending review",
    extracted_on: "09 Jan 2024",
    lob: "MAPD",
    state: "All states",
    suggested_effective_date: "01 Jan 2024",
    assigned_reviewer: "Owen (Knowledge owner)",
    demand: 52,
    due_date: "2024-01-16",
    key_points: [
      "72-hour standard clinical exception turnaround",
      "24-hour expedited review for acute conditions",
      "Prescriber supporting clinical documentation required",
    ],
    history: [
      {
        action: "Proposed draft",
        by: "Dana (Knowledge author)",
        at: "09 Jan 2024, 01:10 PM",
      },
    ],
  },
  {
    id: "REV-006",
    unit_id: "U-SH-015",
    title: "Member ID card information",
    preview:
      "Members will receive a new ID card after enrollment is complete.",
    content:
      "Members will receive a new physical ID card within 10 business days after enrollment is approved. Digital cards can be downloaded instantly from the member portal.",
    source_doc: "Member Communications",
    section: "Section 2.1",
    type: "Procedure",
    status: "Approved",
    extracted_on: "08 Jan 2024",
    lob: "MAPD",
    state: "All states",
    suggested_effective_date: "01 Jan 2024",
    assigned_reviewer: "Olivia (Knowledge owner)",
    demand: 70,
    due_date: "2024-01-14",
    key_points: [
      "10 business day delivery for physical ID cards",
      "Instant portal digital card access",
    ],
    history: [
      {
        action: "Proposed draft",
        by: "Ian (Knowledge author)",
        at: "08 Jan 2024, 09:00 AM",
      },
      {
        action: "Approved",
        by: "Olivia (Knowledge owner)",
        at: "08 Jan 2024, 04:30 PM",
        note: "Approved for publication.",
      },
    ],
  },
  {
    id: "REV-007",
    unit_id: "U-PH-008",
    title: "Prior authorization requirements",
    preview:
      "Certain medications require prior authorization before coverage...",
    content:
      "Certain specialty medications require clinical prior authorization before dispensing. The prescribing provider must submit medical necessity documentation.",
    source_doc: "Pharmacy Benefits Policy",
    section: "Section 6.4",
    type: "Policy",
    status: "Pending review",
    extracted_on: "08 Jan 2024",
    lob: "MAPD",
    state: "All states",
    suggested_effective_date: "01 Jan 2024",
    assigned_reviewer: "Owen (Knowledge owner)",
    demand: 41,
    due_date: "2024-01-12",
    key_points: [
      "Specialty medications require prior authorization",
      "Prescriber clinical evidence submission",
    ],
    history: [
      {
        action: "Proposed draft",
        by: "Dana (Knowledge author)",
        at: "08 Jan 2024, 10:15 AM",
      },
    ],
  },
  {
    id: "REV-008",
    unit_id: "U-PH-009",
    title: "Mail order cost information",
    preview:
      "Mail order medications may have a different copay than retail.",
    content:
      "Mail order medications may offer reduced copays on 90-day supplies compared to 30-day retail fills. Specific cost sharing depends on benefit tier.",
    source_doc: "Mail Order Procedure",
    section: "Section 2.5",
    type: "Procedure",
    status: "Rejected",
    extracted_on: "05 Jan 2024",
    lob: "MAPD",
    state: "All states",
    suggested_effective_date: "01 Jan 2024",
    assigned_reviewer: "Owen (Knowledge owner)",
    demand: 18,
    due_date: "2024-01-10",
    key_points: ["90-day mail order copay structure"],
    reviewer_notes:
      "Rejected: Conflicted with 2024 MAPD Evidence of Coverage table. Re-extract with updated fee schedule.",
    history: [
      {
        action: "Proposed draft",
        by: "Ian (Knowledge author)",
        at: "05 Jan 2024, 02:00 PM",
      },
      {
        action: "Rejected",
        by: "Owen (Knowledge owner)",
        at: "05 Jan 2024, 05:15 PM",
        note: "Conflicted with 2024 MAPD Evidence of Coverage table.",
      },
    ],
  },
  {
    id: "REV-009",
    unit_id: "U-PH-010",
    title: "Step therapy requirements",
    preview:
      "Some medications require step therapy before coverage is approved.",
    content:
      "Step therapy protocols require a trial of proven first-line generic therapies prior to approving brand alternatives unless contraindicated.",
    source_doc: "Clinical Review Guidelines",
    section: "Section 4.3",
    type: "Guidance",
    status: "Pending review",
    extracted_on: "04 Jan 2024",
    lob: "MAPD",
    state: "All states",
    suggested_effective_date: "01 Jan 2024",
    assigned_reviewer: "Owen (Knowledge owner)",
    demand: 33,
    due_date: "2024-01-11",
    key_points: [
      "Prerequisite generic therapy trial",
      "Documentation of failure or intolerance required",
    ],
    history: [
      {
        action: "Proposed draft",
        by: "Dana (Knowledge author)",
        at: "04 Jan 2024, 11:30 AM",
      },
    ],
  },
  {
    id: "REV-010",
    unit_id: "U-MSG-005",
    title: "Contact Member Services",
    preview:
      "Members can contact Member Services for the latest program information.",
    content:
      "Members can contact Member Services toll-free at 1-800-555-4321 (TTY: 711), 8 a.m. to 8 p.m. seven days a week from October 1 to March 31.",
    source_doc: "Member Services Guide v3",
    section: "Section 1.1",
    type: "Procedure",
    status: "Pending review",
    extracted_on: "03 Jan 2024",
    lob: "MAPD",
    state: "All states",
    suggested_effective_date: "01 Jan 2024",
    assigned_reviewer: "Olivia (Knowledge owner)",
    demand: 88,
    due_date: "2024-01-09",
    key_points: [
      "Toll-free customer support hours",
      "TTY access for hearing impaired",
    ],
    history: [
      {
        action: "Proposed draft",
        by: "Dana (Knowledge author)",
        at: "03 Jan 2024, 09:15 AM",
      },
    ],
  },
  {
    id: "REV-011",
    unit_id: "U-PH-011",
    title: "Specialty tier copay relief",
    preview:
      "Specialty tier copay assistance guidelines for catastrophic drug coverage...",
    content:
      "Under the Inflation Reduction Act provisions, member out-of-pocket costs for specialty medications are capped at catastrophic threshold.",
    source_doc: "Pharmacy Benefits Policy",
    section: "Section 7.2",
    type: "Policy",
    status: "Pending review",
    extracted_on: "02 Jan 2024",
    lob: "MAPD",
    state: "All states",
    suggested_effective_date: "01 Jan 2024",
    assigned_reviewer: "Rita (Legal / Compliance)",
    demand: 36,
    due_date: "2024-01-08",
    key_points: ["Catastrophic phase zero percent coinsurance cap"],
    history: [
      {
        action: "Proposed draft",
        by: "Dana (Knowledge author)",
        at: "02 Jan 2024, 03:40 PM",
      },
    ],
  },
  {
    id: "REV-012",
    unit_id: "U-PH-012",
    title: "Preventive drug list coverage",
    preview:
      "Eligible preventive drugs covered at zero dollar copay before deductible...",
    content:
      "Eligible preventive medications on the ACA Preventive Services list are covered with $0 member cost sharing prior to meeting the plan deductible.",
    source_doc: "Formulary Master Schedule",
    section: "Section 1.3",
    type: "Policy",
    status: "Requested changes",
    extracted_on: "01 Jan 2024",
    lob: "MAPD",
    state: "All states",
    suggested_effective_date: "01 Jan 2024",
    assigned_reviewer: "Owen (Knowledge owner)",
    demand: 24,
    due_date: "2024-01-07",
    key_points: [
      "$0 copay on ACA preventive drug list",
      "Deductible waived for qualifying maintenance classes",
    ],
    reviewer_notes:
      "Update cross-reference to USPSTF Grade A and B recommendations table.",
    history: [
      {
        action: "Proposed draft",
        by: "Ian (Knowledge author)",
        at: "01 Jan 2024, 10:00 AM",
      },
      {
        action: "Requested changes",
        by: "Owen (Knowledge owner)",
        at: "01 Jan 2024, 04:00 PM",
      },
    ],
  },
];
