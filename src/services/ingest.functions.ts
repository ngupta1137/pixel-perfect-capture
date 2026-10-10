import { createServerFn } from "@tanstack/react-start";
import type { SourceDocumentTable, IngestionJobTable, CandidateUnitTable, DraftTable } from "../storage/schema";
import type { RecentUpload } from "../types/ingest";

export interface IngestUploadRequest {
  fileName?: string;
  filename?: string;
  fileBase64?: string;
  file_base64?: string;
  content_text?: string;
  title?: string;
  source_title?: string;
  sourceType?: string;
  source_type?: string;
  lob?: string;
  planYear?: string | null;
  scope?: string | null;
  stateCode?: string | null;
  description?: string;
  ownerTeam?: string;
  actor?: string;
  uploaded_by?: string;
  mime_type?: string;
}

export interface IngestResponse {
  ok: boolean;
  error?: string;
  isDuplicate?: boolean;
  duplicate_of?: string | null;
  doc_id?: string;
  source_id?: string;
  filename?: string;
  file_hash?: string;
  extracted_text?: string;
  job_id?: string;
  units?: Array<{
    id: string;
    cid: string;
    title: string;
    type: string;
    content: string;
    key_points: string[];
    source_reference: string;
    suggested_effective_date: string;
    match_status: "new" | "changed" | "unchanged";
    similarity?: number;
    route_to?: string;
  }>;
  document?: SourceDocumentTable;
  job?: IngestionJobTable;
  candidates?: CandidateUnitTable[];
  parsedText?: string;
  totalPages?: number;
  warnings?: string[];
}

export interface ProposeDraftsRequest {
  sourceDocId?: string;
  source_doc_id?: string;
  candidateIds?: string[];
  candidate_ids?: string[];
  proposerName?: string;
  proposer_name?: string;
  proposerRole?: string;
  proposer_role?: string;
}

export interface ProposeDraftsResponse {
  ok: boolean;
  success?: boolean;
  error?: string;
  drafts?: DraftTable[];
  draft_ids?: string[];
  message?: string;
}

// ---------------------------------------------------------------------------
// TanStack Start Server Functions
// Note: Server-only implementations are loaded dynamically inside handlers
// to ensure zero server-only code (e.g. node:crypto, sqlite) is bundled to client.
// ---------------------------------------------------------------------------

export const uploadAndIngestSourceFn = createServerFn({ method: "POST" })
  .validator((d: IngestUploadRequest) => d)
  .handler(async ({ data }): Promise<IngestResponse> => {
    const { handleUploadAndIngest } = await import("./ingest.server");
    return await handleUploadAndIngest(data);
  });

export const listRecentUploadsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<RecentUpload[]> => {
    const { handleListRecentUploads } = await import("./ingest.server");
    return await handleListRecentUploads();
  }
);

export const proposeDraftsFn = createServerFn({ method: "POST" })
  .validator((d: ProposeDraftsRequest) => d)
  .handler(async ({ data }): Promise<ProposeDraftsResponse> => {
    const { handleProposeDrafts } = await import("./ingest.server");
    return await handleProposeDrafts(data);
  });
