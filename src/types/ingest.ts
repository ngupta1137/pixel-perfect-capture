export interface RecentUpload {
  id: string;
  title: string;
  format: "pdf" | "docx" | "pptx" | "txt";
  source_type: string;
  lob: string;
  uploaded_on: string;
  status: "Extracted" | "Processing" | "Error" | "Pending" | "Stale";
  review_date?: string | null | undefined;
  snippet?: string | undefined;
  description?: string | undefined;
}

export interface ExtractedUnit {
  id: string;
  cid?: string | undefined;
  title: string;
  type: "Policy" | "Procedure" | "Guidance" | "Benefit Details" | "FAQ" | "Legal";
  content: string;
  current_text?: string | null | undefined;
  key_points: string[];
  source_reference: string;
  suggested_effective_date: string;
  selected?: boolean | undefined;
  match_status?: "new" | "changed" | "unchanged" | undefined;
  matched_unit_id?: string | null | undefined;
  similarity?: number | undefined;
  route_to?: "owner" | "legal" | undefined;
  verbatim?: number | boolean | undefined;
  verbatim_drift?: boolean | undefined;
  diff?: string[] | undefined;
  drift?: any | undefined;
  hash_before?: string | undefined;
  hash_after?: string | undefined;
  sha256_before?: string | undefined;
  sha256_after?: string | undefined;
}

export const INITIAL_RECENT_UPLOADS: RecentUpload[] = [
  {
    id: "UPL-001",
    title: "S01_source_Rx_Education_Script_Mail_Order_2026.docx",
    format: "docx",
    source_type: "Policy",
    lob: "MAPD",
    uploaded_on: "12 Oct 2026",
    status: "Extracted",
    snippet: "90-day mail-order maintenance supply, cost-share guidance, pricing disclaimer, and closing guidance.",
  },
  {
    id: "UPL-002",
    title: "S02_source_Insurance_Benefits_Snippet_2026.docx",
    format: "docx",
    source_type: "Benefit Details",
    lob: "MAPD",
    uploaded_on: "12 Oct 2026",
    status: "Extracted",
    snippet: "Annual out-of-pocket maximum, copay tiers, and deductible limits for 2026.",
  },
  {
    id: "UPL-003",
    title: "S04_source_A_Mail_Order_90_day.docx",
    format: "docx",
    source_type: "Policy",
    lob: "MAPD",
    uploaded_on: "12 Oct 2026",
    status: "Processing",
    snippet: "Standard operating policy for 90-day maintenance medication mail delivery fulfillment.",
  },
  {
    id: "UPL-004",
    title: "S04_source_B_Mail_Order_100_day_pilot.docx",
    format: "docx",
    source_type: "Policy",
    lob: "MAPD",
    uploaded_on: "12 Oct 2026",
    status: "Error",
    snippet: "Pilot 100-day maintenance supply program guidance requiring ops conflict consolidation.",
  },
  {
    id: "UPL-005",
    title: "S05_source_Kentucky_Copay_Assistance.docx",
    format: "docx",
    source_type: "Policy",
    lob: "MAPD",
    uploaded_on: "12 Oct 2026",
    status: "Extracted",
    snippet: "State-specific Kentucky copay assistance program eligibility and advocate enrollment script.",
  },
];

export const MEMBER_SERVICES_GUIDE_UNITS: ExtractedUnit[] = [
  {
    id: "UNIT-MSG-001",
    cid: "C1",
    title: "1. 90-day mail-order supply eligibility",
    type: "Policy",
    content:
      "Members can receive a 90-day supply of maintenance medications by mail delivery with zero standard delivery fee. Medications must be on the approved maintenance list and have an active prescription.",
    key_points: [
      "90-day maintenance supply",
      "Mail delivery with zero delivery fee",
      "Requires active maintenance prescription",
      "Applies to eligible formulary tiers",
    ],
    source_reference: "S01_source_Rx_Education_Script_Mail_Order_2026.docx • Section 1",
    suggested_effective_date: "2026-01-01",
    selected: true,
  },
  {
    id: "UNIT-MSG-002",
    cid: "C2",
    title: "2. Member cost-share language",
    type: "Guidance",
    content:
      "Explain to the member that copays vary based on formulary tier. Tier 1 and Tier 2 generic medications offer the greatest cost savings under the 90-day mail delivery benefit.",
    key_points: [
      "Copays vary by formulary tier",
      "Tier 1/2 preferred savings",
      "Advocate explains cost differences",
    ],
    source_reference: "S01_source_Rx_Education_Script_Mail_Order_2026.docx • Section 2",
    suggested_effective_date: "2026-01-01",
    selected: false,
  },
  {
    id: "UNIT-MSG-003",
    cid: "C3",
    title: "3. Prior authorization note",
    type: "Guidance",
    content:
      "Remind the member that non-formulary and specialty medications require prior authorization before mail dispensing.",
    key_points: [
      "Prior authorization required for specialty",
      "Non-formulary exception process applies",
      "Standard review window applies",
    ],
    source_reference: "S01_source_Rx_Education_Script_Mail_Order_2026.docx • Section 3",
    suggested_effective_date: "2026-01-01",
    selected: false,
  },
  {
    id: "UNIT-MSG-004",
    cid: "C4",
    title: "4. Pricing disclaimer (Legal verbatim)",
    type: "Legal",
    content:
      "The prices I share today are estimates based on your current plan and may change. Your final cost will be confirmed when your prescription is processed.",
    key_points: [
      "Verbatim legal disclosure required",
      "Prices are estimates based on plan",
      "Final cost confirmed at prescription processing",
    ],
    source_reference: "S01_source_Rx_Education_Script_Mail_Order_2026.docx • Section 4",
    suggested_effective_date: "2026-01-01",
    route_to: "legal",
    selected: false,
  },
  {
    id: "UNIT-MSG-005",
    cid: "C5",
    title: "5. Closing guidance",
    type: "Policy",
    content:
      "Your decision today has no impact on your plan membership. Is there anything else I can help you with today?",
    key_points: [
      "Standard closing statement",
      "No impact on member plan enrollment",
      "Offer further assistance",
    ],
    source_reference: "S01_source_Rx_Education_Script_Mail_Order_2026.docx • Section 5",
    suggested_effective_date: "2026-01-01",
    selected: false,
  },
];

