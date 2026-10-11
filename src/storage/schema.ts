import type { Generated } from "kysely";

export interface SourceDocumentTable {
  id: string;
  title: string;
  file_type: "pdf" | "docx" | "md" | "txt";
  file_size: number;
  content_hash: string;
  raw_text: string;
  owner_team: string;
  lob: string;
  plan_year: string | null;
  state_code: string | null;
  source_type: string;
  description: string | null;
  created_by: string;
  created_by_user_id?: string | null;
  created_at: string;
}

export interface SourceFileTable {
  id: string;
  source_doc_id: string;
  file_name: string;
  mime_type: string;
  storage_bucket?: string | null;
  storage_path?: string | null;
  file_size?: number | null;
  content_hash?: string | null;
  data_base64?: string | null;
  created_at: string;
}

export interface IngestionJobTable {
  id: string;
  source_doc_id: string;
  status: "pending" | "completed" | "failed";
  extractor: string;
  candidate_count: number;
  skipped_count: number;
  error_message: string | null;
  notes_json: string;
  created_at: string;
  completed_at: string | null;
}

export interface CandidateUnitTable {
  id: string;
  cid: string;
  annotated_id?: string | null;
  job_id: string;
  source_doc_id: string;
  title: string;
  candidate_type: string;
  body: string;
  verbatim: number; // 0 or 1
  knowledge_base: string;
  owner_team: string;
  source_reference: string;
  source_section: string | null;
  source_page: number | null;
  effective_date: string;
  match_status: "new" | "changed" | "unchanged";
  matched_unit_id: string | null;
  similarity: number;
  diff_json: string | null;
  route_to: "owner" | "legal";
  key_points_json: string;
  selected: number; // 0 or 1
  created_at: string;
  version?: number | null;
  version_id?: string | null;
  supersedes?: string | null;
  duplicate_of?: string | null;
  annotations_json?: string | null;
}

export interface DraftTable {
  draft_id: string;
  candidate_id: string | null;
  source_doc_id: string | null;
  unit_id: string;
  title: string;
  proposed_text: string;
  current_text: string | null;
  candidate_type: string;
  verbatim: number; // 0 or 1
  route_to: "owner" | "legal";
  owner_team: string;
  knowledge_base: string;
  effective_date: string;
  tags_json: string;
  proposed_by: string;
  proposer_id?: string | null;
  status: "proposed" | "in_review" | "approved" | "rejected" | "requested_changes";
  reason: string | null;
  decided_by: string | null;
  gate_json: string | null;
  history_json: string;
  created_at: string;
  updated_at: string;
  version?: number | null;
  version_id?: string | null;
  supersedes?: string | null;
  duplicate_of?: string | null;
  annotations_json?: string | null;
}

export interface PublishedUnitTable {
  unit_id: string;
  title: string;
  type: string;
  body: string;
  verbatim: number; // 0 or 1
  spoken_version: string | null;
  knowledge_base: string;
  audience_json: string;
  channels_json: string;
  authority_level: string;
  source_doc: string;
  source_section: string;
  effective_date: string;
  review_date: string;
  version: number;
  status: "approved" | "stale" | "retired";
  supersedes: string | null;
  synonyms_json: string;
  owner: string;
  approved_by: string;
  applies_to_json: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseSchema {
  source_documents: SourceDocumentTable;
  source_files: SourceFileTable;
  ingestion_jobs: IngestionJobTable;
  candidate_units: CandidateUnitTable;
  drafts: DraftTable;
  published_units: PublishedUnitTable;
}

