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
  handleListMyDrafts,
  handleDecideReviewItem,
  seedInitialDraftsIfEmpty,
} from "../services/review.server";
import { homeRoute, canOpen, findPerson, navFor, PEOPLE } from "../lib/rights";
import { getStore } from "../verity-engine/server";

describe("Verity Phase 3B: Connected Draft Review & Workflow Verification", () => {
  let inMemoryRepo: StorageRepository;
  let testDb: ReturnType<typeof createDatabaseClient>;

  beforeEach(async () => {
    // Unique in-memory LibSQL/SQLite database for each test
    testDb = createDatabaseClient(":memory:");
    await runMigrations(testDb);
    inMemoryRepo = new StorageRepository(testDb);
  });

  afterEach(async () => {
    await closeDatabaseClient(testDb);
  });

  it("1. Persisted submitted draft from ingestion appears in the reviewer queue", async () => {
    // Dana ingests a real policy document
    const ingestRes = await handleUploadAndIngest(
      {
        fileName: "Benefits_Mail_Order_Rejections.txt",
        content_text: `Doc ID: KB-PHARM-008\nTitle: Benefits Handling of Mail-Order Rejections\nOwner: Benefits Education\n\nSection 1:\nWhen mail-order pharmacy claims are rejected, advocates must verify eligibility and plan year.`,
        sessionToken: "vty_sess_demo_dana",
        actor: "Dana (Knowledge author)",
        ownerTeam: "Benefits Education",
        lob: "MAPD",
      },
      inMemoryRepo
    );

    expect(ingestRes.ok).toBe(true);
    const candidate = ingestRes.candidates![0]!;

    // Dana proposes the candidate draft
    const proposeRes = await handleProposeDrafts(
      {
        sourceDocId: ingestRes.doc_id!,
        candidateIds: [candidate.id],
        sessionToken: "vty_sess_demo_dana",
        proposerName: "Dana (Knowledge author)",
        proposerRole: "knowledge_author",
      },
      inMemoryRepo
    );

    expect(proposeRes.ok).toBe(true);
    const proposedDraftId = proposeRes.draft_ids![0]!;

    // Reviewer queue loads from shared persistent repository
    const reviewQueue = await handleListReviewQueue(inMemoryRepo);
    const queuedItem = reviewQueue.find((it) => it.id === proposedDraftId);

    expect(queuedItem).toBeDefined();
    expect(queuedItem?.title).toBe(candidate.title);
    expect(queuedItem?.status).toBe("Pending review");
    expect(queuedItem?.content).toBe(candidate.body);
  });

  it("2. Enforces maker-checker rules: author cannot approve their own draft", async () => {
    // Seed and create draft proposed by Dana
    await seedInitialDraftsIfEmpty(inMemoryRepo);
    const [draft] = await inMemoryRepo.createDrafts([
      {
        draft_id: "DRAFT-TEST-MC-1",
        candidate_id: null,
        source_doc_id: "DOC-1",
        unit_id: "U-BEN-008",
        title: "Mail Order Rejections Handling",
        proposed_text: "Advocates must verify rejection reason codes before resubmission.",
        current_text: null,
        candidate_type: "Policy",
        verbatim: 0,
        route_to: "owner",
        owner_team: "Benefits Education",
        knowledge_base: "KB-PHARM",
        effective_date: "2026-01-01",
        tags_json: "[]",
        proposed_by: "Dana (Knowledge author)",
        status: "proposed",
        reason: null,
        decided_by: null,
        gate_json: null,
        history_json: "[]",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    // Dana attempts to self-approve
    const selfApproveRes = await handleDecideReviewItem(
      {
        draftId: draft!.draft_id,
        action: "approve",
        sessionToken: "vty_sess_demo_dana",
        reviewerName: "Dana",
        reviewerLabel: "Knowledge author",
        reviewerRole: "knowledge_author",
        reviewerCapabilities: ["approve_standard"], // Even if granted or attempted
        notes: "Self approval attempt",
      },
      inMemoryRepo
    );

    expect(selfApproveRes.ok).toBe(false);
    expect(selfApproveRes.error).toMatch(/Maker-checker violation.*cannot approve.*own proposed draft/i);

    // Verify draft remains in proposed state
    const postDraft = await inMemoryRepo.getDraftById(draft!.draft_id);
    expect(postDraft?.status).toBe("proposed");
  });

  it("3. Unauthorized personas without approval capability are rejected server-side", async () => {
    await seedInitialDraftsIfEmpty(inMemoryRepo);
    const [draft] = await inMemoryRepo.createDrafts([
      {
        draft_id: "DRAFT-UNAUTH-1",
        candidate_id: null,
        source_doc_id: "DOC-2",
        unit_id: "U-TEST-002",
        title: "Standard Test Policy",
        proposed_text: "Standard policy body.",
        current_text: null,
        candidate_type: "Policy",
        verbatim: 0,
        route_to: "owner",
        owner_team: "Pharmacy Ops",
        knowledge_base: "KB-PHARM",
        effective_date: "2026-01-01",
        tags_json: "[]",
        proposed_by: "Ian (Knowledge author)",
        status: "proposed",
        reason: null,
        decided_by: null,
        gate_json: null,
        history_json: "[]",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    // Priya (advocate with no approve capabilities) attempts to approve
    const priyaApprove = await handleDecideReviewItem(
      {
        draftId: draft!.draft_id,
        action: "approve",
        sessionToken: "vty_sess_demo_priya",
        reviewerName: "Priya",
        reviewerRole: "pharmacy_advocate",
        reviewerCapabilities: ["search", "get_unit"],
      },
      inMemoryRepo
    );

    expect(priyaApprove.ok).toBe(false);
    expect(priyaApprove.error).toMatch(/Unauthorized.*lacks authorization to approve/i);
  });

  it("4. Independent reviewer approval applies regression gate and publishes to knowledge store", async () => {
    await seedInitialDraftsIfEmpty(inMemoryRepo);
    const [draft] = await inMemoryRepo.createDrafts([
      {
        draft_id: "DRAFT-APPROVE-1",
        candidate_id: null,
        source_doc_id: "DOC-PUB-1",
        unit_id: "U-PUB-001",
        title: "Mail Order Rejections Resolution",
        proposed_text: "Verify mail-order rejection code before escalation.",
        current_text: null,
        candidate_type: "Policy",
        verbatim: 0,
        route_to: "owner",
        owner_team: "Pharmacy Ops",
        knowledge_base: "KB-PHARM",
        effective_date: "2026-01-01",
        tags_json: "[]",
        proposed_by: "Dana (Knowledge author)",
        status: "proposed",
        reason: null,
        decided_by: null,
        gate_json: null,
        history_json: "[]",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    // Owen (Knowledge owner) approves Dana's draft
    const approveRes = await handleDecideReviewItem(
      {
        draftId: draft!.draft_id,
        action: "approve",
        sessionToken: "vty_sess_demo_owen",
        reviewerName: "Owen",
        reviewerLabel: "Knowledge owner",
        reviewerRole: "knowledge_owner",
        reviewerCapabilities: ["approve_standard", "view_review_queue"],
        notes: "Approved after verifying alignment with 2026 guidelines.",
      },
      inMemoryRepo
    );

    expect(approveRes.ok).toBe(true);
    expect(approveRes.message).toMatch(/Successfully approved/i);

    // Verify draft status updated in persistent repository
    const updatedDraft = await inMemoryRepo.getDraftById(draft!.draft_id);
    expect(updatedDraft?.status).toBe("approved");
    expect(updatedDraft?.decided_by).toMatch(/Owen/);

    // Verify live knowledge store has published unit
    const liveStore = getStore();
    const publishedUnit = liveStore.units().find((u) => u.unit_id === "U-PUB-001");
    expect(publishedUnit).toBeDefined();
    expect(publishedUnit?.title).toBe("Mail Order Rejections Resolution");
    expect(publishedUnit?.status).toBe("approved");
  });

  it("5. Rejection requires note and request-changes routes back with history", async () => {
    await seedInitialDraftsIfEmpty(inMemoryRepo);
    const [draft] = await inMemoryRepo.createDrafts([
      {
        draft_id: "DRAFT-TRANS-1",
        candidate_id: null,
        source_doc_id: "DOC-TRANS-1",
        unit_id: "U-TRANS-001",
        title: "Experimental Policy Proposal",
        proposed_text: "Draft content.",
        current_text: null,
        candidate_type: "Policy",
        verbatim: 0,
        route_to: "owner",
        owner_team: "Pharmacy Ops",
        knowledge_base: "KB-PHARM",
        effective_date: "2026-01-01",
        tags_json: "[]",
        proposed_by: "Dana (Knowledge author)",
        status: "proposed",
        reason: null,
        decided_by: null,
        gate_json: null,
        history_json: "[]",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    // Rejection without reason fails
    const failReject = await handleDecideReviewItem(
      {
        draftId: draft!.draft_id,
        action: "reject",
        sessionToken: "vty_sess_demo_owen",
        reviewerName: "Owen",
        reviewerRole: "knowledge_owner",
        reviewerCapabilities: ["approve_standard"],
        notes: "",
      },
      inMemoryRepo
    );
    expect(failReject.ok).toBe(false);
    expect(failReject.error).toMatch(/rejection reason or note is required/i);

    // Request changes with notes succeeds
    const changeRes = await handleDecideReviewItem(
      {
        draftId: draft!.draft_id,
        action: "request_changes",
        sessionToken: "vty_sess_demo_owen",
        reviewerName: "Owen",
        reviewerLabel: "Knowledge owner",
        reviewerRole: "knowledge_owner",
        reviewerCapabilities: ["approve_standard"],
        notes: "Needs updated tier reference.",
      },
      inMemoryRepo
    );
    expect(changeRes.ok).toBe(true);

    const changedDraft = await inMemoryRepo.getDraftById(draft!.draft_id);
    expect(changedDraft?.status).toBe("requested_changes");
    expect(changedDraft?.reason).toBe("Needs updated tier reference.");

    // Decision history is retained
    const history = JSON.parse(changedDraft?.history_json || "[]");
    expect(history.length).toBeGreaterThan(0);
    expect(history[history.length - 1]!.action).toBe("Requested changes");
    expect(history[history.length - 1]!.note).toBe("Needs updated tier reference.");
  });

  it("6. Draft visibility across role sessions using the same persistent database", async () => {
    // Dana ingests and proposes a draft
    const ingestRes = await handleUploadAndIngest(
      {
        fileName: "Multi_Session_Policy.txt",
        content_text: `Doc ID: KB-PHARM-999\nTitle: Cross Session Verification\nOwner: Pharmacy Ops\n\nSection 1:\nShared cross session content.`,
        sessionToken: "vty_sess_demo_dana",
        actor: "Dana (Knowledge author)",
      },
      inMemoryRepo
    );
    const candidate = ingestRes.candidates![0]!;
    await handleProposeDrafts(
      {
        sourceDocId: ingestRes.doc_id!,
        candidateIds: [candidate.id],
        sessionToken: "vty_sess_demo_dana",
        proposerName: "Dana (Knowledge author)",
      },
      inMemoryRepo
    );

    // Dana views My Drafts
    const danaDrafts = await handleListMyDrafts("Dana", inMemoryRepo, "vty_sess_demo_dana");
    expect(danaDrafts.length).toBe(1);
    expect(danaDrafts[0]!.title).toBe(candidate.title);

    // Owen loads review queue from same repo
    const owenQueue = await handleListReviewQueue(inMemoryRepo);
    const found = owenQueue.find((it) => it.title === candidate.title);
    expect(found).toBeDefined();
    expect(found?.status).toBe("Pending review");
  });

  it("7. Role-aware navigation: Casey lands on Knowledge library and has no Access Denied on homeRoute", () => {
    const casey = findPerson("casey")!;
    expect(casey).toBeDefined();

    // Casey is compliance_auditor
    expect(casey.persona).toBe("compliance_auditor");

    // Casey cannot open / (Ask) because search capability is absent
    expect(canOpen(casey, "/")).toBe(false);

    // Casey's homeRoute resolves to /library (Knowledge library)
    const home = homeRoute(casey);
    expect(home).toBe("/library");
    expect(canOpen(casey, home)).toBe(true);

    // Casey can also open audit, review queue, and evals
    expect(canOpen(casey, "/audit")).toBe(true);
    expect(canOpen(casey, "/review")).toBe(true);
    expect(canOpen(casey, "/evals")).toBe(true);

    // Rita lands on /legal
    const rita = findPerson("rita")!;
    expect(homeRoute(rita)).toBe("/legal");

    // Dana lands on /work
    const dana = findPerson("dana")!;
    expect(homeRoute(dana)).toBe("/work");

    // Priya lands on /
    const priya = findPerson("priya")!;
    expect(homeRoute(priya)).toBe("/");
  });
});
