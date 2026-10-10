import { repository, StorageRepository } from "../storage/repository";
import { INITIAL_REVIEW_QUEUE, type ReviewQueueItem, type ReviewStatus } from "../types/review";
import { getStore } from "../verity-engine/server";
import { checkPublication } from "../verity-engine/regression";
import { Verity } from "../verity-engine/pipeline";
import type { DraftTable } from "../storage/schema";
import type { KnowledgeUnit } from "../verity-engine/types";
import type { ReviewDecisionRequest, ReviewDecisionResponse } from "./review.functions";

/**
 * Seed initial operational drafts into the persistent database if the table is empty.
 * This guarantees the review queue and drafts are backed by real SQLite records.
 */
export async function seedInitialDraftsIfEmpty(repo: StorageRepository = repository): Promise<void> {
  const existing = await repo.listDrafts();
  if (existing.length > 0) return;

  const now = new Date();
  const seeds = INITIAL_REVIEW_QUEUE.map((it, idx) => {
    const isLegal =
      it.assigned_reviewer?.toLowerCase().includes("legal") ||
      it.type === "Policy" && idx === 2;

    const statusMap: Record<ReviewStatus, DraftTable["status"]> = {
      "Pending review": "proposed",
      "Requested changes": "requested_changes",
      Approved: "approved",
      Rejected: "rejected",
    };

    return {
      draft_id: it.id,
      candidate_id: null,
      source_doc_id: null,
      unit_id: it.unit_id || `U-PH-${String(idx + 1).padStart(3, "0")}`,
      title: it.title,
      proposed_text: it.content,
      current_text: null,
      candidate_type: it.type || "Policy",
      verbatim: isLegal ? 1 : 0,
      route_to: (isLegal ? "legal" : "owner") as "owner" | "legal",
      owner_team: "Pharmacy Ops",
      knowledge_base: "KB-PHARM",
      effective_date: it.suggested_effective_date || "2026-01-01",
      tags_json: JSON.stringify(it.key_points || []),
      proposed_by: it.history?.[0]?.by || "Dana (Knowledge author)",
      status: statusMap[it.status] || "proposed",
      reason: it.reviewer_notes || null,
      decided_by: it.status === "Approved" ? "Owen (Knowledge owner)" : null,
      gate_json: JSON.stringify({ checked: 27, blocking: [] }),
      history_json: JSON.stringify(
        it.history || [
          {
            action: "Proposed draft",
            by: "Dana (Knowledge author)",
            at: new Date(now.getTime() - (idx + 1) * 3600000).toLocaleString(),
            note: "Extracted from source document and submitted for review.",
          },
        ]
      ),
      created_at: new Date(now.getTime() - (idx + 1) * 3600000).toISOString(),
      updated_at: new Date(now.getTime() - (idx + 1) * 3600000).toISOString(),
    };
  });

  await repo.createDrafts(seeds);
}

/**
 * Maps a persistent DraftTable row to the UI ReviewQueueItem shape.
 */
export function draftTableToReviewQueueItem(
  draft: DraftTable,
  docTitle?: string,
  docLob?: string,
  candidateMeta?: { source_section?: string | null; source_reference?: string | null }
): ReviewQueueItem {
  let history: { action: string; by: string; at: string; note?: string }[] = [];
  try {
    history = JSON.parse(draft.history_json || "[]");
  } catch {
    history = [];
  }

  let keyPoints: string[] = [];
  try {
    keyPoints = JSON.parse(draft.tags_json || "[]");
  } catch {
    keyPoints = [];
  }

  const statusMap: Record<string, ReviewStatus> = {
    proposed: "Pending review",
    in_review: "Pending review",
    requested_changes: "Requested changes",
    approved: "Approved",
    rejected: "Rejected",
  };

  const status: ReviewStatus = statusMap[draft.status] || "Pending review";
  const isLegal = draft.verbatim === 1 || draft.route_to === "legal";
  const isDemo = !draft.source_doc_id || draft.draft_id.startsWith("REV-");
  const section =
    candidateMeta?.source_section ||
    (isDemo ? "Section 4.2" : "Section 1");

  return {
    id: draft.draft_id,
    unit_id: draft.unit_id,
    source_id: draft.source_doc_id || undefined,
    is_demo: isDemo,
    title: draft.title,
    preview:
      draft.proposed_text.length > 110
        ? draft.proposed_text.slice(0, 107) + "..."
        : draft.proposed_text,
    content: draft.proposed_text,
    source_doc: docTitle || draft.source_doc_id || "Member Services Guide v3",
    section,
    type: (draft.candidate_type as any) || "Policy",
    status,
    extracted_on: new Date(draft.created_at).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    lob: docLob || "MAPD",
    state: "All states",
    suggested_effective_date: draft.effective_date || "2026-01-01",
    key_points: keyPoints.length > 0 ? keyPoints : [draft.title],
    reviewer_notes: draft.reason || undefined,
    assigned_reviewer: isLegal ? "Rita (Legal / Compliance approver)" : "Owen (Knowledge owner)",
    demand: 38,
    due_date: "2026-02-15",
    history,
  };
}

/**
 * Handle listing all review queue items from the persistent repository.
 */
export async function handleListReviewQueue(
  repo: StorageRepository = repository
): Promise<ReviewQueueItem[]> {
  await seedInitialDraftsIfEmpty(repo);
  const drafts = await repo.listDrafts();
  const docs = await repo.listSourceDocuments(100);

  const docMap = new Map<string, { title: string; lob: string }>();
  const candidateMap = new Map<string, { source_section: string | null; source_reference: string | null }>();

  for (const doc of docs) {
    docMap.set(doc.id, { title: doc.title, lob: doc.lob });
    const cands = await repo.getCandidatesByDocId(doc.id);
    for (const c of cands) {
      candidateMap.set(c.id, { source_section: c.source_section, source_reference: c.source_reference });
    }
  }

  return drafts.map((d) => {
    const meta = d.source_doc_id ? docMap.get(d.source_doc_id) : undefined;
    const cand = d.candidate_id ? candidateMap.get(d.candidate_id) : undefined;
    return draftTableToReviewQueueItem(d, meta?.title, meta?.lob, cand);
  });
}

/**
 * Handle listing an author's active drafts from persistent storage.
 */
export async function handleListMyDrafts(
  proposerName?: string,
  repo: StorageRepository = repository
): Promise<DraftTable[]> {
  await seedInitialDraftsIfEmpty(repo);
  const allDrafts = await repo.listDrafts();
  
  // Real drafts proposed from ingested source documents
  const authorDrafts = allDrafts.filter((d) => d.source_doc_id !== null);
  if (!proposerName || !proposerName.trim()) return authorDrafts;

  const targetFirst = proposerName.trim().toLowerCase().split(/[\s(]/)[0];
  return authorDrafts.filter((d) => {
    const propLower = (d.proposed_by || "").toLowerCase();
    return propLower.includes(proposerName.toLowerCase()) || propLower.includes(targetFirst);
  });
}

/**
 * Handle server-side review actions with maker-checker, governance, and publication rules.
 */
export async function handleDecideReviewItem(
  req: ReviewDecisionRequest,
  repo: StorageRepository = repository
): Promise<ReviewDecisionResponse> {
  const { draftId, action, reviewerName, reviewerLabel = "", reviewerRole = "", notes = "" } = req;

  if (!draftId) {
    return { ok: false, success: false, error: "Missing required draft ID." };
  }

  await seedInitialDraftsIfEmpty(repo);
  const draft = await repo.getDraftById(draftId);
  if (!draft) {
    return { ok: false, success: false, error: `Draft "${draftId}" not found in persistent store.` };
  }

  const caps = req.reviewerCapabilities || [];
  const hasApproveStd = caps.includes("approve_standard") || reviewerRole === "knowledge_owner" || reviewerRole === "legal_approver";
  const hasApproveLegal = caps.includes("approve_legal") || reviewerRole === "legal_approver";

  // 1. APPROVE ACTION
  if (action === "approve") {
    // Maker-checker rule enforcement: author cannot approve their own draft!
    const proposerLower = (draft.proposed_by || "").toLowerCase();
    const reviewerLower = (reviewerName || "").toLowerCase();
    const proposerFirst = proposerLower.split(/[\s(]/)[0] || "";
    const reviewerFirst = reviewerLower.split(/[\s(]/)[0] || "";

    if (proposerFirst && reviewerFirst && proposerFirst === reviewerFirst) {
      return {
        ok: false,
        success: false,
        error: `Maker-checker violation: You (${reviewerName}) cannot approve your own proposed draft. Approval requires an independent reviewer.`,
      };
    }

    // Role capability verification
    if (!hasApproveStd && !hasApproveLegal) {
      return {
        ok: false,
        success: false,
        error: `Unauthorized: Your role does not hold authorization to approve knowledge units.`,
      };
    }

    const isLegalRequired = draft.verbatim === 1 || draft.route_to === "legal";
    if (isLegalRequired && !hasApproveLegal) {
      return {
        ok: false,
        success: false,
        error: `Unauthorized: Verbatim and legal-authority units require Legal Approver authorization.`,
      };
    }

    // Regression & Publication Gate: Check against the Golden Evaluation suite
    try {
      const store = getStore();
      const currentLive = store.units();

      const publishedUnit: KnowledgeUnit = {
        unit_id: draft.unit_id,
        title: draft.title,
        type: (draft.candidate_type.toLowerCase() as any) || "fact",
        body: draft.proposed_text,
        verbatim: Boolean(draft.verbatim),
        spoken_version: null,
        knowledge_base: draft.knowledge_base || "KB-PHARM",
        audience: ["advocate"],
        channels: ["advocate_view", "member_chat", "voice"],
        authority_level: draft.verbatim ? "legal_approved" : "knowledge_article",
        source_doc: draft.source_doc_id || "Governed Document Ingestion",
        source_section: "Section 1",
        effective_date: draft.effective_date || "2026-01-01",
        review_date: "2027-01-01",
        version: 1,
        status: "approved",
        supersedes: null,
        synonyms: [draft.title],
        owner: draft.owner_team || "Pharmacy Ops",
        approved_by: `${reviewerName} (${reviewerLabel || reviewerRole})`,
        applies_to: { lob: ["MAPD"], states: "ALL", plan_year: 2026 },
      };

      const afterUnits = [...currentLive.filter((u) => u.unit_id !== draft.unit_id), publishedUnit];
      const golden = (store as any).data?.golden ?? [];
      const report = checkPublication((store as any).data, currentLive, afterUnits, golden);

      if (!report.allowed) {
        return {
          ok: false,
          success: false,
          error: `Publication regression gate blocked: ${report.summary}`,
        };
      }

      // Live KnowledgeStore update
      (store as any).live = afterUnits;
      (store as any).engineCache = new Verity({ ...(store as any).data, units: afterUnits });
    } catch (err: any) {
      return {
        ok: false,
        success: false,
        error: `Governance check failed: ${err.message}`,
      };
    }

    // Persist approval to database
    let history: any[] = [];
    try {
      history = JSON.parse(draft.history_json || "[]");
    } catch {}

    const nowIso = new Date().toISOString();
    const nowDisplay = new Date().toLocaleString();
    history.push({
      action: "Approved",
      by: `${reviewerName} (${reviewerLabel || reviewerRole})`,
      at: nowDisplay,
      note: notes.trim() || "Approved for publication in knowledge library.",
    });

    await repo.updateDraft(draft.draft_id, {
      status: "approved",
      decided_by: reviewerName,
      reason: notes.trim() || "Approved for publication in knowledge library.",
      history_json: JSON.stringify(history),
      updated_at: nowIso,
    });

    const updated = await repo.getDraftById(draft.draft_id);
    return {
      ok: true,
      success: true,
      draft: updated,
      message: `Successfully approved "${draft.title}". Published as governed unit ${draft.unit_id}.`,
    };
  }

  // 2. REJECT ACTION
  if (action === "reject") {
    if (!notes.trim()) {
      return {
        ok: false,
        success: false,
        error: "A rejection reason or note is required to reject a knowledge unit.",
      };
    }

    let history: any[] = [];
    try {
      history = JSON.parse(draft.history_json || "[]");
    } catch {}

    const nowIso = new Date().toISOString();
    const nowDisplay = new Date().toLocaleString();
    history.push({
      action: "Rejected",
      by: `${reviewerName} (${reviewerLabel || reviewerRole})`,
      at: nowDisplay,
      note: notes.trim(),
    });

    await repo.updateDraft(draft.draft_id, {
      status: "rejected",
      decided_by: reviewerName,
      reason: notes.trim(),
      history_json: JSON.stringify(history),
      updated_at: nowIso,
    });

    const updated = await repo.getDraftById(draft.draft_id);
    return {
      ok: true,
      success: true,
      draft: updated,
      message: `Draft "${draft.title}" rejected and archived.`,
    };
  }

  // 3. REQUEST CHANGES ACTION
  if (action === "request_changes") {
    if (!notes.trim()) {
      return {
        ok: false,
        success: false,
        error: "Please provide reviewer notes explaining the requested changes.",
      };
    }

    let history: any[] = [];
    try {
      history = JSON.parse(draft.history_json || "[]");
    } catch {}

    const nowIso = new Date().toISOString();
    const nowDisplay = new Date().toLocaleString();
    history.push({
      action: "Requested changes",
      by: `${reviewerName} (${reviewerLabel || reviewerRole})`,
      at: nowDisplay,
      note: notes.trim(),
    });

    await repo.updateDraft(draft.draft_id, {
      status: "requested_changes",
      decided_by: reviewerName,
      reason: notes.trim(),
      history_json: JSON.stringify(history),
      updated_at: nowIso,
    });

    const updated = await repo.getDraftById(draft.draft_id);
    return {
      ok: true,
      success: true,
      draft: updated,
      message: `Changes requested for "${draft.title}". Routed back to author queue.`,
    };
  }

  return { ok: false, success: false, error: `Unrecognized review action "${action}".` };
}
