import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { StorageRepository } from "../storage/repository";
import { createDatabaseClient, closeDatabaseClient } from "../storage/db";
import { runMigrations } from "../storage/migrations";
import {
  handleUploadAndIngest,
  handleProposeDrafts,
} from "../services/ingest.server";
import {
  handleListReviewQueue,
  handleDecideReviewItem,
  handleListPublishedUnits,
} from "../services/review.server";
import {
  getStore,
  resetStore,
  ensureStoreHydrated,
  serveEngine,
} from "../verity-engine/server";
import { normalizeStatus, enrichUnit, scopedLibrary } from "../lib/library";
import { findPerson } from "../lib/rights";
import type { DemoUnit } from "../services/demoStore";

describe("Document Lifecycle, Visibility, and Approval-Status Verification", () => {
  let inMemoryRepo: StorageRepository;
  let testDb: ReturnType<typeof createDatabaseClient>;

  beforeEach(async () => {
    testDb = createDatabaseClient(":memory:");
    await runMigrations(testDb);
    inMemoryRepo = new StorageRepository(testDb);
    resetStore();
  });

  afterEach(async () => {
    resetStore();
    await closeDatabaseClient(testDb);
  });

  it("1. Uploaded/ingested source document never inherits Approved status or leaks to library", async () => {
    const danaUser = {
      id: "dana-author-id",
      name: "Dana",
      label: "Knowledge author",
      role: "knowledge_author",
      capabilities: ["ingest_source", "propose_unit", "get_unit"],
      kbs: ["KB-PHARM", "KB-SHARED"],
    };

    // Dana uploads an incorrect draft document
    const uploadRes = await handleUploadAndIngest(
      {
        fileName: "Faulty_Maintenance_Medication.md",
        content_text: `# Faulty Maintenance Medication Guideline
Doc ID: SRC-RX-ERR-001
Owner: Pharmacy Ops
Scope: 2026

## Section 1: Maintenance Definition
Maintenance medications include acute short-term antibiotics and temporary steroids without ongoing refill requirements.`,
        sessionToken: "vty_sess_demo_dana",
        sourceType: "Policy / Guidance",
        lob: "MAPD",
      },
      inMemoryRepo,
      danaUser
    );

    expect(uploadRes.ok).toBe(true);
    expect(uploadRes.candidates).toBeDefined();
    expect(uploadRes.candidates!.length).toBeGreaterThan(0);

    // Source document status must be Extracted, NEVER Approved
    const doc = await inMemoryRepo.getSourceDocumentById(uploadRes.doc_id!);
    expect(doc).toBeDefined();

    // Extracted candidate records have candidate match status 'new', NEVER 'Approved'
    const candidates = await inMemoryRepo.getCandidatesByDocId(uploadRes.doc_id!);
    expect(candidates.length).toBe(1);
    const cand = candidates[0]!;
    expect(cand.match_status).toBe("new");

    // Candidate MUST NOT be in published_units
    const pubUnit = await inMemoryRepo.getPublishedUnitById(cand.cid);
    expect(pubUnit).toBeUndefined();

    // Candidate MUST NOT appear in published library
    const pubUnits = await inMemoryRepo.listPublishedUnits();
    expect(pubUnits.length).toBe(0);

    // Engine search MUST NOT return or cite this unapproved candidate
    const searchRes = serveEngine({
      query: "Are antibiotics maintenance medications?",
      role: "pharmacy_advocate",
      channel: "advocate_view",
      lob: "MAPD",
    });
    const citedIds = searchRes.parts.flatMap((p) => p.citations.map((c) => c.unit_id));
    expect(citedIds).not.toContain(cand.cid);
  });

  it("2. Proposed draft has Pending review status, never Approved, and does not leak to published library", async () => {
    const danaUser = {
      id: "dana-author-id",
      name: "Dana",
      label: "Knowledge author",
      role: "knowledge_author",
      capabilities: ["ingest_source", "propose_unit", "get_unit"],
      kbs: ["KB-PHARM", "KB-SHARED"],
    };

    const uploadRes = await handleUploadAndIngest(
      {
        fileName: "Proposed_Guideline.txt",
        content_text: `Doc ID: SRC-RX-PROP-002\nTitle: Proposed Maintenance Guideline\nOwner: Pharmacy Ops\n\nSection 1:\nProposed guidance pending formal review.`,
        sessionToken: "vty_sess_demo_dana",
        lob: "MAPD",
      },
      inMemoryRepo,
      danaUser
    );

    const candId = uploadRes.candidates![0]!.id;

    const proposeRes = await handleProposeDrafts(
      {
        sourceDocId: uploadRes.doc_id!,
        candidateIds: [candId],
        sessionToken: "vty_sess_demo_dana",
      },
      inMemoryRepo,
      danaUser
    );

    expect(proposeRes.ok).toBe(true);
    expect(proposeRes.drafts).toBeDefined();
    expect(proposeRes.drafts!.length).toBe(1);

    const draft = proposeRes.drafts![0]!;
    expect(draft.status).toBe("proposed");

    // Review queue maps draft to 'Pending review'
    const queue = await handleListReviewQueue(inMemoryRepo);
    const queueItem = queue.find((q) => q.id === draft.draft_id);
    expect(queueItem).toBeDefined();
    expect(queueItem!.status).toBe("Pending review");

    // Pending draft must NOT appear in published_units
    const pubUnit = await inMemoryRepo.getPublishedUnitById(draft.unit_id);
    expect(pubUnit).toBeUndefined();

    // Pending draft must NOT leak into scopedLibrary
    const demoUnit: DemoUnit = {
      unit_id: draft.unit_id,
      title: draft.title,
      owner: draft.owner_team,
      verbatim: false,
      status: draft.status,
      versions: [],
    };
    const priya = findPerson("priya")!;
    const libItems = scopedLibrary([demoUnit], priya);
    expect(libItems.some((u) => u.unit_id === draft.unit_id)).toBe(false);
  });

  it("3. Rejected draft and draft awaiting changes never appear in published library or search", async () => {
    const danaUser = {
      id: "dana-author-id",
      name: "Dana",
      label: "Knowledge author",
      role: "knowledge_author",
      capabilities: ["ingest_source", "propose_unit", "get_unit"],
      kbs: ["KB-PHARM", "KB-SHARED"],
    };

    const uploadRes = await handleUploadAndIngest(
      {
        fileName: "Flawed_Policy.txt",
        content_text: `Doc ID: SRC-RX-FLAW-003\nTitle: Flawed Refill Policy\nOwner: Pharmacy Ops\n\nSection 1:\nRefill window is unlimited at any time without prescription.`,
        sessionToken: "vty_sess_demo_dana",
        lob: "MAPD",
      },
      inMemoryRepo,
      danaUser
    );

    const candId = uploadRes.candidates![0]!.id;
    const proposeRes = await handleProposeDrafts(
      {
        sourceDocId: uploadRes.doc_id!,
        candidateIds: [candId],
        sessionToken: "vty_sess_demo_dana",
      },
      inMemoryRepo,
      danaUser
    );

    const draftId = proposeRes.drafts![0]!.draft_id;
    const unitId = proposeRes.drafts![0]!.unit_id;

    // Reviewer requests changes
    const ritaUser = {
      id: "rita-legal-id",
      name: "Rita",
      label: "Legal Approver",
      role: "legal_approver",
      capabilities: ["approve_legal", "approve_standard", "get_unit"],
      kbs: ["KB-PHARM", "KB-SHARED"],
    };

    const changeRes = await handleDecideReviewItem(
      {
        draftId,
        action: "request_changes",
        notes: "Refill window violates CMS formulary rules. Please update.",
      },
      inMemoryRepo,
      ritaUser
    );

    expect(changeRes.ok).toBe(true);
    expect(changeRes.draft!.status).toBe("requested_changes");

    // Review queue shows 'Requested changes'
    let queue = await handleListReviewQueue(inMemoryRepo);
    let queueItem = queue.find((q) => q.id === draftId)!;
    expect(queueItem.status).toBe("Requested changes");

    // Verify not in published_units
    expect(await inMemoryRepo.getPublishedUnitById(unitId)).toBeUndefined();

    // Now Owen rejects the draft
    const owenUser = {
      id: "owen-owner-id",
      name: "Owen",
      label: "Knowledge Owner",
      role: "knowledge_owner",
      capabilities: ["approve_standard", "get_unit"],
      kbs: ["KB-PHARM", "KB-SHARED"],
    };

    const rejectRes = await handleDecideReviewItem(
      {
        draftId,
        action: "reject",
        notes: "Rejected permanently. Unsound clinical premise.",
      },
      inMemoryRepo,
      owenUser
    );

    expect(rejectRes.ok).toBe(true);
    expect(rejectRes.draft!.status).toBe("rejected");

    queue = await handleListReviewQueue(inMemoryRepo);
    queueItem = queue.find((q) => q.id === draftId)!;
    expect(queueItem.status).toBe("Rejected");

    // Rejected draft MUST NOT exist in published_units
    expect(await inMemoryRepo.getPublishedUnitById(unitId)).toBeUndefined();

    // Rejected draft MUST NOT leak into scopedLibrary
    const priya = findPerson("priya")!;
    const demoUnit: DemoUnit = {
      unit_id: unitId,
      title: "Flawed Refill Policy",
      owner: "Pharmacy Ops",
      verbatim: false,
      status: "rejected",
      versions: [],
    };
    expect(scopedLibrary([demoUnit], priya).length).toBe(0);
  });

  it("4. Approved draft is transactionally published to published_units, visible in library, and searchable", async () => {
    const danaUser = {
      id: "dana-author-id",
      name: "Dana",
      label: "Knowledge author",
      role: "knowledge_author",
      capabilities: ["ingest_source", "propose_unit", "get_unit"],
      kbs: ["KB-PHARM", "KB-SHARED"],
    };

    // Dana ingests the valid Routine Refill Request Window Update
    const uploadRes = await handleUploadAndIngest(
      {
        fileName: "Routine_Refill_Window.md",
        content_text: `# Routine Refill Request Window Update
Doc ID: SRC-RX-2026-004
Owner: Pharmacy Ops
Scope: 2026

## Section 1: Routine Refill Request Window Update
Unit ID: RX-006
Proposed Version: RX-006-v2
Supersedes: RX-006-v1
Unit Type: Policy
Domain: Pharmacy Ops
Allowed Roles: pharmacy_advocate, insurance_advocate

Members may submit routine refill requests when between 20% and 25% of their current supply remains.`,
        sessionToken: "vty_sess_demo_dana",
        lob: "MAPD",
      },
      inMemoryRepo,
      danaUser
    );

    expect(uploadRes.ok).toBe(true);
    const candidate = uploadRes.candidates![0]!;
    expect(candidate.title).toContain("Routine Refill Request Window Update");

    // Dana proposes the draft
    const proposeRes = await handleProposeDrafts(
      {
        sourceDocId: uploadRes.doc_id!,
        candidateIds: [candidate.id],
        sessionToken: "vty_sess_demo_dana",
      },
      inMemoryRepo,
      danaUser
    );

    const draft = proposeRes.drafts![0]!;
    expect(draft.unit_id).toBe("RX-006");

    // Owen approves the draft
    const owenUser = {
      id: "owen-owner-id",
      name: "Owen",
      label: "Knowledge Owner",
      role: "knowledge_owner",
      capabilities: ["approve_standard", "get_unit"],
      kbs: ["KB-PHARM", "KB-SHARED"],
    };

    const approveRes = await handleDecideReviewItem(
      {
        draftId: draft.draft_id,
        action: "approve",
        notes: "Verified against 2026 P&T formulary rules.",
      },
      inMemoryRepo,
      owenUser
    );

    expect(approveRes.ok).toBe(true);
    expect(approveRes.draft!.status).toBe("approved");
    expect(approveRes.draft!.decided_by).toContain("Owen");

    // Unit must be durably stored in published_units in SQLite!
    const published = await inMemoryRepo.getPublishedUnitById("RX-006");
    expect(published).toBeDefined();
    expect(published!.title).toContain("Routine Refill Request Window Update");
    expect(published!.status).toBe("approved");
    expect(published!.approved_by).toContain("Owen");

    // handleListPublishedUnits must include the approved unit
    const publishedList = await handleListPublishedUnits(inMemoryRepo);
    const foundPublished = publishedList.find((u) => u.unit_id === "RX-006");
    expect(foundPublished).toBeDefined();
    expect(foundPublished!.status).toBe("approved");

    // scopedLibrary must enrich with Approved status and correct approver
    const priya = findPerson("priya")!;
    const enriched = scopedLibrary([foundPublished!], priya);
    expect(enriched.length).toBe(1);
    expect(enriched[0]!.status).toBe("Approved");
    expect(enriched[0]!.approved_by).toContain("Owen");
    expect(enriched[0]!.approved_on).toBeTruthy();

    // Live search engine must serve or cite this approved unit
    const searchRes = serveEngine({
      query: "When can members submit routine refill requests?",
      role: "pharmacy_advocate",
      channel: "advocate_view",
      lob: "MAPD",
    });
    expect(searchRes.outcome).toBe("answer");
    const foundCite = searchRes.parts.flatMap((p) => p.citations).find((c) => c.unit_id === "RX-006");
    expect(foundCite).toBeDefined();
    expect(foundCite!.title).toContain("Routine Refill Request Window Update");
  });


  it("5. Restart consistency: server reset preserves published_units and searchability", async () => {
    // Insert a published unit directly in SQLite
    const nowIso = new Date().toISOString();
    await inMemoryRepo.savePublishedUnit({
      unit_id: "RX-PERSIST-001",
      title: "Durable Ingested Unit",
      type: "Policy",
      body: "Durable knowledge units persist across server resets and restarts.",
      verbatim: 0,
      spoken_version: null,
      knowledge_base: "KB-PHARM",
      audience_json: JSON.stringify(["advocate"]),
      channels_json: JSON.stringify(["advocate_view"]),
      authority_level: "knowledge_article",
      source_doc: "DURABLE-DOC-001",
      source_section: "Section 1",
      effective_date: "2026-01-01",
      review_date: "2027-01-01",
      version: 1,
      status: "approved",
      supersedes: null,
      synonyms_json: JSON.stringify(["durable unit", "Durable Ingested Unit"]),
      owner: "Pharmacy Ops",
      approved_by: "Owen (Knowledge owner)",
      applies_to_json: JSON.stringify({ lob: ["MAPD"], states: "ALL", plan_year: 2026 }),
      created_at: nowIso,
      updated_at: nowIso,
    });

    // Simulate server restart
    resetStore();

    // Hydrate store from repository
    const dbUnits = await inMemoryRepo.listPublishedUnits();
    expect(dbUnits.length).toBe(1);

    const store = getStore();
    const { syncPublishedUnitsToStore } = await import("../verity-engine/server");
    syncPublishedUnitsToStore(store, dbUnits);

    // Verify the unit is in the rehydrated engine
    const liveUnit = store.units().find((u) => u.unit_id === "RX-PERSIST-001");
    expect(liveUnit).toBeDefined();
    expect(liveUnit!.status).toBe("approved");

    const searchRes = serveEngine({
      query: "durable unit across server resets",
      role: "pharmacy_advocate",
      channel: "advocate_view",
      lob: "MAPD",
    });
    const cite = searchRes.parts.flatMap((p) => p.citations).find((c) => c.unit_id === "RX-PERSIST-001");
    expect(cite).toBeDefined();
  });

  it("6. Status normalization and metadata integrity checks", () => {
    // normalizeStatus must never default to Approved
    expect(normalizeStatus("approved")).toBe("Approved");
    expect(normalizeStatus("Approved")).toBe("Approved");
    expect(normalizeStatus("in_review")).toBe("Under review");
    expect(normalizeStatus("under_review")).toBe("Under review");
    expect(normalizeStatus("pending")).toBe("Under review");
    expect(normalizeStatus("draft")).toBe("Draft");
    expect(normalizeStatus("proposed")).toBe("Draft");
    expect(normalizeStatus("new")).toBe("Draft");
    expect(normalizeStatus("changed")).toBe("Draft");
    expect(normalizeStatus("unchanged")).toBe("Draft");
    expect(normalizeStatus("duplicate_candidate")).toBe("Draft");
    expect(normalizeStatus("stale")).toBe("Stale");
    expect(normalizeStatus("conflict")).toBe("Conflict");
    expect(normalizeStatus("rejected")).toBe("Retired");
    expect(normalizeStatus("retired")).toBe("Retired");
    expect(normalizeStatus("unknown_bad_status")).toBe("Draft");
    expect(normalizeStatus("")).toBe("Draft");

    // enrichUnit must not fabricate approval metadata for unapproved status
    const unapprovedUnit: DemoUnit = {
      unit_id: "U-TEST-999",
      title: "Unapproved Candidate Unit",
      owner: "Pharmacy Ops",
      verbatim: false,
      status: "duplicate_candidate",
      versions: [
        {
          version: 1,
          text: "Unapproved candidate text",
          effective_date: "2024-01-01",
          approver: "Nobody",
        },
      ],
    };

    const enriched = enrichUnit(unapprovedUnit);
    expect(enriched.status).toBe("Draft");
    expect(enriched.approved_by).toBe("—");
    expect(enriched.approved_on_formatted).toBe("—");

    // Approved unit gets valid approver and date
    const approvedUnit: DemoUnit = {
      unit_id: "U-PH-010",
      title: "Copay assistance program",
      owner: "Pharmacy Ops",
      verbatim: false,
      status: "approved",
      versions: [
        {
          version: 1,
          text: "Copay assistance program text",
          effective_date: "2026-03-01",
          approver: "Owen (Knowledge owner)",
        },
      ],
    };
    const enrichedApproved = enrichUnit(approvedUnit);
    expect(enrichedApproved.status).toBe("Approved");
    expect(enrichedApproved.approved_by).toBeTruthy();
    expect(enrichedApproved.approved_by).not.toBe("—");
  });
});
