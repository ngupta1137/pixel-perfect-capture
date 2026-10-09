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
