import { repository, StorageRepository } from "../storage/repository";
import { INITIAL_REVIEW_QUEUE, type ReviewQueueItem, type ReviewStatus } from "../types/review";
import { getStore } from "../verity-engine/server";
import { checkPublication } from "../verity-engine/regression";
import { Verity } from "../verity-engine/pipeline";
import type { DraftTable } from "../storage/schema";
import type { KnowledgeUnit } from "../verity-engine/types";
import type { ReviewDecisionRequest, ReviewDecisionResponse } from "./review.functions";
import { updateDemoState, type DemoUnit } from "./demoStore";
import {
  authenticateRequest,
  resolveRequestUser,
  type AuthenticatedUser,
} from "./auth.server";
import { classifyGapDomain } from "../lib/gapClassifier";

export { resolveRequestUser };

/**
 * Seed initial operational drafts into the persistent database if missing.
 * This guarantees the review queue and drafts are backed by real SQLite records.
 */
export async function seedInitialDraftsIfEmpty(repo: StorageRepository = repository): Promise<void> {
  try {
    const existing = await repo.listDrafts();
    const existingIds = new Set(existing.map((d) => d.draft_id));
    const missing = INITIAL_REVIEW_QUEUE.filter((it) => !existingIds.has(it.id));
    if (missing.length === 0) return;

    const now = new Date();
    const seeds = missing.map((it, idx) => {
      const isLegal =
        it.assigned_reviewer?.toLowerCase().includes("legal") ||
        (it.type === "Policy" && idx === 2);

      const statusMap: Record<ReviewStatus, DraftTable["status"]> = {
        "Pending review": "proposed",
        "Requested changes": "requested_changes",
        Approved: "approved",
        Rejected: "rejected",
      };

      const isConflict = it.id.startsWith("REV-CONF") || it.id.startsWith("CONF-");

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
        owner_team: isConflict ? "Knowledge Ops" : "Pharmacy Ops",
        knowledge_base: "KB-PHARM",
        effective_date: it.suggested_effective_date || "2026-01-01",
        tags_json: JSON.stringify(it.key_points || []),
        proposed_by: it.history?.[0]?.by || "Dana (Knowledge author)",
        status: statusMap[it.status] || "proposed",
        reason: it.reviewer_notes || null,
        decided_by: it.status === "Approved" ? "Owen (Knowledge owner)" : null,
        supersedes: it.supersedes || null,
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
  } catch (err) {
    // Concurrency safety if multiple callers seed simultaneously
  }
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
  const isInsurance =
    draft.knowledge_base === "KB-INS" ||
    draft.owner_team?.toLowerCase().includes("insurance") ||
    classifyGapDomain(draft.title + " " + (draft.proposed_text || "")).domain === "Insurance";
  const isConflict =
    draft.draft_id.startsWith("CONF-") ||
    draft.draft_id.startsWith("REV-CONF-001") ||
    draft.owner_team === "Knowledge Ops" ||
    draft.title.toLowerCase().includes("conflict");
  const isDemo = !draft.source_doc_id || draft.draft_id.startsWith("REV-") || draft.draft_id.startsWith("CONF-");
  const section =
    candidateMeta?.source_section ||
    (isDemo ? "Section 4.2" : "Section 1");

  const assignedReviewer = isLegal
    ? "Rita (Legal / Compliance approver)"
    : isConflict
    ? "Knowledge Ops (Owen)"
    : isInsurance
    ? "Olivia (Knowledge owner)"
    : "Owen (Knowledge owner)";

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
    source_doc: docTitle || draft.source_doc_id || (isConflict ? "Conflict Report: U-PH-007 vs U-PH-107" : "Member Services Guide v3"),
    section: isConflict ? "Mail Order Maintenance Supply" : section,
    type: (draft.candidate_type as any) || (isConflict ? "Procedure" : "Policy"),
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
    assigned_reviewer: assignedReviewer,
    demand: isConflict ? 64 : 38,
    due_date: "2026-02-15",
    version: draft.version || 1,
    version_id: draft.version_id || undefined,
    supersedes: draft.supersedes || undefined,
    duplicate_of: draft.duplicate_of || undefined,
    is_duplicate_review: Boolean(draft.duplicate_of || draft.unit_id?.includes("DUP")),
    history,
  };
}

/**
 * Handle persistent conflict ticket creation in Knowledge Ops review queue.
 */
export async function handleCreateConflictReport(
  req: {
    person: string;
    unitIds: string[];
    query: string;
    note?: string;
  },
  repo: StorageRepository = repository
): Promise<{ ok: boolean; ticketId: string }> {
  const ticketId = `CONF-${Date.now().toString(36).toUpperCase()}`;
  const reasonText = (req.note || "").trim() || `Advocate reported conflicting sources on query "${req.query}"`;
  const unitList = req.unitIds.length > 0 ? req.unitIds.join(", ") : "U-PH-007, U-PH-107";
  const title = `Conflict Ticket: Days supply by mail (90-day vs 100-day)`;

  await repo.createDrafts([
    {
      draft_id: ticketId,
      candidate_id: null,
      source_doc_id: null,
      unit_id: unitList,
      title,
      proposed_text: [
        "Conflicting source guidance identified between approved units:",
        "• U-PH-007 (Pharmacy Ops): A 90-day supply is available by mail for most maintenance medications.",
        "• U-PH-107 (Outbound Pharmacy): Members can get up to a 100-day supply of maintenance medications by mail.",
        "",
        `Advocate Note: "${reasonText}"`,
        "",
        "Resolution workflow: Knowledge Ops opens ticket and applies consolidating source document S04 (90-day supply only), marking both U-PH-007 and U-PH-107 superseded. Legal / Reviewer approves the consolidated draft.",
      ].join("\n"),
      current_text: `Conflicting units: ${unitList}`,
      candidate_type: "Procedure",
      verbatim: 0,
      route_to: "owner",
      owner_team: "Knowledge Ops",
      knowledge_base: "KB-PHARM",
      effective_date: "2026-03-01",
      tags_json: JSON.stringify([
        `Conflicting: ${unitList}`,
        `Reported by ${req.person}`,
        "Resolution: Upload or apply S04 consolidating unit",
      ]),
      proposed_by: `${req.person} (Pharmacy advocate)`,
      status: "proposed",
      reason: reasonText,
      decided_by: null,
      gate_json: JSON.stringify({ checked: 27, blocking: [] }),
      history_json: JSON.stringify([
        {
          action: "Conflict reported for resolution",
          by: `${req.person} (Pharmacy advocate)`,
          at: new Date().toLocaleString(),
          note: reasonText,
        },
      ]),
      supersedes: unitList,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  return { ok: true, ticketId };
}

/**
 * Knowledge Ops action: opens conflict ticket -> applies S04 consolidating source.
 * Generates consolidated draft unit (90-day only, superseding conflicting units U-PH-007 and U-PH-107),
 * persists it in PostgreSQL/SQLite database, and routes to Legal for approval.
 */
export async function handleApplyConsolidatingConflictResolution(
  req: {
    person: string;
    supersedesIds?: string;
  },
  repo: StorageRepository = repository
): Promise<{ ok: boolean; draftId: string; message: string }> {
  const draftId = `REV-CONF-S04-${Date.now().toString(36)}`;
  const unitId = "U-PH-091";
  const supersedesIds =
    req.supersedesIds || "U-PH-007, U-PH-107, KB-PHARM-0142-A, KB-PHARM-0199-B";

  // 1. Persist the consolidating draft into database (source_doc_id: null, candidate_id: null)
  await repo.createDrafts([
    {
      draft_id: draftId,
      candidate_id: null,
      source_doc_id: null,
      unit_id: unitId,
      title: "Mail-order day supply — consolidated 2026",
      proposed_text:
        "Members on this plan can fill up to a 90-day supply of maintenance medications through mail order. The 100-day extended supply pilot has ended and is not available for 2026. Do not quote 100-day supply. Maintenance medications are drugs taken regularly for chronic conditions as defined on the plan formulary.",
      current_text:
        "Conflicting versions between U-PH-007 (90-day standard) and U-PH-107 (100-day legacy pilot).",
      candidate_type: "Policy",
      verbatim: 0,
      route_to: "legal",
      owner_team: "Pharmacy Ops",
      knowledge_base: "KB-PHARM",
      effective_date: "2026-03-01",
      tags_json: JSON.stringify([
        "90-day supply authoritative",
        "100-day pilot discontinued",
        "Supersedes U-PH-007 and U-PH-107",
      ]),
      proposed_by: req.person || "Owen (Knowledge owner)",
      status: "proposed",
      reason:
        "Consolidated resolution for reported mail-order conflict between U-PH-007 and U-PH-107.",
      supersedes: supersedesIds,
      decided_by: null,
      gate_json: JSON.stringify({ checked: 27, blocking: [] }),
      history_json: JSON.stringify([
        {
          action: "S04 applied by Knowledge Ops",
          by: req.person || "Owen (Knowledge owner)",
          at: new Date().toLocaleString(),
          note: "Consolidated source S04 applied. Draft unit U-PH-091 created with supersedes link.",
        },
      ]),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  // 2. Mark any open conflict tickets in the repository as resolved
  try {
    const existingDrafts = await repo.listDrafts();
    for (const d of existingDrafts) {
      if (
        (d.draft_id.startsWith("CONF-") ||
          d.draft_id === "REV-CONF-001" ||
          (d.unit_id && d.unit_id.includes("U-PH-007") && d.unit_id.includes("U-PH-107"))) &&
        d.draft_id !== draftId
      ) {
        if (d.status === "proposed") {
          await repo.updateDraft(d.draft_id, {
            status: "approved",
            decided_by: req.person || "Owen (Knowledge owner)",
            reason: `Resolved by applying S04 consolidating unit (${unitId} proposed).`,
          });
        }
      }
    }
  } catch (err) {
    console.warn("Failed to mark conflict drafts resolved in repository:", err);
  }

  return {
    ok: true,
    draftId,
    message: `Applied S04: Consolidated unit ${unitId} created and routed to Legal Approver (Rita).`,
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
  }

  // Only query candidate metadata for the documents actually referenced by drafts
  const referencedDocIds = [
    ...new Set(drafts.map((d) => d.source_doc_id).filter(Boolean)),
  ] as string[];

  if (referencedDocIds.length > 0) {
    const candidateResults = await Promise.all(
      referencedDocIds.map((docId) => repo.getCandidatesByDocId(docId))
    );
    for (const cands of candidateResults) {
      for (const c of cands) {
        candidateMap.set(c.id, {
          source_section: c.source_section,
          source_reference: c.source_reference,
        });
      }
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
    return propLower.includes(proposerName.toLowerCase()) || (targetFirst ? propLower.includes(targetFirst) : false);
  });
}

/**
 * Handle server-side review actions with maker-checker, governance, and publication rules.
 * All authorizations and identities are derived strictly from the verified session identity.
 */
export async function handleDecideReviewItem(
  req: ReviewDecisionRequest,
  repo: StorageRepository = repository,
  callerUser?: AuthenticatedUser
): Promise<ReviewDecisionResponse> {
  const { draftId, action, notes = "" } = req;

  if (!draftId) {
    return { ok: false, success: false, error: "Missing required draft ID." };
  }

  // 1. Authenticate caller strictly on the server
  let user: AuthenticatedUser;
  try {
    user = callerUser || authenticateRequest(req);
  } catch (err: any) {
    return {
      ok: false,
      success: false,
      error: err.message || "Authentication required: No valid session token or session cookie provided.",
    };
  }

  await seedInitialDraftsIfEmpty(repo);
  const draft = await repo.getDraftById(draftId);
  if (!draft) {
    return { ok: false, success: false, error: `Draft "${draftId}" not found in persistent store.` };
  }

  // 2. Maker-checker rule enforcement: proposer cannot self-approve their own draft!
  if (action === "approve") {
    // Check stable proposer_id if recorded
    if (draft.proposer_id && draft.proposer_id.toLowerCase() === user.id.toLowerCase()) {
      return {
        ok: false,
        success: false,
        error: `Maker-checker violation: You (${user.name}) cannot approve your own proposed draft. Approval requires an independent reviewer.`,
      };
    }
    // Check normalized proposed_by field
    const proposerLower = (draft.proposed_by || "").toLowerCase();
    const userLower = user.name.toLowerCase();
    const userIdLower = user.id.toLowerCase();
    const proposerToken = proposerLower.split(/[\s(]/)[0] || "";
    if (
      proposerLower.includes(userIdLower) ||
      (proposerToken && userLower.split(/[\s(]/)[0] === proposerToken)
    ) {
      return {
        ok: false,
        success: false,
        error: `Maker-checker violation: You (${user.name}) cannot approve your own proposed draft. Approval requires an independent reviewer.`,
      };
    }
  }

  // 3. Server-side RBAC: derive capabilities exclusively from server-side user record
  const hasApproveStd = user.capabilities.includes("approve_standard");
  const hasApproveLegal = user.capabilities.includes("approve_legal");

  // General RBAC gate: only authorized reviewers may decide or review drafts
  if (!hasApproveStd && !hasApproveLegal) {
    return {
      ok: false,
      success: false,
      error: `Unauthorized: User "${user.name}" (${user.label}) lacks authorization to approve, reject, or decide knowledge units.`,
    };
  }

  // Verbatim and legal-authority units require Legal Approver authorization
  const isLegalRequired = draft.verbatim === 1 || draft.route_to === "legal";
  if (isLegalRequired && !hasApproveLegal) {
    return {
      ok: false,
      success: false,
      error: `Unauthorized: Verbatim and legal-authority units require Legal Approver authorization (capability: approve_legal).`,
    };
  }

  const reviewerAudit = `${user.name} (${user.label})`;

  // 1. APPROVE ACTION
  if (action === "approve") {
    // Check if already approved
    if (draft.status === "approved") {
      return {
        ok: false,
        success: false,
        error: `Draft "${draft.title}" has already been approved.`,
      };
    }

    // Regression & Publication Gate: Check against the Golden Evaluation suite
    let publishedUnit: KnowledgeUnit;
    try {
      const store = getStore();
      const currentLive = store.units();

      const existingLive = currentLive.find((u) => u.unit_id === draft.unit_id);
      if (existingLive) {
        // Prevent silent overwrite of an existing approved unit
        if ((!draft.version || draft.version <= existingLive.version) && !draft.supersedes) {
          return {
            ok: false,
            success: false,
            error: `Governance violation: Approved unit "${draft.unit_id}" (v${existingLive.version}) cannot be silently overwritten without explicit version increment or supersedes relationship.`,
          };
        }
      }

      publishedUnit = {
        unit_id: draft.unit_id,
        title: draft.title,
        type: (draft.candidate_type.toLowerCase() as any) || (existingLive?.type ?? "fact"),
        body: draft.proposed_text,
        verbatim: Boolean(draft.verbatim),
        spoken_version: existingLive?.spoken_version || null,
        knowledge_base: draft.knowledge_base || existingLive?.knowledge_base || "KB-PHARM",
        audience: existingLive?.audience ?? (draft.verbatim ? ["advocate", "member"] : ["advocate"]),
        channels: existingLive?.channels ?? ["advocate_view", "member_chat", "voice"],
        authority_level: draft.verbatim ? "legal_approved" : (existingLive?.authority_level ?? "knowledge_article"),
        source_doc: draft.source_doc_id || existingLive?.source_doc || "Governed Document Ingestion",
        source_section: existingLive?.source_section || "Section 1",
        effective_date: draft.effective_date || "2026-01-01",
        review_date: "2027-01-01",
        version: draft.version && draft.version > (existingLive?.version ?? 0)
          ? draft.version
          : (existingLive ? existingLive.version + 1 : 1),
        status: "approved",
        supersedes: draft.supersedes || null,
        synonyms: existingLive?.synonyms ?? (() => {
          const syns: string[] = [draft.title];
          try {
            const parsed = JSON.parse(draft.tags_json || "[]");
            if (Array.isArray(parsed)) syns.push(...parsed);
          } catch {}
          const combined = `${draft.title} ${draft.proposed_text}`.toLowerCase();
          if (combined.includes("day supply") || combined.includes("days supply")) {
            syns.push("days supply", "day supply", "90 day", "100 day");
          }
          if (combined.includes("mail order") || combined.includes("mail-order")) {
            syns.push("mail order");
          }
          return [...new Set(syns)];
        })(),
        owner: draft.owner_team || existingLive?.owner || "Pharmacy Ops",
        approved_by: reviewerAudit,
        applies_to: existingLive?.applies_to ?? { lob: ["MAPD"], states: "ALL", plan_year: 2026 },
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

      // Sync in-memory demoStore
      updateDemoState((s) => {
        const supersededIds = new Set(
          (publishedUnit.supersedes ? publishedUnit.supersedes.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean) : [])
        );

        let updated = s.units.map((u) => {
          if (supersededIds.has(u.unit_id) || (u.source_doc && supersededIds.has(u.source_doc))) {
            return { ...u, status: "superseded" };
          }
          return u;
        });

        const existingIdx = updated.findIndex((u) => u.unit_id === draft.unit_id);
        const newVersion = {
          version: publishedUnit.version,
          text: publishedUnit.body,
          effective_date: publishedUnit.effective_date,
          approver: reviewerAudit,
          supersedes: publishedUnit.supersedes ?? undefined,
        };
        if (existingIdx >= 0) {
          const cur = updated[existingIdx]!;
          updated[existingIdx] = {
            ...cur,
            status: "approved",
            versions: [...cur.versions, newVersion],
          };
        } else {
          updated.push({
            unit_id: draft.unit_id,
            title: draft.title,
            owner: draft.owner_team || "Pharmacy Ops",
            verbatim: Boolean(draft.verbatim),
            status: "approved",
            versions: [newVersion],
          });
        }

        // Close any conflict tasks that referenced these superseded units
        const updatedTasks = s.reviewTasks.map((t) => {
          if (t.kind === "conflict" && t.unit_ids.some((id) => supersededIds.has(id))) {
            return { ...t, status: "done" as const };
          }
          return t;
        });

        return {
          ...s,
          units: updated,
          reviewTasks: updatedTasks,
        };
      });
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
      by: reviewerAudit,
      at: nowDisplay,
      note: notes.trim() || "Approved for publication in knowledge library.",
    });

    await repo.updateDraft(draft.draft_id, {
      status: "approved",
      decided_by: reviewerAudit,
      reason: notes.trim() || "Approved for publication in knowledge library.",
      history_json: JSON.stringify(history),
      updated_at: nowIso,
    });

    // Authoritative durable persistence in published_units
    await repo.savePublishedUnit({
      unit_id: publishedUnit.unit_id,
      title: publishedUnit.title,
      type: publishedUnit.type,
      body: publishedUnit.body,
      verbatim: publishedUnit.verbatim ? 1 : 0,
      spoken_version: publishedUnit.spoken_version,
      knowledge_base: publishedUnit.knowledge_base,
      audience_json: JSON.stringify(publishedUnit.audience || ["advocate"]),
      channels_json: JSON.stringify(publishedUnit.channels || ["advocate_view", "member_chat", "voice"]),
      authority_level: publishedUnit.authority_level,
      source_doc: publishedUnit.source_doc,
      source_section: publishedUnit.source_section,
      effective_date: publishedUnit.effective_date,
      review_date: publishedUnit.review_date,
      version: publishedUnit.version,
      status: "approved",
      supersedes: publishedUnit.supersedes,
      synonyms_json: JSON.stringify(publishedUnit.synonyms || [publishedUnit.title]),
      owner: publishedUnit.owner,
      approved_by: publishedUnit.approved_by,
      applies_to_json: JSON.stringify(publishedUnit.applies_to || { lob: ["MAPD"], states: "ALL", plan_year: 2026 }),
      created_at: nowIso,
      updated_at: nowIso,
    });

    const updated = await repo.getDraftById(draft.draft_id);
    return {
      ok: true,
      success: true,
      ...(updated ? { draft: updated } : {}),
      message: `Successfully approved "${draft.title}". Published as governed unit ${draft.unit_id}.`,
    };
  }


  // 2. REJECT ACTION
  if (action === "reject") {
    if (draft.status === "rejected") {
      return {
        ok: false,
        success: false,
        error: `Draft "${draft.title}" has already been rejected.`,
      };
    }
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
      by: reviewerAudit,
      at: nowDisplay,
      note: notes.trim(),
    });

    await repo.updateDraft(draft.draft_id, {
      status: "rejected",
      decided_by: reviewerAudit,
      reason: notes.trim(),
      history_json: JSON.stringify(history),
      updated_at: nowIso,
    });

    const updated = await repo.getDraftById(draft.draft_id);
    return {
      ok: true,
      success: true,
      ...(updated ? { draft: updated } : {}),
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
      by: reviewerAudit,
      at: nowDisplay,
      note: notes.trim(),
    });

    await repo.updateDraft(draft.draft_id, {
      status: "requested_changes",
      decided_by: reviewerAudit,
      reason: notes.trim(),
      history_json: JSON.stringify(history),
      updated_at: nowIso,
    });

    const updated = await repo.getDraftById(draft.draft_id);
    return {
      ok: true,
      success: true,
      ...(updated ? { draft: updated } : {}),
      message: `Changes requested for "${draft.title}". Routed back to author queue.`,
    };
  }

  return { ok: false, success: false, error: `Unrecognized review action "${action}".` };
}

/**
 * Authoritative list of published knowledge units for the Knowledge Library and search views.
 * Strictly returns only published units (status "approved" or "stale") from the engine/database.
 * Never leaks drafts, pending items, or rejected units.
 */
export async function handleListPublishedUnits(
  repo: StorageRepository = repository
): Promise<DemoUnit[]> {
  const { ensureStoreHydrated } = await import("../verity-engine/server");
  const store = await ensureStoreHydrated();
  const live = store.units().filter((u) => u.status === "approved" || u.status === "stale");

  return live.map((u) => {
    const allVersions = store.versions(u.unit_id);
    const versions = allVersions.length > 0
      ? allVersions.map((v) => ({
          version: v.version,
          text: v.body,
          effective_date: v.effective_date,
          approver: v.approved_by || (u.owner === "Legal" || u.verbatim ? "Rita (Legal)" : "Pharmacy Ops"),
        }))
      : [
          {
            version: u.version,
            text: u.body,
            effective_date: u.effective_date,
            approver: u.approved_by || (u.owner === "Legal" || u.verbatim ? "Rita (Legal)" : "Pharmacy Ops"),
          },
        ];

    return {
      unit_id: u.unit_id,
      title: u.title,
      owner: u.owner,
      verbatim: Boolean(u.verbatim),
      status: u.status,
      versions,
    };
  });
}

/**
 * Deletes an unapproved draft, strictly enforcing authorization and audit rules.
 * Governed rule: Published knowledge units cannot be bypassed or deleted here;
 * they must follow the governed retirement workflow.
 */
export async function handleDeleteDraft(
  draftId: string,
  user: AuthenticatedUser,
  repo: StorageRepository = repository
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const draft = await repo.getDraftById(draftId);
  if (!draft) {
    return { ok: false, error: `Draft "${draftId}" not found.` };
  }

  // Published / approved units cannot be deleted arbitrarily
  if (draft.status === "approved") {
    return {
      ok: false,
      error: `Governed rule violation: Approved draft "${draftId}" is published and cannot be deleted directly. It must follow the governed retirement workflow.`,
    };
  }

  // Authorization: Only knowledge owners, legal approvers, or the author may delete the draft
  const isOwnerOrLegal =
    user.capabilities.includes("approve_standard") ||
    user.capabilities.includes("approve_legal") ||
    user.role === "admin";
  const isAuthor =
    draft.proposer_id === user.id ||
    (draft.proposed_by && draft.proposed_by.toLowerCase().includes(user.name.toLowerCase()));

  if (!isOwnerOrLegal && !isAuthor) {
    return {
      ok: false,
      error: `Unauthorized: User "${user.name}" (${user.label}) lacks permission to delete draft "${draftId}".`,
    };
  }

  await repo.deleteDraft(draftId);
  return {
    ok: true,
    message: `Draft "${draftId}" successfully deleted by ${user.name} (${user.label}).`,
  };
}

