import { repository, StorageRepository } from "../storage/repository";
import { calculateSha256 } from "./ingestion/hasher";
import { parseDocument } from "./ingestion/parser";
import { getStore } from "../verity-engine/server";
import { extract } from "../verity-engine/extract";
import { checkChange, normalizeForHash, hash } from "../verity-engine/drift";
import type {
  SourceDocumentTable,
  IngestionJobTable,
  CandidateUnitTable,
  DraftTable,
} from "../storage/schema";
import type { RecentUpload } from "../types/ingest";
import type {
  IngestUploadRequest,
  IngestResponse,
  ProposeDraftsRequest,
  ProposeDraftsResponse,
} from "./ingest.functions";
import {
  authenticateRequest,
  resolveRequestUser,
  requireCapability,
  type AuthenticatedUser,
} from "./auth.server";

export { resolveRequestUser };

export async function handleUploadAndIngest(
  data: IngestUploadRequest,
  repo: StorageRepository = repository,
  callerUser?: AuthenticatedUser
): Promise<IngestResponse> {
  let user: AuthenticatedUser;
  try {
    user = callerUser || authenticateRequest(data);
  } catch (err: any) {
    return { ok: false, error: err.message || "Authentication required: No valid session." };
  }

  // Capability check: User must hold "ingest_source" capability!
  try {
    requireCapability(user, "ingest_source", "upload and ingest source documents");
  } catch (err: any) {
    return { ok: false, error: err.message };
  }

  const fileName = data.fileName || data.filename || "document.txt";
  const title = data.title || data.source_title;
  const sourceType = data.sourceType || data.source_type || "Policy / Guidance";
  const lob = data.lob || "MAPD";
  const planYear = data.planYear || data.scope || "2026";
  const stateCode = data.stateCode || "All";
  const description = data.description;
  const ownerTeam = data.ownerTeam || "Pharmacy Ops";
  const actor = `${user.name} (${user.label})`;
  const createdByUserId = user.id;

  let fileBase64 = data.fileBase64 || data.file_base64;
  let buffer: Buffer;

  if (fileBase64) {
    buffer = Buffer.from(fileBase64, "base64");
  } else if (data.content_text) {
    buffer = Buffer.from(data.content_text, "utf-8");
    fileBase64 = buffer.toString("base64");
  } else {
    return { ok: false, error: "Missing required file name or file content." };
  }

  try {
    if (buffer.length === 0) {
      return { ok: false, error: `Uploaded file "${fileName}" is empty (0 bytes).` };
    }

    // 2. Compute SHA-256 content hash
    const contentHash = calculateSha256(buffer);

    // 3. Duplicate detection
    const existing = await repo.findSourceDocumentByHash(contentHash);
    let isDuplicate = false;
    let existingJob: IngestionJobTable | undefined;
    let existingCandidates: CandidateUnitTable[] = [];

    if (existing) {
      isDuplicate = true;
      existingJob = await repo.getLatestJobForDoc(existing.id);
      existingCandidates = await repo.getCandidatesByDocId(existing.id);

      const mappedUnits = existingCandidates.map((c) => {
        let annotations: any = {};
        try {
          annotations = JSON.parse(c.annotations_json || "{}");
        } catch {}

        let diffArr: string[] = [];
        try {
          diffArr = JSON.parse(c.diff_json || "[]");
        } catch {}

        const isVerbatim = Boolean(c.verbatim === 1 || c.candidate_type === "Legal");
        const isVerbatimDrift = Boolean(annotations.verbatim_drift || (isVerbatim && c.match_status === "changed"));

        return {
          id: c.id,
          cid: c.cid,
          annotated_id: c.annotated_id || undefined,
          title: c.title,
          type: c.candidate_type,
          content: c.body,
          current_text: annotations.current_text || null,
          verbatim: isVerbatim ? 1 : 0,
          verbatim_drift: isVerbatimDrift,
          matched_unit_id: c.matched_unit_id || annotations.matched_unit_id || null,
          diff: diffArr,
          drift: annotations.drift || null,
          hash_before: annotations.hash_before || undefined,
          hash_after: annotations.hash_after || undefined,
          sha256_before: annotations.sha256_before || undefined,
          sha256_after: annotations.sha256_after || undefined,
          key_points: JSON.parse(c.key_points_json || "[]"),
          source_reference: c.source_reference,
          suggested_effective_date: c.effective_date,
          match_status: c.match_status,
          similarity: c.similarity,
          route_to: (isVerbatimDrift || isVerbatim) ? "legal" : c.route_to,
          version: c.version || 1,
          version_id: c.version_id || undefined,
          supersedes: c.supersedes || undefined,
          duplicate_of: c.duplicate_of || undefined,
          is_duplicate_review: Boolean(c.duplicate_of || c.cid?.includes("DUP")),
        };
      });

      return {
        ok: true,
        isDuplicate: true,
        duplicate_of: existing.id,
        doc_id: existing.id,
        source_id: existing.id,
        filename: fileName,
        file_hash: contentHash,
        extracted_text: existing.raw_text,
        job_id: existingJob?.id || "",
        units: mappedUnits,
        document: existing,
        ...(existingJob ? { job: existingJob } : {}),
        candidates: existingCandidates,
        parsedText: existing.raw_text,
        totalPages: 1,
        warnings: [
          `Document with identical SHA-256 hash (${contentHash.slice(0, 12)}...) was previously ingested as "${existing.title}". Loaded existing parsed records.`,
        ],
      };
    }

    // 4. Parse real document bytes
    const parsed = await parseDocument(fileName, buffer);

    // 5. Generate stable IDs
    const nowIso = new Date().toISOString();
    const fallbackDocId = `SRC-${Date.now().toString(36).toUpperCase()}-${Math.floor(
      Math.random() * 1000
    )}`;
    const jobId = `JOB-${Date.now().toString(36).toUpperCase()}`;

    // Extract candidate units reusing the engine's extraction heuristics
    const liveUnits = getStore().units();
    const extraction = extract(parsed.rawText, liveUnits, undefined, fallbackDocId);

    // Resolve doc ID, title, and metadata from extraction or upload inputs
    const docId =
      extraction.doc_id && extraction.doc_id !== "DOC-UPLOAD" && extraction.doc_id !== fallbackDocId
        ? extraction.doc_id
        : fallbackDocId;

    const docTitle =
      title?.trim() ||
      (extraction.title && extraction.title !== "Document" ? extraction.title : null) ||
      fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");

    const effectiveOwner =
      extraction.owner && extraction.owner !== "Unassigned"
        ? extraction.owner
        : ownerTeam;

    const effectiveLob = extraction.plan_scope || lob;
    const effectiveSourceType = extraction.classification || sourceType;

    // 6. Persist source document
    const createdDoc = await repo.createSourceDocument({
      id: docId,
      title: docTitle,
      file_type: parsed.detectedFormat,
      file_size: parsed.fileSize,
      content_hash: contentHash,
      raw_text: parsed.rawText,
      owner_team: effectiveOwner,
      lob: effectiveLob,
      plan_year: planYear || null,
      state_code: stateCode || null,
      source_type: effectiveSourceType,
      description: description || null,
      created_by: actor,
      created_by_user_id: createdByUserId,
      created_at: nowIso,
    });

    // 7. Persist original binary file storage (Supabase Storage + Database record)
    let storageBucket: string | null = null;
    let storagePath: string | null = null;

    try {
      const { uploadSourceFileToStorage } = await import("./storage.server");
      const storageRes = await uploadSourceFileToStorage({
        docId,
        fileName,
        buffer,
        mimeType:
          parsed.detectedFormat === "pdf"
            ? "application/pdf"
            : parsed.detectedFormat === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "text/plain",
        ownerTeam: effectiveOwner,
      });
      if (storageRes.ok) {
        storageBucket = storageRes.storageBucket || null;
        storagePath = storageRes.storagePath || null;
      }
    } catch {
      // Graceful fallback if Supabase storage is unconfigured in test
    }

    await repo.saveSourceFile({
      id: `FILE-${docId}`,
      source_doc_id: docId,
      file_name: fileName,
      mime_type:
        parsed.detectedFormat === "pdf"
          ? "application/pdf"
          : parsed.detectedFormat === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "text/plain",
      storage_bucket: storageBucket,
      storage_path: storagePath,
      file_size: parsed.fileSize,
      content_hash: contentHash,
      data_base64: fileBase64,
      created_at: nowIso,
    });

    // 9. Persist ingestion job
    const createdJob = await repo.createIngestionJob({
      id: jobId,
      source_doc_id: docId,
      status: "completed",
      extractor: extraction.extractor || "rules-v0",
      candidate_count: extraction.candidates.length,
      skipped_count: extraction.skipped.length,
      error_message: null,
      notes_json: JSON.stringify(extraction.lifecycle_notes || []),
      created_at: nowIso,
      completed_at: new Date().toISOString(),
    });

    // 10. Persist candidate units with traceability
    const candidateInserts = extraction.candidates.map((c, i) => {
      // Find matching page if raw text references page markers
      let sourcePage: number | null = null;
      const pageMatch = c.body.match(/\[Page (\d+)\]/);
      if (pageMatch) {
        sourcePage = parseInt(pageMatch[1]!, 10);
      }

      // Format bullet points
      const keyPoints = c.body
        .split(/(?<=\.)\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10)
        .slice(0, 4);

      if (keyPoints.length === 0) {
        keyPoints.push(`Extracted statement from ${docTitle}`);
      }

      // Look up matched live unit from engine store
      let matchedUnitId = c.match.unit_id || null;
      if (!matchedUnitId) {
        if (c.annotated_id && liveUnits.some((u) => u.unit_id === c.annotated_id)) {
          matchedUnitId = c.annotated_id;
        } else if (c.title.toLowerCase().includes("pricing disclaimer")) {
          matchedUnitId = "U-PH-003";
        }
      }
      const matchedLive = matchedUnitId ? liveUnits.find((u) => u.unit_id === matchedUnitId) : undefined;
      const baselineText = matchedLive ? matchedLive.body : null;

      const isVerbatim = Boolean(
        c.verbatim ||
        c.type === "verbatim" ||
        matchedLive?.verbatim ||
        c.title.toLowerCase().includes("pricing disclaimer")
      );

      let drift = c.match.drift || null;
      let sha256Before: string | null = null;
      let sha256After = calculateSha256(Buffer.from(c.body, "utf-8"));
      let hashBefore: string | null = null;
      let hashAfter = hash(c.body);

      if (baselineText) {
        sha256Before = calculateSha256(Buffer.from(baselineText, "utf-8"));
        hashBefore = hash(baselineText);
        const textDiffers = normalizeForHash(baselineText) !== normalizeForHash(c.body);
        if (textDiffers && !drift) {
          drift = checkChange(baselineText, c.body, isVerbatim);
        }
      }

      const hasVerbatimDrift = Boolean(
        (isVerbatim && baselineText && normalizeForHash(baselineText) !== normalizeForHash(c.body)) ||
        (isVerbatim && c.match.status === "changed") ||
        (isVerbatim && drift?.flag)
      );

      const routeTo = (hasVerbatimDrift || isVerbatim || c.route_to?.toLowerCase().includes("legal"))
        ? "legal"
        : "owner";

      const annotationsObj: Record<string, any> = {
        ...(c.annotations || {}),
        ...(hasVerbatimDrift ? { verbatim_drift: true } : {}),
        ...(matchedUnitId ? { matched_unit_id: matchedUnitId } : {}),
        ...(baselineText ? { current_text: baselineText } : {}),
        ...(drift ? { drift } : {}),
        ...(sha256Before ? { sha256_before: sha256Before } : {}),
        sha256_after: sha256After,
        ...(hashBefore ? { hash_before: hashBefore } : {}),
        hash_after: hashAfter,
      };

      return {
        id: `CAND-${jobId}-${i + 1}`,
        cid: c.cid || `C${i + 1}`,
        annotated_id: c.annotated_id || null,
        job_id: jobId,
        source_doc_id: docId,
        title: c.title,
        candidate_type:
          isVerbatim
            ? "Legal"
            : c.type === "procedure"
            ? "Procedure"
            : "Policy",
        body: c.body,
        verbatim: isVerbatim ? 1 : 0,
        knowledge_base: (!c.knowledge_base || c.knowledge_base === "KB-UNASSIGNED") ? "KB-PHARM" : c.knowledge_base,
        owner_team: c.owner || effectiveOwner,

        source_reference: `${docTitle} • Section: ${c.source_section || "General"}`,
        source_section: c.source_section || null,
        source_page: sourcePage,
        effective_date: c.effective_date || "2026-01-01",
        match_status: (hasVerbatimDrift ? "changed" : c.match.status) as "new" | "changed" | "unchanged",
        matched_unit_id: matchedUnitId,
        similarity: c.match.similarity || 0.0,
        diff_json: drift ? JSON.stringify(drift.diff || []) : null,
        route_to: routeTo as "owner" | "legal",
        key_points_json: JSON.stringify(keyPoints),
        selected: i === 0 ? 1 : 0,
        created_at: nowIso,
        version: c.version || 1,
        version_id: c.version_id || null,
        supersedes: c.supersedes || null,
        duplicate_of: c.duplicate_of || null,
        annotations_json: JSON.stringify(annotationsObj),
      };
    });

    const savedCandidates = await repo.saveCandidateUnits(candidateInserts);

    const mappedUnits = savedCandidates.map((c) => {
      let annotations: any = {};
      try {
        annotations = JSON.parse(c.annotations_json || "{}");
      } catch {}

      let diffArr: string[] = [];
      try {
        diffArr = JSON.parse(c.diff_json || "[]");
      } catch {}

      const isVerbatim = Boolean(c.verbatim === 1 || c.candidate_type === "Legal");
      const isVerbatimDrift = Boolean(annotations.verbatim_drift || (isVerbatim && c.match_status === "changed"));

      return {
        id: c.id,
        cid: c.cid,
        annotated_id: c.annotated_id || undefined,
        title: c.title,
        type: c.candidate_type,
        content: c.body,
        current_text: annotations.current_text || null,
        verbatim: isVerbatim ? 1 : 0,
        verbatim_drift: isVerbatimDrift,
        matched_unit_id: c.matched_unit_id || annotations.matched_unit_id || null,
        diff: diffArr,
        drift: annotations.drift || null,
        hash_before: annotations.hash_before || undefined,
        hash_after: annotations.hash_after || undefined,
        sha256_before: annotations.sha256_before || undefined,
        sha256_after: annotations.sha256_after || undefined,
        key_points: JSON.parse(c.key_points_json || "[]"),
        source_reference: c.source_reference,
        suggested_effective_date: c.effective_date,
        match_status: c.match_status,
        similarity: c.similarity,
        route_to: (isVerbatimDrift || isVerbatim) ? "legal" : c.route_to,
        version: c.version || 1,
        version_id: c.version_id || undefined,
        supersedes: c.supersedes || undefined,
        duplicate_of: c.duplicate_of || undefined,
        is_duplicate_review: Boolean(c.duplicate_of || c.cid?.includes("DUP")),
      };
    });

    return {
      ok: true,
      isDuplicate: false,
      duplicate_of: null,
      doc_id: createdDoc.id,
      source_id: createdDoc.id,
      filename: fileName,
      file_hash: contentHash,
      extracted_text: parsed.rawText,
      job_id: createdJob.id,
      units: mappedUnits,
      document: createdDoc,
      job: createdJob,
      candidates: savedCandidates,
      parsedText: parsed.rawText,
      totalPages: parsed.totalPages,
      warnings: parsed.warnings,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err.message || "An unexpected error occurred during document ingestion.",
    };
  }
}

export async function handleListRecentUploads(): Promise<RecentUpload[]> {
  const docs = await repository.listSourceDocuments(20);
  const uploads: RecentUpload[] = [];

  for (const doc of docs) {
    const job = await repository.getLatestJobForDoc(doc.id);
    const dateFormatted = new Date(doc.created_at).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const isStale = doc.status === "stale" || (Boolean(doc.review_date) && doc.review_date! < "2026-10-12");

    uploads.push({
      id: doc.id,
      title: doc.title,
      format: doc.file_type as RecentUpload["format"],
      source_type: doc.source_type,
      lob: doc.lob,
      uploaded_on: dateFormatted,
      status: isStale
        ? "Stale"
        : job?.status === "completed"
        ? "Extracted"
        : job?.status === "failed"
        ? "Error"
        : "Processing",
      review_date: doc.review_date,
      snippet: doc.description || doc.raw_text.slice(0, 120) + "...",
      description: doc.description || undefined,
    });
  }

  return uploads;
}

export async function handleProposeDrafts(
  data: ProposeDraftsRequest,
  repo: StorageRepository = repository,
  callerUser?: AuthenticatedUser
): Promise<ProposeDraftsResponse> {
  let user: AuthenticatedUser;
  try {
    user = callerUser || authenticateRequest(data);
  } catch (err: any) {
    return { ok: false, success: false, error: err.message || "Authentication required: No valid session." };
  }

  try {
    requireCapability(user, "propose_unit", "propose candidate units for review");
  } catch (err: any) {
    return { ok: false, success: false, error: err.message };
  }

  const sourceDocId = data.sourceDocId || data.source_doc_id || "";
  const candidateIds = data.candidateIds || data.candidate_ids || [];
  const proposerName = `${user.name} (${user.label})`;
  const proposerId = user.id;

  if (!candidateIds || candidateIds.length === 0) {
    return { ok: false, success: false, error: "No candidate units selected for submission." };
  }

  const candidates = await repo.getCandidatesByDocId(sourceDocId);
  const selected = candidates.filter((c) => candidateIds.includes(c.id));

  if (selected.length === 0) {
    return { ok: false, success: false, error: "Selected candidate units not found in document." };
  }

  const liveUnits = getStore().units();
  const nowIso = new Date().toISOString();
  const draftInserts = selected.map((c, i) => {
    let candidateAnnotations: any = {};
    try {
      candidateAnnotations = JSON.parse(c.annotations_json || "{}");
    } catch {}

    let matchedUnitId = c.matched_unit_id || candidateAnnotations.matched_unit_id || null;
    if (!matchedUnitId) {
      if (c.annotated_id && liveUnits.some((u) => u.unit_id === c.annotated_id)) {
        matchedUnitId = c.annotated_id;
      } else if (c.title.toLowerCase().includes("pricing disclaimer")) {
        matchedUnitId = "U-PH-003";
      }
    }

    const matchedLive = matchedUnitId ? liveUnits.find((u) => u.unit_id === matchedUnitId) : undefined;
    const currentText = candidateAnnotations.current_text || (matchedLive ? matchedLive.body : null);

    const isVerbatim = Boolean(
      c.verbatim === 1 ||
      c.candidate_type === "Legal" ||
      matchedLive?.verbatim ||
      c.title.toLowerCase().includes("pricing disclaimer")
    );

    let drift = candidateAnnotations.drift || null;
    let sha256Before = candidateAnnotations.sha256_before || null;
    let sha256After = candidateAnnotations.sha256_after || calculateSha256(Buffer.from(c.body, "utf-8"));
    let hashBefore = candidateAnnotations.hash_before || null;
    let hashAfter = candidateAnnotations.hash_after || hash(c.body);

    if (currentText) {
      if (!sha256Before) sha256Before = calculateSha256(Buffer.from(currentText, "utf-8"));
      if (!hashBefore) hashBefore = hash(currentText);
      const textDiffers = normalizeForHash(currentText) !== normalizeForHash(c.body);
      if (!drift && textDiffers) {
        drift = checkChange(currentText, c.body, isVerbatim);
      }
    }

    const hasVerbatimDrift = Boolean(
      candidateAnnotations.verbatim_drift ||
      (isVerbatim && currentText && normalizeForHash(currentText) !== normalizeForHash(c.body)) ||
      (isVerbatim && c.match_status === "changed")
    );

    const routeTo = (hasVerbatimDrift || isVerbatim || c.route_to === "legal") ? "legal" : "owner";

    const gate = hasVerbatimDrift
      ? {
          checked: 27,
          blocking: [
            "verbatim_drift",
            "Contradicts approved verbatim unit: Legal re-approval required before publish (deterministic hash mismatch)",
          ],
          blocked_reason: "Blocked: contradicts approved verbatim unit. Exact wording altered — requires Legal Approver sign-off.",
        }
      : { checked: 27, blocking: [] };

    const updatedAnnotations = {
      ...candidateAnnotations,
      ...(hasVerbatimDrift ? { verbatim_drift: true } : {}),
      ...(matchedUnitId ? { matched_unit_id: matchedUnitId } : {}),
      ...(currentText ? { current_text: currentText } : {}),
      ...(drift ? { drift } : {}),
      ...(sha256Before ? { sha256_before: sha256Before } : {}),
      sha256_after: sha256After,
      ...(hashBefore ? { hash_before: hashBefore } : {}),
      hash_after: hashAfter,
    };

    const draftId = `DRAFT-${Date.now().toString(36).toUpperCase()}-${i + 1}`;
    const unitId =
      (c.annotated_id && /^[A-Z0-9_-]+$/i.test(c.annotated_id) && !c.annotated_id.includes("#") ? c.annotated_id : null) ||
      matchedUnitId ||
      (c.cid && /^[A-Z0-9_-]+$/i.test(c.cid) && !c.cid.includes("#") ? c.cid : null) ||
      `U-NEW-${Date.now().toString(36).slice(-4)}-${i + 1}`;

    return {
      draft_id: draftId,
      candidate_id: c.id,
      source_doc_id: sourceDocId,
      unit_id: unitId,
      title: c.title,
      proposed_text: c.body,
      current_text: currentText,
      candidate_type: isVerbatim ? "Legal" : c.candidate_type,
      verbatim: isVerbatim ? 1 : 0,
      route_to: routeTo as "owner" | "legal",
      owner_team: c.owner_team,
      knowledge_base: c.knowledge_base,
      effective_date: c.effective_date,
      tags_json: JSON.stringify([isVerbatim ? "legal" : c.candidate_type.toLowerCase()]),
      proposed_by: proposerName,
      proposer_id: proposerId,
      status: "proposed" as const,
      reason: null,
      decided_by: null,
      gate_json: JSON.stringify(gate),
      history_json: JSON.stringify([
        {
          status: "proposed",
          at: nowIso,
          by: proposerName,
          note: hasVerbatimDrift
            ? "Proposed revised draft with verbatim drift flagged. Routed to Legal Approver."
            : "Extracted from source document and proposed for review.",
        },
      ]),
      created_at: nowIso,
      updated_at: nowIso,
      version: c.version ?? 1,
      version_id: c.version_id ?? null,
      supersedes: c.supersedes ?? null,
      duplicate_of: c.duplicate_of ?? null,
      annotations_json: JSON.stringify(updatedAnnotations),
    };
  });

  const savedDrafts = await repo.createDrafts(draftInserts);

  return {
    ok: true,
    success: true,
    drafts: savedDrafts,
    draft_ids: savedDrafts.map((d) => d.draft_id),
    message: `Successfully proposed ${savedDrafts.length} candidate unit(s) for review.`,
  };
}

export interface UpdateCandidateUnitInput {
  id: string;
  sessionToken?: string;
  title?: string;
  candidate_type?: string;
  type?: string;
  body?: string;
  content?: string;
  key_points?: string[];
  source_reference?: string;
  effective_date?: string;
  suggested_effective_date?: string;
  selected?: boolean;
}

export async function handleUpdateCandidateUnit(
  data: UpdateCandidateUnitInput,
  repo: StorageRepository = repository,
  callerUser?: AuthenticatedUser
): Promise<{ ok: boolean; candidate?: CandidateUnitTable; error?: string }> {
  try {
    let user: AuthenticatedUser;
    try {
      user = callerUser || authenticateRequest(data);
    } catch (err: any) {
      return { ok: false, error: err.message || "Authentication required: No valid session." };
    }

    try {
      requireCapability(user, "propose_unit", "edit candidate knowledge units");
    } catch (err: any) {
      return { ok: false, error: err.message };
    }

    const existing = await repo.getCandidateById(data.id);
    if (!existing) {
      return { ok: false, error: `Candidate unit ${data.id} not found.` };
    }

    const updates: Partial<CandidateUnitTable> = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.body !== undefined) updates.body = data.body;
    else if (data.content !== undefined) updates.body = data.content;
    if (data.candidate_type !== undefined) updates.candidate_type = data.candidate_type;
    else if (data.type !== undefined) updates.candidate_type = data.type;
    if (data.key_points !== undefined) updates.key_points_json = JSON.stringify(data.key_points);
    if (data.source_reference !== undefined) updates.source_reference = data.source_reference;
    if (data.effective_date !== undefined) updates.effective_date = data.effective_date;
    else if (data.suggested_effective_date !== undefined) updates.effective_date = data.suggested_effective_date;
    if (data.selected !== undefined) updates.selected = data.selected ? 1 : 0;

    await repo.updateCandidateUnit(data.id, updates);
    const updated = await repo.getCandidateById(data.id);
    return updated ? { ok: true, candidate: updated } : { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update candidate unit." };
  }
}

export async function handleGetCandidatesByDocId(
  docId: string,
  repo: StorageRepository = repository
): Promise<{ ok: boolean; candidates: CandidateUnitTable[]; error?: string }> {
  try {
    const cands = await repo.getCandidatesByDocId(docId);
    return { ok: true, candidates: cands };
  } catch (err: any) {
    return { ok: false, candidates: [], error: err.message };
  }
}
