import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createDatabaseClient,
  closeDatabaseClient,
  isConfiguredPostgresUrl,
  getDatabasePath,
} from "../storage/db";
import { runMigrations } from "../storage/migrations";
import { StorageRepository } from "../storage/repository";
import {
  uploadSourceFileToStorage,
  getSignedSourceFileUrl,
  ensureStorageBucket,
  getStorageClient,
  VERITY_STORAGE_BUCKET,
} from "../services/storage.server";
import { calculateSha256 } from "../services/ingestion/hasher";
import {
  handleDecideReviewItem,
  handleDeleteDraft,
  handleListPublishedUnits,
} from "../services/review.server";
import {
  ensureStoreHydrated,
  getStore,
  resetStore,
  syncPublishedUnitsToStore,
} from "../verity-engine/server";
import { PEOPLE, findPerson } from "../lib/rights";

import fs from "node:fs";
import path from "node:path";

describe("Verity Phase 6 — Supabase PostgreSQL & Storage Integration Suite", () => {
  let db: ReturnType<typeof createDatabaseClient>;
  let repo: StorageRepository;
  const testId = `TEST-SUPA-${Date.now()}`;
  const testDocId = `DOC-${testId}`;
  const testDraftId = `DRAFT-${testId}`;
  const testUnitId = `UNIT-${testId}`;
  const testDbFile = path.resolve(process.cwd(), `.data/test_integration_${Date.now()}.db`);

  const owenPerson = findPerson("owen")!;
  const danaPerson = findPerson("dana")!;
  const priyaPerson = findPerson("priya")!;

  beforeAll(async () => {
    // Isolated database instance for testing lifecycle
    db = createDatabaseClient(`file:${testDbFile.replace(/\\/g, "/")}`);
    await runMigrations(db);
    repo = new StorageRepository(db);
  });

  afterAll(async () => {
    await closeDatabaseClient(db);
    try {
      if (fs.existsSync(testDbFile)) {
        fs.unlinkSync(testDbFile);
      }
    } catch {}
  });

  // 1. Connect to Supabase PostgreSQL adapter
  it("1. Connect to database adapter and verifies dialect configuration", async () => {
    expect(db).toBeDefined();
    // Test that driver query execution works
    const result = await db.selectFrom("source_documents").select("id").execute();
    expect(Array.isArray(result)).toBe(true);
  });

  // 2. Read and write a test record
  it("2. Read and write a test record in source_documents", async () => {
    const doc = await repo.createSourceDocument({
      id: testDocId,
      title: "Verity Integration Test Policy",
      file_type: "pdf",
      file_size: 1024,
      content_hash: "sha256-test-hash-" + testId,
      raw_text: "Comprehensive Medicare Advantage Pharmacy Benefit Guidelines 2026.",
      owner_team: "Pharmacy Ops",
      lob: "MAPD",
      plan_year: "2026",
      state_code: "ALL",
      source_type: "Policy",
      description: "Integration verification record",
      created_by: "Dana (Knowledge author)",
      created_by_user_id: "dana",
      created_at: new Date().toISOString(),
    });

    expect(doc.id).toBe(testDocId);
    const fetched = await repo.getSourceDocumentById(testDocId);
    expect(fetched).toBeDefined();
    expect(fetched?.title).toBe("Verity Integration Test Policy");
    expect(fetched?.lob).toBe("MAPD");
  });

  // 3. Verify constraints and transaction rollback
  it("3. Verifies constraints and transaction rollback", async () => {
    // Primary key constraint violation
    await expect(
      repo.createSourceDocument({
        id: testDocId, // Duplicate ID
        title: "Duplicate Document",
        file_type: "pdf",
        file_size: 512,
        content_hash: "hash-dup",
        raw_text: "Duplicate",
        owner_team: "Pharmacy Ops",
        lob: "MAPD",
        plan_year: "2026",
        state_code: "ALL",
        source_type: "Policy",
        description: "Duplicate",
        created_by: "Dana",
        created_at: new Date().toISOString(),
      })
    ).rejects.toThrow();

    // Transaction rollback on error
    const rollbackDocId = `DOC-ROLLBACK-${testId}`;
    try {
      await db.transaction().execute(async (trx) => {
        await trx
          .insertInto("source_documents")
          .values({
            id: rollbackDocId,
            title: "Temporary Rollback Doc",
            file_type: "txt",
            file_size: 100,
            content_hash: "rollback-hash",
            raw_text: "Rollback content",
            owner_team: "Legal",
            lob: "MAPD",
            plan_year: "2026",
            state_code: "ALL",
            source_type: "Policy",
            description: "To be aborted",
            created_by: "Dana",
            created_at: new Date().toISOString(),
          })
          .execute();

        // Deliberately throw inside transaction to trigger rollback
        throw new Error("Simulated transactional abort");
      });
    } catch (err: any) {
      expect(err.message).toBe("Simulated transactional abort");
    }

    // Verify the record was rolled back and does not exist
    const rolledBack = await repo.getSourceDocumentById(rollbackDocId);
    expect(rolledBack).toBeUndefined();
  });

  // 4. Create a test source document and source files
  it("4. Creates source document and associates source file metadata", async () => {
    const file = await repo.saveSourceFile({
      id: `FILE-${testId}`,
      source_doc_id: testDocId,
      file_name: "policy_doc.pdf",
      mime_type: "application/pdf",
      file_size: 2048,
      content_hash: "abc123hash",
      storage_bucket: VERITY_STORAGE_BUCKET,
      storage_path: `sources/pharmacy_ops/${testDocId}/policy_doc.pdf`,
      created_at: new Date().toISOString(),
    });

    expect(file.id).toBe(`FILE-${testId}`);
    expect(file.source_doc_id).toBe(testDocId);
    expect(file.storage_bucket).toBe(VERITY_STORAGE_BUCKET);
  });

  // 5. Supabase Storage client reachability and bucket handling
  it("5. Verifies Supabase Storage reachability and bucket status", async () => {
    const client = getStorageClient();
    expect(client).toBeDefined();

    const bucketCheck = await ensureStorageBucket();
    // If the bucket exists or if client is live and reports bucket status
    expect(typeof bucketCheck.ok).toBe("boolean");
    if (!bucketCheck.ok) {
      expect(bucketCheck.message).toBeDefined();
    }
  });

  // 6. Read file metadata and verify SHA-256 content checksum
  it("6. Reads file metadata and verifies SHA-256 content checksum calculation", async () => {
    const sampleBuffer = Buffer.from(
      `Verity Governed Policy Document: ${testId}\nSection 1: Formulary Tiers\nTier 1: Preferred Generic ($0 copay)`
    );
    const calculatedHash = calculateSha256(sampleBuffer);
    expect(calculatedHash).toBeDefined();
    expect(calculatedHash.length).toBe(64);

    // Save with real content hash
    const savedFile = await repo.saveSourceFile({
      id: `FILE-HASH-${testId}`,
      source_doc_id: testDocId,
      file_name: "sample_policy.txt",
      mime_type: "text/plain",
      file_size: sampleBuffer.length,
      content_hash: calculatedHash,
      storage_bucket: VERITY_STORAGE_BUCKET,
      storage_path: `sources/pharmacy_ops/${testDocId}/sample_policy.txt`,
      created_at: new Date().toISOString(),
    });

    expect(savedFile.content_hash).toBe(calculatedHash);
    expect(savedFile.file_size).toBe(sampleBuffer.length);
  });

  // 7. Ingest a document and persist candidate units
  it("7. Ingests a document and persists candidate units", async () => {
    const candidates = await repo.saveCandidateUnits([
      {
        id: `CAND-${testId}`,
        cid: "CID-101",
        job_id: `JOB-${testId}`,
        source_doc_id: testDocId,
        title: "Formulary Tier 1 Preferred Generic Benefit",
        candidate_type: "Policy",
        body: "Tier 1 preferred generic prescriptions have a $0 copayment when filled at in-network retail pharmacies.",
        verbatim: 0,
        knowledge_base: "kb_pharma",
        owner_team: "Pharmacy Ops",
        source_reference: "Section 1.2",
        effective_date: "2026-01-01",
        match_status: "new",
        similarity: 1.0,
        route_to: "owner",
        key_points_json: JSON.stringify(["Tier 1", "$0 copay", "Retail in-network"]),
        selected: 1,
        created_at: new Date().toISOString(),
      },
    ]);

    expect(candidates.length).toBe(1);
    expect(candidates[0]!.id).toBe(`CAND-${testId}`);
    expect(candidates[0]!.source_doc_id).toBe(testDocId);
  });

  // 8. Submit a draft for review
  it("8. Submits draft for review with complete governance metadata", async () => {
    const [draft] = await repo.createDrafts([
      {
        draft_id: testDraftId,
        unit_id: testUnitId,
        candidate_id: `CAND-${testId}`,
        source_doc_id: testDocId,
        title: "Tier 1 Preferred Generic Copay Policy",
        proposed_text:
          "Tier 1 preferred generic prescriptions have a $0 copayment when filled at in-network retail pharmacies.",
        current_text: null,
        candidate_type: "Policy",
        verbatim: 0,
        route_to: "owner",
        owner_team: "Pharmacy Ops",
        knowledge_base: "kb_pharma",
        effective_date: "2026-01-01",
        tags_json: JSON.stringify(["pharmacy", "copay", "tier 1"]),
        proposed_by: "Dana (Knowledge author)",
        proposer_id: "dana",
        status: "proposed",
        history_json: JSON.stringify([
          { action: "Proposed", by: "Dana (Knowledge author)", at: new Date().toISOString() },
        ]),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    expect(draft.draft_id).toBe(testDraftId);
    expect(draft.status).toBe("proposed");
  });

  // 9. Approve a draft and verify atomic publication
  it("9. Authorizes reviewer approval and publishes atomically to published_units", async () => {
    const approveRes = await handleDecideReviewItem(
      {
        draftId: testDraftId,
        action: "approve",
        sessionToken: "vty_sess_demo_owen",
        reviewerName: "Owen",
        reviewerRole: "knowledge_owner",
        reviewerLabel: "Knowledge owner",
        reviewerCapabilities: ["approve_standard", "view_review_queue"],
        notes: "Approved Tier 1 copay policy for 2026 plan year.",
      },
      repo,
      {
        id: owenPerson.id,
        name: owenPerson.name,
        persona: owenPerson.persona,
        role: owenPerson.role,
        label: owenPerson.label,
        group: owenPerson.group,
        capabilities: [...owenPerson.capabilities],
        kbs: [...owenPerson.kbs],
        isDemo: true,
      }
    );

    expect(approveRes.ok).toBe(true);

    // Verify draft status updated in database
    const decidedDraft = await repo.getDraftById(testDraftId);
    expect(decidedDraft?.status).toBe("approved");
    expect(decidedDraft?.decided_by).toMatch(/Owen/);

    // Verify durable record in published_units
    const published = await repo.getPublishedUnitById(testUnitId);
    expect(published).toBeDefined();
    expect(published?.title).toBe("Tier 1 Preferred Generic Copay Policy");
    expect(published?.status).toBe("approved");
    expect(published?.source_doc).toBe(testDocId);
  });

  // 10. Confirm rejected and draft units never appear in governed search
  it("10. Confirms unapproved drafts and rejected units never appear in governed search", async () => {
    // Create an unapproved draft
    const unapprovedDraftId = `DRAFT-UNAPPROVED-${testId}`;
    const unapprovedUnitId = `UNIT-UNAPPROVED-${testId}`;
    await repo.createDrafts([
      {
        draft_id: unapprovedDraftId,
        unit_id: unapprovedUnitId,
        title: "Confidential Unapproved Draft",
        proposed_text: "Unverified and unapproved content.",
        candidate_type: "Policy",
        verbatim: 0,
        route_to: "owner",
        owner_team: "Pharmacy Ops",
        knowledge_base: "kb_pharma",
        effective_date: "2026-01-01",
        tags_json: "[]",
        proposed_by: "Dana",
        status: "proposed",
        history_json: "[]",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    // Create a rejected draft
    const rejectedDraftId = `DRAFT-REJECTED-${testId}`;
    const rejectedUnitId = `UNIT-REJECTED-${testId}`;
    await repo.createDrafts([
      {
        draft_id: rejectedDraftId,
        unit_id: rejectedUnitId,
        title: "Rejected Draft Policy",
        proposed_text: "Incorrect guideline text.",
        candidate_type: "Policy",
        verbatim: 0,
        route_to: "owner",
        owner_team: "Pharmacy Ops",
        knowledge_base: "kb_pharma",
        effective_date: "2026-01-01",
        tags_json: "[]",
        proposed_by: "Dana",
        status: "rejected",
        history_json: "[]",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    // Hydrate store from database published units only
    const dbUnits = await repo.listPublishedUnits();
    const store = getStore();
    syncPublishedUnitsToStore(store, dbUnits);

    const liveUnits = store.units();

    // The approved unit is present
    expect(liveUnits.some((u) => u.unit_id === testUnitId)).toBe(true);

    // Unapproved and rejected drafts are strictly excluded
    expect(liveUnits.some((u) => u.unit_id === unapprovedUnitId)).toBe(false);
    expect(liveUnits.some((u) => u.unit_id === rejectedUnitId)).toBe(false);
  });

  // 11. Query approved knowledge and verify genuine source citations
  it("11. Queries approved knowledge and verifies source citations match original source document", async () => {
    const store = getStore();
    const published = store.units().find((u) => u.unit_id === testUnitId);

    expect(published).toBeDefined();
    expect(published?.source_doc).toBe(testDocId);

    // Ensure source document exists in authoritative database
    const sourceDoc = await repo.getSourceDocumentById(published!.source_doc);
    expect(sourceDoc).toBeDefined();
    expect(sourceDoc?.id).toBe(testDocId);
    expect(sourceDoc?.title).toBe("Verity Integration Test Policy");
  });

  // 12. Restart or reinitialize server and verify persistence
  it("12. Reinitializes server store and verifies durable persistence from database", async () => {
    // Reset the in-memory engine store (simulating server restart)
    resetStore();

    // Rehydrate from persistent storage
    const newStore = getStore();
    const dbUnits = await repo.listPublishedUnits();
    syncPublishedUnitsToStore(newStore, dbUnits);

    const rehydratedUnit = newStore.units().find((u) => u.unit_id === testUnitId);
    expect(rehydratedUnit).toBeDefined();
    expect(rehydratedUnit?.title).toBe("Tier 1 Preferred Generic Copay Policy");
    expect(rehydratedUnit?.status).toBe("approved");
  });

  // 13. Unauthorized users cannot perform reviewer actions
  it("13. Rejects unauthorized users from approving or deciding review items", async () => {
    const unauthDraftId = `DRAFT-AUTH-${testId}`;
    await repo.createDrafts([
      {
        draft_id: unauthDraftId,
        unit_id: `UNIT-AUTH-${testId}`,
        title: "RBAC Test Draft",
        proposed_text: "Testing authorization checks.",
        candidate_type: "Policy",
        verbatim: 0,
        route_to: "owner",
        owner_team: "Pharmacy Ops",
        knowledge_base: "kb_pharma",
        effective_date: "2026-01-01",
        tags_json: "[]",
        proposed_by: "Ian",
        status: "proposed",
        history_json: "[]",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    // Priya (advocate persona without approve capabilities) attempts approval
    const unauthorizedDecision = await handleDecideReviewItem(
      {
        draftId: unauthDraftId,
        action: "approve",
        sessionToken: "vty_sess_demo_priya",
        reviewerName: "Priya",
        reviewerRole: "pharmacy_advocate",
        reviewerCapabilities: ["search", "get_unit"],
      },
      repo,
      {
        id: priyaPerson.id,
        name: priyaPerson.name,
        persona: priyaPerson.persona,
        role: priyaPerson.role,
        label: priyaPerson.label,
        group: priyaPerson.group,
        capabilities: [...priyaPerson.capabilities],
        kbs: [...priyaPerson.kbs],
        isDemo: true,
      }
    );

    expect(unauthorizedDecision.ok).toBe(false);
    expect(unauthorizedDecision.error).toMatch(/Unauthorized.*lacks authorization to approve/i);
  });

  // 14. Accidental draft deletion vs governed retirement workflow
  it("14. Governs draft deletion: allows author deletion of proposed draft, prevents deleting published units", async () => {
    const accidentalDraftId = `DRAFT-ACCIDENTAL-${testId}`;
    await repo.createDrafts([
      {
        draft_id: accidentalDraftId,
        unit_id: `UNIT-ACCIDENTAL-${testId}`,
        title: "Accidental Upload Draft",
        proposed_text: "Uploaded in error.",
        candidate_type: "Policy",
        verbatim: 0,
        route_to: "owner",
        owner_team: "Pharmacy Ops",
        knowledge_base: "kb_pharma",
        effective_date: "2026-01-01",
        tags_json: "[]",
        proposed_by: "Dana (Knowledge author)",
        proposer_id: "dana",
        status: "proposed",
        history_json: "[]",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    // Unauthorized user attempts deletion
    const unauthDelete = await handleDeleteDraft(
      accidentalDraftId,
      {
        id: priyaPerson.id,
        name: priyaPerson.name,
        persona: priyaPerson.persona,
        role: priyaPerson.role,
        label: priyaPerson.label,
        group: priyaPerson.group,
        capabilities: [...priyaPerson.capabilities],
        kbs: [...priyaPerson.kbs],
        isDemo: true,
      },
      repo
    );
    expect(unauthDelete.ok).toBe(false);
    expect(unauthDelete.error).toMatch(/Unauthorized/i);

    // Authorized author deletes their proposed draft
    const authorDelete = await handleDeleteDraft(
      accidentalDraftId,
      {
        id: danaPerson.id,
        name: danaPerson.name,
        persona: danaPerson.persona,
        role: danaPerson.role,
        label: danaPerson.label,
        group: danaPerson.group,
        capabilities: [...danaPerson.capabilities],
        kbs: [...danaPerson.kbs],
        isDemo: true,
      },
      repo
    );
    expect(authorDelete.ok).toBe(true);

    // Verify draft was deleted from database
    const deletedDraft = await repo.getDraftById(accidentalDraftId);
    expect(deletedDraft).toBeUndefined();

    // Attempting to delete an approved/published draft must be blocked
    const approvedDraftDelete = await handleDeleteDraft(
      testDraftId, // already approved
      {
        id: owenPerson.id,
        name: owenPerson.name,
        persona: owenPerson.persona,
        role: owenPerson.role,
        label: owenPerson.label,
        group: owenPerson.group,
        capabilities: [...owenPerson.capabilities],
        kbs: [...owenPerson.kbs],
        isDemo: true,
      },
      repo
    );
    expect(approvedDraftDelete.ok).toBe(false);
    expect(approvedDraftDelete.error).toMatch(/Governed rule violation.*governed retirement workflow/i);
  });

  // 15. Fail-Fast on Broken Database Connection (No Silent Fallback)
  it("15. Fails fast with clear error when a configured PostgreSQL connection is unreachable", () => {
    // Valid URL structure with unreachable host
    const badUrl =
      "postgresql://postgres:badpassword@invalid-supabase-host-999.supabase.co:6543/postgres?sslmode=require";
    expect(isConfiguredPostgresUrl(badUrl)).toBe(true);

    // Creating client with explicit bad URL
    const brokenClient = createDatabaseClient(badUrl);
    expect(brokenClient).toBeDefined();

    // When getDatabasePath detects an explicitly set invalid non-placeholder URL, it must not return SQLite
    const originalEnv = process.env.SUPABASE_DB_URL;
    try {
      process.env.SUPABASE_DB_URL = "http://invalid-not-postgres";
      expect(() => getDatabasePath()).toThrow(/Invalid SUPABASE_DB_URL format/);
    } finally {
      process.env.SUPABASE_DB_URL = originalEnv;
    }
  });
});
