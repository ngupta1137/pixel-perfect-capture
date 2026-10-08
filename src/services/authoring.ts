// Authoring contract between the Author page and the server. Browser-safe:
// types only. The engine (extraction, approval gate, publishing) runs on the
// server in src/verity-engine/authoring.ts.

export type CandidateStatus = "unchanged" | "changed" | "new";
export type ApproverRole = "legal" | "author";

export interface CandidateView {
  cid: string;
  title: string;
  type: string;
  body: string;
  verbatim: boolean;
  knowledge_base: string;
  owner: string;
  source_section: string;
  status: CandidateStatus;
  unit_id: string | null;
  unit_title: string | null;
  similarity: number;
  diff: string[];
  impact: string | null;
  route_to: string;
}

export interface IngestView {
  doc_id: string;
  title: string;
  owner: string;
  effective_date: string;
  extractor: string;
  candidates: CandidateView[];
  skipped: { text: string; reason: string }[];
  notes: string[];
}

export interface DraftView {
  draft_id: string;
  kind: "new_unit" | "revision" | "gap_proposal";
  status: "pending" | "approved" | "rejected";
  unit_id: string;
  title: string;
  body: string;
  verbatim: boolean;
  knowledge_base: string;
  owner: string;
  route_to: "Legal" | "Author";
  reason: string;
  diff: string[];
  previous_body: string | null;
  proposed_by: string;
  decided_by: string | null;
  decided_role: string | null;
  comment: string | null;
  published_version: number | null;
}

export interface AuditView {
  at: string;
  actor: string;
  action: string;
  draft_id: string;
  unit_id: string;
  detail: string;
}

export interface UnitRow {
  unit_id: string;
  title: string;
  owner: string;
  version: number;
  verbatim: boolean;
  status: string;
  updated: boolean; // published (or newly created) in this session
  badge: "conflict" | "stale" | "retired" | null;
}

export interface GapCluster {
  cluster_id: string;
  demand: number;
  questions: { id: string; text: string }[];
  gap_type: string;
  nearest: { unit_id: string; title: string; owner: string } | null;
  suggested_title: string;
  knowledge_base: string;
  owner: string;
  synonyms: string[];
  proposed_draft: string | null;
}

export interface SampleSource {
  id: string;
  label: string;
  hint: string;
  text: string;
}

export interface AuthoringState {
  units: UnitRow[];
  queue: DraftView[];
  audit: AuditView[];
  gaps: GapCluster[];
  samples: SampleSource[];
  as_of: string;
}

export interface DecideRequest {
  draft_id: string;
  action: "approve" | "reject";
  approver: { name: string; role: ApproverRole };
  body: string | null;
  reason: string | null;
}

export interface ActionResult {
  ok: boolean;
  error: string | null;
  message: string | null;
  state: AuthoringState;
}
