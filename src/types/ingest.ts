export interface RecentUpload {
  id: string;
  title: string;
  format: "pdf" | "docx" | "pptx" | "txt";
  source_type: string;
  lob: string;
  uploaded_on: string;
  status: "Extracted" | "Processing" | "Error" | "Pending";
  snippet?: string;
  description?: string;
}

export interface ExtractedUnit {
  id: string;
  cid?: string;
  title: string;
  type: "Policy" | "Procedure" | "Guidance" | "Benefit Details" | "FAQ" | "Legal";
  content: string;
  key_points: string[];
  source_reference: string;
  suggested_effective_date: string;
  selected?: boolean;
  match_status?: "new" | "changed" | "unchanged";
  similarity?: number;
  route_to?: "owner" | "legal";
}

export const INITIAL_RECENT_UPLOADS: RecentUpload[] = [
  {
    id: "UPL-001",
    title: "Member Services Guide v3.pdf",
    format: "pdf",
    source_type: "Policy",
    lob: "MAPD",
    uploaded_on: "12 Jan 2024",
    status: "Extracted",
    snippet: "Comprehensive guide for Medicare Advantage Prescription Drug member support and plan enrollment.",
  },
  {
    id: "UPL-002",
    title: "Pharmacy Benefits Policy.docx",
    format: "docx",
    source_type: "Policy",
    lob: "MAPD",
    uploaded_on: "08 Jan 2024",
    status: "Extracted",
    snippet: "Formulary exceptions, copay tiers, and home delivery protocols for 2024 plan year.",
  },
  {
    id: "UPL-003",
    title: "Mail Order Procedure.pdf",
    format: "pdf",
    source_type: "Procedure",
    lob: "MAPD",
    uploaded_on: "05 Jan 2024",
    status: "Processing",
    snippet: "Standard operating procedure for 90-day maintenance medication mail delivery fulfillment.",
  },
  {
    id: "UPL-004",
    title: "Clinical Review Criteria.pptx",
    format: "pptx",
    source_type: "Guidance",
    lob: "MAPD",
    uploaded_on: "20 Dec 2023",
    status: "Error",
    snippet: "Presentation deck regarding prior authorization turnaround and step therapy guidelines.",
  },
  {
    id: "UPL-005",
    title: "Formulary Exceptions.txt",
    format: "txt",
    source_type: "Policy",
    lob: "MAPD",
    uploaded_on: "15 Dec 2023",
    status: "Extracted",
    snippet: "Text export of exception submission criteria and clinical documentation rules.",
  },
];

export const MEMBER_SERVICES_GUIDE_UNITS: ExtractedUnit[] = [
  {
    id: "UNIT-MSG-001",
    cid: "C1",
    title: "Copay assistance program overview",
    type: "Policy",
    content:
      "The Copay Assistance Program helps eligible members reduce out-of-pocket costs for certain covered medications. Members must meet the program criteria to qualify. The program is available for the MAPD plan and applies to medications on the approved list.",
    key_points: [
      "Available for eligible members",
      "Applies to select medications",
      "Members must meet income and other criteria",
      "Program terms and covered medications may change",
      "Contact Member Services for the latest information",
    ],
    source_reference: "Member Services Guide v3.pdf • Section 4.2",
    suggested_effective_date: "2024-01-01",
    selected: true,
  },
  {
    id: "UNIT-MSG-002",
    cid: "C2",
    title: "Eligibility criteria for copay assistance",
    type: "Policy",
    content:
      "Members must meet the program criteria to qualify for the copay assistance program.",
    key_points: [
      "Verified household income limits",
      "Active enrollment in eligible MAPD plan",
      "No concurrent federal subsidy disqualification",
    ],
    source_reference: "Member Services Guide v3.pdf • Section 4.2.1",
    suggested_effective_date: "2024-01-01",
    selected: false,
  },
  {
    id: "UNIT-MSG-003",
    cid: "C3",
    title: "Medications covered under the program",
    type: "Policy",
    content:
      "The program applies to select medications on the approved list.",
    key_points: [
      "Tier 3 and Tier 4 formulary medications",
      "Specialty drug co-pay relief provisions",
      "Annual review of eligible drug schedule",
    ],
    source_reference: "Member Services Guide v3.pdf • Section 4.2.2",
    suggested_effective_date: "2024-01-01",
    selected: false,
  },
  {
    id: "UNIT-MSG-004",
    cid: "C4",
    title: "Program terms and changes",
    type: "Policy",
    content:
      "Program terms and covered medications may change. Check the latest information.",
    key_points: [
      "Annual policy recalculation",
      "30-day notice for formulary revisions",
    ],
    source_reference: "Member Services Guide v3.pdf • Section 4.2.3",
    suggested_effective_date: "2024-01-01",
    selected: false,
  },
  {
    id: "UNIT-MSG-005",
    cid: "C5",
    title: "Contact Member Services",
    type: "Procedure",
    content:
      "Contact Member Services for the latest information about the copay assistance program.",
    key_points: [
      "Toll-free member line 8am-8pm local time",
      "Online portal self-service intake",
    ],
    source_reference: "Member Services Guide v3.pdf • Section 4.2.4",
    suggested_effective_date: "2024-01-01",
    selected: false,
  },
  {
    id: "UNIT-MSG-006",
    cid: "C6",
    title: "Mail order pharmacy overview",
    type: "Procedure",
    content:
      "Members can get up to a 90-day supply of maintenance medications through our mail order pharmacy.",
    key_points: [
      "Standard 90-day supply maintenance delivery",
      "Free standard home delivery",
    ],
    source_reference: "Member Services Guide v3.pdf • Section 4.3",
    suggested_effective_date: "2024-01-01",
    selected: false,
  },
  {
    id: "UNIT-MSG-007",
    cid: "C7",
    title: "Mail order delivery time",
    type: "Procedure",
    content: "Standard mailing time is 5 to 7 business days.",
    key_points: [
      "5 to 7 business day standard shipment",
      "Expedited 2-day delivery available upon request",
    ],
    source_reference: "Member Services Guide v3.pdf • Section 4.3.1",
    suggested_effective_date: "2024-01-01",
    selected: false,
  },
  {
    id: "UNIT-MSG-008",
    cid: "C8",
    title: "Mail order cost information",
    type: "Policy",
    content: "Mail order medications may have a different copay than retail.",
    key_points: [
      "Reduced copay on select 90-day fills",
      "Tiered savings compared to 30-day retail fills",
    ],
    source_reference: "Member Services Guide v3.pdf • Section 4.3.2",
    suggested_effective_date: "2024-01-01",
    selected: false,
  },
];
