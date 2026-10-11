import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDatabaseClient, closeDatabaseClient } from "../storage/db";
import { runMigrations } from "../storage/migrations";
import { StorageRepository } from "../storage/repository";
import { computeSha256 } from "../services/ingestion/hasher";
import { parseDocument } from "../services/ingestion/parser";
import { handleUploadAndIngest, handleProposeDrafts } from "../services/ingest.server";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

describe("Phase 3A: Storage Foundation & Real Document Ingestion", () => {
  describe("1. Database Schema, Migrations, and Typed Repository", () => {
    let db: ReturnType<typeof createDatabaseClient>;
    let repo: StorageRepository;

    beforeEach(async () => {
      // In-memory SQLite connection for isolated tests
      db = createDatabaseClient(":memory:");
      await runMigrations(db);
      repo = new StorageRepository(db);
    });

    afterEach(async () => {
      await closeDatabaseClient(db);
    });

    it("runs migrations idempotently without errors", async () => {
      // Running migrations a second time should succeed cleanly
      await expect(runMigrations(db)).resolves.not.toThrow();
    });

    it("persists and retrieves source documents and binary files", async () => {
      const doc = await repo.createSourceDocument({
        id: "SRC-TEST-001",
        title: "Test Ingestion Doc",
        file_type: "md",
        content_hash: "hash123abc456",
        file_size: 1024,
        raw_text: "# Heading\nSample body text",
        owner_team: "Pharmacy Ops",
        lob: "MAPD",
        plan_year: "2026",
        state_code: "All",
        source_type: "Policy",
        description: "Test description",
        created_by: "Dana - Knowledge author",
        created_at: new Date().toISOString(),
      });

      expect(doc.id).toBe("SRC-TEST-001");
      expect(doc.title).toBe("Test Ingestion Doc");
      expect(doc.content_hash).toBe("hash123abc456");

      // Verify file binary storage
      const fileBytes = Buffer.from("# Heading\nSample body text", "utf-8");
      await repo.saveSourceFile({
        id: "FILE-SRC-TEST-001",
        source_doc_id: doc.id,
        file_name: "test-doc.md",
        mime_type: "text/markdown",
        data_base64: fileBytes.toString("base64"),
        created_at: new Date().toISOString(),
      });

      const retrievedFile = await repo.getSourceFileByDocId(doc.id);
      expect(retrievedFile).toBeDefined();
      expect(retrievedFile?.source_doc_id).toBe(doc.id);
      expect(Buffer.from(retrievedFile!.data_base64, "base64").toString("utf-8")).toBe(
        "# Heading\nSample body text"
      );
    });

    it("records ingestion jobs and manages job state transitions", async () => {
      const doc = await repo.createSourceDocument({
        id: "SRC-JOB-001",
        title: "Job Test Doc",
        file_type: "txt",
        content_hash: "hashjob789",
        file_size: 50,
        raw_text: "Job content",
        owner_team: "Pharmacy Ops",
        lob: "MAPD",
        plan_year: "2026",
        state_code: "All",
        source_type: "Policy",
        description: null,
        created_by: "Dana",
        created_at: new Date().toISOString(),
      });

      const job = await repo.createIngestionJob({
        id: "JOB-TEST-001",
        source_doc_id: doc.id,
        status: "pending",
        extractor: "rules-v0",
        candidate_count: 0,
        skipped_count: 0,
        error_message: null,
        notes_json: "[]",
        created_at: new Date().toISOString(),
        completed_at: null,
      });

      expect(job.id).toBe("JOB-TEST-001");
      expect(job.status).toBe("pending");

      await repo.updateIngestionJob(job.id, {
        status: "completed",
        candidate_count: 3,
        completed_at: new Date().toISOString(),
      });

      const updated = await repo.getIngestionJobById(job.id);
      expect(updated?.status).toBe("completed");
      expect(updated?.candidate_count).toBe(3);
    });

    it("persists extracted candidate units and links them to source document", async () => {
      const doc = await repo.createSourceDocument({
        id: "SRC-CAND-001",
        title: "Candidate Doc",
        file_type: "txt",
        content_hash: "hashcand111",
        file_size: 100,
        raw_text: "Candidate content",
        owner_team: "Pharmacy Ops",
        lob: "MAPD",
        plan_year: "2026",
        state_code: "All",
        source_type: "Policy",
        description: null,
        created_by: "Dana",
        created_at: new Date().toISOString(),
      });

      const candidates = await repo.saveCandidateUnits([
        {
          id: "CAND-001",
          cid: "BEN-008",
          job_id: "JOB-TEST-001",
          source_doc_id: doc.id,
          title: "Benefits Handling of Mail-Order Rejections",
          candidate_type: "Policy",
          body: "Prescriptions rejected at mail-order pharmacy must follow the standard retry protocol.",
          verbatim: 0,
          knowledge_base: "KB-PHARM",
          owner_team: "Pharmacy Ops",
          source_reference: "Candidate Doc • Section 1.1",
          source_section: "Section 1.1",
          source_page: 1,
          effective_date: "2026-01-01",
          match_status: "new",
          matched_unit_id: null,
          similarity: 0,
          diff_json: null,
          route_to: "owner",
          key_points_json: JSON.stringify(["Retry protocol applies to mail-order", "Valid for 2026"]),
          selected: 1,
          created_at: new Date().toISOString(),
        },
      ]);

      expect(candidates).toHaveLength(1);
      expect(candidates[0]!.id).toBe("CAND-001");

      const retrieved = await repo.getCandidatesByDocId(doc.id);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0]!.title).toBe("Benefits Handling of Mail-Order Rejections");
      expect(retrieved[0]!.match_status).toBe("new");
    });

    it("creates drafts from candidate units with stable DRAFT- IDs and pending status", async () => {
      const doc = await repo.createSourceDocument({
        id: "SRC-DRAFT-001",
        title: "Draft Doc",
        file_type: "txt",
        content_hash: "hashdraft222",
        file_size: 80,
        raw_text: "Draft content",
        owner_team: "Pharmacy Ops",
        lob: "MAPD",
        plan_year: "2026",
        state_code: "All",
        source_type: "Procedure",
        description: null,
        created_by: "Dana",
        created_at: new Date().toISOString(),
      });

      const [candidate] = await repo.saveCandidateUnits([
        {
          id: "CAND-002",
          cid: "BEN-009",
          job_id: "JOB-DRAFT-001",
          source_doc_id: doc.id,
          title: "Prior Authorization Appeals Protocol",
          candidate_type: "Procedure",
          body: "Appeals must be submitted within 60 calendar days of initial denial notification.",
          verbatim: 0,
          knowledge_base: "KB-PHARM",
          owner_team: "Pharmacy Ops",
          source_reference: "Draft Doc • Page 1",
          source_section: "Appeals",
          source_page: 1,
          effective_date: "2026-01-01",
          match_status: "new",
          matched_unit_id: null,
          similarity: 0,
          diff_json: null,
          route_to: "owner",
          key_points_json: JSON.stringify(["60-day filing window"]),
          selected: 1,
          created_at: new Date().toISOString(),
        },
      ]);

      const drafts = await repo.createDrafts([
        {
          draft_id: "DRAFT-2026-001",
          candidate_id: candidate!.id,
          source_doc_id: doc.id,
          unit_id: "BEN-009",
          title: candidate!.title,
          proposed_text: candidate!.body,
          current_text: null,
          candidate_type: candidate!.candidate_type,
          verbatim: candidate!.verbatim,
          route_to: candidate!.route_to,
          owner_team: candidate!.owner_team,
          knowledge_base: candidate!.knowledge_base,
          effective_date: candidate!.effective_date,
          tags_json: JSON.stringify(["procedure"]),
          proposed_by: "Dana - Knowledge author",
          status: "proposed",
          reason: null,
          decided_by: null,
          gate_json: JSON.stringify({ checked: 27, blocking: [] }),
          history_json: "[]",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      expect(drafts).toHaveLength(1);
      const draft = drafts[0]!;
      expect(draft.draft_id).toBe("DRAFT-2026-001");
      expect(draft.status).toBe("proposed");
      expect(draft.proposed_by).toBe("Dana - Knowledge author");
      expect(draft.source_doc_id).toBe(doc.id);
      expect(draft.candidate_id).toBe(candidate!.id);
      expect(draft.title).toBe("Prior Authorization Appeals Protocol");
    });
  });

  describe("2. Document Parsers & Hasher", () => {
    it("computes deterministic SHA-256 hash across identical inputs", () => {
      const text = "Verity Governed Knowledge Document";
      const hash1 = computeSha256(text);
      const hash2 = computeSha256(Buffer.from(text, "utf-8"));
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);

      const alteredHash = computeSha256(text + " edited");
      expect(alteredHash).not.toBe(hash1);
    });

    it("parses plain text documents and structures sections", async () => {
      const content = `SECTION 1: OVERVIEW\nThis is paragraph one.\n\nSECTION 2: DETAILS\nThis is paragraph two.`;
      const result = await parseDocument({
        buffer: Buffer.from(content, "utf-8"),
        filename: "policy.txt",
        mimeType: "text/plain",
      });

      expect(result.rawText).toContain("SECTION 1: OVERVIEW");
      expect(result.totalPages).toBe(1);
      expect(result.detectedFormat).toBe("txt");
    });

    it("parses Markdown documents and extracts structured text", async () => {
      const mdContent = `# Medicare Formulary Guidelines\n\n## Section 1: Tier 1 Generic\nTier 1 drugs have a $0 copay.\n\n## Section 2: Tier 2 Preferred\nTier 2 drugs require standard copay.`;
      const result = await parseDocument({
        buffer: Buffer.from(mdContent, "utf-8"),
        filename: "guidelines.md",
        mimeType: "text/markdown",
      });

      expect(result.rawText).toContain("Medicare Formulary Guidelines");
      expect(result.detectedFormat).toBe("md");
      expect(result.totalPages).toBe(1);
    });

    it("rejects empty documents with a descriptive validation error", async () => {
      await expect(
        parseDocument({
          buffer: Buffer.from("   \n\t  ", "utf-8"),
          filename: "empty.txt",
          mimeType: "text/plain",
        })
      ).rejects.toThrow(/contains no readable content/);
    });

    it("rejects 0-byte files with an empty document error", async () => {
      await expect(
        parseDocument({
          buffer: Buffer.alloc(0),
          filename: "zero.txt",
          mimeType: "text/plain",
        })
      ).rejects.toThrow(/Document "zero.txt" is empty/);
    });

    it("rejects files that exceed the 15MB size limit", async () => {
      const largeBuffer = Buffer.alloc(16 * 1024 * 1024); // 16MB
      await expect(
        parseDocument({
          buffer: largeBuffer,
          filename: "large.txt",
          mimeType: "text/plain",
        })
      ).rejects.toThrow(/File size exceeds maximum allowed limit/);
    });

    it("rejects unsupported document formats", async () => {
      await expect(
        parseDocument({
          buffer: Buffer.from("binary video stream", "utf-8"),
          filename: "video.mp4",
          mimeType: "video/mp4",
        })
      ).rejects.toThrow(/Unsupported document format/);
    });
  });

  describe("3. Ingestion Server Functions & Candidate Extraction", () => {
    let db: ReturnType<typeof createDatabaseClient>;
    let repo: StorageRepository;

    beforeEach(async () => {
      db = createDatabaseClient(":memory:");
      await runMigrations(db);
      repo = new StorageRepository(db);
    });

    afterEach(async () => {
      await closeDatabaseClient(db);
    });

    it("extracts candidates from actual uploaded content and compares with Verity store", async () => {
      const documentText = `
Benefits Handling of Mail-Order Rejections.
Prescriptions rejected at mail-order pharmacy must follow the standard retry protocol.
If a member prescription fails fulfillment at the mail-order facility, an automated alert is triggered within 2 hours.
The care team must contact the prescribing physician if no alternative NDC is on file.
`;

      const result = await handleUploadAndIngest(
        {
          filename: "mail-order-rejections.txt",
          mime_type: "text/plain",
          content_text: documentText,
          source_title: "Benefits Handling of Mail-Order Rejections",
          scope: "DEMO-RX-2026",
          uploaded_by: "Dana - Knowledge author",
          sessionToken: "vty_sess_demo_dana",
        },
        repo
      );

      expect(result.ok).toBe(true);
      expect(result.doc_id).toMatch(/^SRC-/);
      expect(result.file_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.extracted_text).toContain("Benefits Handling of Mail-Order Rejections");
      expect(result.duplicate_of).toBeNull();
      expect(result.units?.length).toBeGreaterThan(0);

      const firstUnit = result.units![0]!;
      expect(firstUnit.title).toBeDefined();
      expect(firstUnit.content).toBeDefined();
      expect(firstUnit.source_reference).toContain("Benefits Handling of Mail-Order Rejections");
      // Check that match_status is populated (new, changed, or unchanged)
      expect(["new", "changed", "unchanged"]).toContain(firstUnit.match_status);

      // Verify candidates are persisted in repository
      const persistedCandidates = await repo.getCandidatesByDocId(result.doc_id!);
      expect(persistedCandidates.length).toBe(result.units!.length);
    });

    it("detects duplicate sources when identical content is uploaded twice", async () => {
      const documentText = `Standard Copay Policy 2026. Tier 1 medications carry zero copay for all Medicare Advantage enrollees.`;

      const firstUpload = await handleUploadAndIngest(
        {
          filename: "copay-policy-v1.txt",
          mime_type: "text/plain",
          content_text: documentText,
          source_title: "Copay Policy v1",
          scope: "DEMO-RX-2026",
          uploaded_by: "Dana - Knowledge author",
          sessionToken: "vty_sess_demo_dana",
        },
        repo
      );

      expect(firstUpload.ok).toBe(true);
      expect(firstUpload.duplicate_of).toBeNull();

      // Second upload with identical bytes
      const secondUpload = await handleUploadAndIngest(
        {
          filename: "copay-policy-duplicate.txt",
          mime_type: "text/plain",
          content_text: documentText,
          source_title: "Copay Policy Duplicate",
          scope: "DEMO-RX-2026",
          uploaded_by: "Dana - Knowledge author",
          sessionToken: "vty_sess_demo_dana",
        },
        repo
      );

      expect(secondUpload.ok).toBe(true);
      expect(secondUpload.isDuplicate).toBe(true);
      expect(secondUpload.duplicate_of).toBe(firstUpload.doc_id);
      expect(secondUpload.file_hash).toBe(firstUpload.file_hash);
    });

    it("connects proposed draft submission to real persisted draft records", async () => {
      const sampleText = `Specialty Pharmacy Enrollment Guidelines\n\nEnrollees needing specialty drugs must register with the dedicated Care Coordination team.\nAll specialty medication approvals require a prior clinical assessment.`;

      const ingestResult = await handleUploadAndIngest(
        {
          filename: "specialty-care.txt",
          mime_type: "text/plain",
          content_text: sampleText,
          source_title: "Specialty Pharmacy Enrollment Guidelines",
          scope: "DEMO-RX-2026",
          uploaded_by: "Dana - Knowledge author",
          sessionToken: "vty_sess_demo_dana",
        },
        repo
      );

      const candidateIds = ingestResult.units!.map((u) => u.id);
      expect(candidateIds.length).toBeGreaterThan(0);

      const proposeResult = await handleProposeDrafts(
        {
          sourceDocId: ingestResult.doc_id!,
          candidateIds: [candidateIds[0]!],
          proposerName: "Dana - Knowledge author",
          proposerRole: "author",
          sessionToken: "vty_sess_demo_dana",
        },
        repo
      );

      expect(proposeResult.ok).toBe(true);
      expect(proposeResult.success).toBe(true);
      expect(proposeResult.draft_ids?.length).toBe(1);
      expect(proposeResult.draft_ids![0]).toMatch(/^DRAFT-/);

      // Verify draft in repository
      const allDrafts = await repo.listDrafts();
      expect(allDrafts.length).toBeGreaterThanOrEqual(1);
      const match = allDrafts.find((d) => d.draft_id === proposeResult.draft_ids![0]);
      expect(match).toBeDefined();
      expect(match?.status).toBe("proposed");
      expect(match?.proposed_by).toMatch(/Dana/);
    });
  });

  describe("4. Persistence across Server Restart / Database Reconnection", () => {
    it("preserves records across database reconnection to disk file", async () => {
      const tempDbPath = path.join(os.tmpdir(), `verity-test-${Date.now()}.db`);

      try {
        // Step 1: Open connection, migrate, insert records
        const db1 = createDatabaseClient(tempDbPath);
        await runMigrations(db1);
        const repo1 = new StorageRepository(db1);

        const doc = await repo1.createSourceDocument({
          id: "SRC-PERSIST-001",
          title: "Persistent Doc Across Restarts",
          file_type: "txt",
          content_hash: "hash_restart_123",
          file_size: 256,
          raw_text: "Durable candidate content",
          owner_team: "Pharmacy Ops",
          lob: "MAPD",
          plan_year: "2026",
          state_code: "All",
          source_type: "Policy",
          description: null,
          created_by: "Dana",
          created_at: new Date().toISOString(),
        });

        const job = await repo1.createIngestionJob({
          id: "JOB-PERSIST-001",
          source_doc_id: doc.id,
          status: "completed",
          extractor: "rules-v0",
          candidate_count: 1,
          skipped_count: 0,
          error_message: null,
          notes_json: "[]",
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });

        await repo1.saveCandidateUnits([
          {
            id: "CAND-RESTART-001",
            cid: "BEN-RESTART-001",
            job_id: job.id,
            source_doc_id: doc.id,
            title: "Durable Knowledge Candidate",
            candidate_type: "Policy",
            body: "This candidate persists even if server process restarts.",
            verbatim: 0,
            knowledge_base: "KB-PHARM",
            owner_team: "Pharmacy Ops",
            source_reference: "persistent.txt • Section 1",
            source_section: "Section 1",
            source_page: 1,
            effective_date: "2026-01-01",
            match_status: "new",
            matched_unit_id: null,
            similarity: 0,
            diff_json: null,
            route_to: "owner",
            key_points_json: JSON.stringify(["Durable persistence"]),
            selected: 1,
            created_at: new Date().toISOString(),
          },
        ]);

        // Close first connection (simulating server shutdown)
        await closeDatabaseClient(db1);

        // Step 2: Open a fresh connection to the same file (simulating server restart)
        const db2 = createDatabaseClient(tempDbPath);
        await runMigrations(db2);
        const repo2 = new StorageRepository(db2);

        // Verify doc, job, and candidates exist
        const loadedDoc = await repo2.getSourceDocumentById(doc.id);
        expect(loadedDoc).toBeDefined();
        expect(loadedDoc?.title).toBe("Persistent Doc Across Restarts");

        const loadedCandidates = await repo2.getCandidatesByDocId(doc.id);
        expect(loadedCandidates).toHaveLength(1);
        expect(loadedCandidates[0]!.title).toBe("Durable Knowledge Candidate");

        await closeDatabaseClient(db2);
      } finally {
        // Cleanup test database file
        try {
          if (fs.existsSync(tempDbPath)) {
            fs.unlinkSync(tempDbPath);
          }
        } catch {
          // Ignore temp cleanup errors
        }
      }
    });
  });
});
