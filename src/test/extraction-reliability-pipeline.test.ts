import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDatabaseClient, closeDatabaseClient } from "../storage/db";
import { runMigrations } from "../storage/migrations";
import { StorageRepository } from "../storage/repository";
import { extract } from "../verity-engine/extract";
import {
  handleUploadAndIngest,
  handleProposeDrafts,
  handleUpdateCandidateUnit,
  handleGetCandidatesByDocId,
} from "../services/ingest.server";
import {
  handleListReviewQueue,
  handleDecideReviewItem,
  seedInitialDraftsIfEmpty,
} from "../services/review.server";
import { getDemoState, resetDemoStore } from "../services/demoStore";
import { getStore, resetStore, serveEngine } from "../verity-engine/server";

// Document 1: Maintenance Medication Definition
const DOC_1_MAINTENANCE_MEDICATION = `# Maintenance Medication Definition
Doc ID: SRC-RX-2026-005 | Revision: 1 | Plan Scope: DEMO-RX-2026 | Owner: Pharmacy Operations | Effective: 01/01/2026 - 12/31/2026
Classification: Governed clinical definition | Allowed Role: pharmacy_advocate
Candidate ID: CAND-DUP-001
Duplicate Review: CAND-DUP-001

A maintenance medication is defined as any prescription drug prescribed for chronic, long-term conditions (such as hypertension, diabetes, or hyperlipidemia) taken on a continuous basis for 90 days or longer. Medications prescribed for acute conditions (e.g., short-course antibiotics, short-acting analgesics) do not qualify as maintenance medications.

> Advocate Script: "Maintenance medications are drugs taken regularly for chronic conditions like high blood pressure or diabetes. Short-term prescriptions like antibiotics are not considered maintenance drugs."

**Safety Restrictions:**
Advocates must not categorize acute symptom-relief narcotics or short-duration steroids as maintenance medications under any circumstances.
`;

// Document 2: Routine Refill Request Window Update
const DOC_2_ROUTINE_REFILL_WINDOW = `# Routine Refill Request Window Update
Doc ID: SRC-RX-2026-004 | Revision: 2 | Plan Scope: DEMO-RX-2026 | Owner: Pharmacy Operations | Effective: 01/01/2026 - 12/31/2026
Classification: Governed refill policy | Allowed Role: pharmacy_advocate

### [RX-006] Routine Refill Request Window Update
- Proposed Version: RX-006-v2
- Supersedes: RX-006-v1

Members may submit routine refill requests when at least 75% of their current prescription supply has elapsed based on day supply calculations. Refill requests submitted prior to the 75% threshold will be rejected with an early refill rejection notice unless an exception is approved.

> Advocate Script: "You can request a refill once you have used at least 75 percent of your current supply. For a 30-day supply, that is typically on or after day 23."

**Prohibited Interpretations:**
Advocates must not authorize routine refills prior to the 75% elapsed window without physician clinical justification and supervisor override.
`;

// Document 3: Benefits Education – Mail-Order Benefit Inquiries
const DOC_3_BENEFITS_EDUCATION = `# Benefits Education – Mail-Order Benefit Inquiries
Doc ID: SRC-BEN-2026-003 | Revision: 1 | Plan Scope: DEMO-RX-2026 | Owner: Benefits Education | Effective: 01/01/2026 - 12/31/2026
Classification: Synthetic demonstration content | Allowed Role: insurance_advocate

## Source-Upload Instructions
Upload this document to the Verity ingestion pipeline for automated candidate extraction. Review all extracted knowledge units before proposing drafts.

### [BEN-008] Benefits Handling of Mail-Order Rejections
When a mail-order maintenance medication prescription is rejected due to plan exclusions or prior authorization requirements, advocates must notify the member within 24 hours. The member may request a one-time 30-day emergency transition refill at a retail pharmacy while an exception is reviewed.

> Advocate Script: "Your mail-order prescription could not be filled under standard processing. We have authorized a one-time 30-day emergency supply at your local pharmacy while our team reviews the coverage exception."

**Prohibited Interpretations:**
Advocates must not advise members that rejected mail-order prescriptions will automatically transfer to retail pharmacies for ongoing fills.
`;

describe("Verity Document Extraction Reliability & End-to-End Pipeline Audit", () => {
  let db: ReturnType<typeof createDatabaseClient>;
  let repo: StorageRepository;

  beforeEach(async () => {
    resetDemoStore();
    resetStore();
    db = createDatabaseClient(":memory:");
    await runMigrations(db);
    repo = new StorageRepository(db);
    await seedInitialDraftsIfEmpty(repo);
  });

  afterEach(async () => {
    await closeDatabaseClient(db);
  });

  describe("Document 1: Maintenance Medication Definition (SRC-RX-2026-005)", () => {
    it("extracts exactly 1 candidate with clean title and no leaked metadata lines", () => {
      const res = extract(DOC_1_MAINTENANCE_MEDICATION, []);

      expect(res.doc_id).toBe("SRC-RX-2026-005");
      expect(res.title).toBe("Maintenance Medication Definition");
      expect(res.owner).toBe("Pharmacy Operations");
      expect(res.allowed_roles).toEqual(["pharmacy_advocate"]);

      // Exactly 1 candidate
      expect(res.candidates).toHaveLength(1);
      const cand = res.candidates[0]!;

      // Clean title
      expect(cand.title).toBe("Maintenance Medication Definition");
      expect(cand.title).not.toMatch(/[#*`:]/);

      // Annotated fields
      expect(cand.annotated_id).toBe("CAND-DUP-001");
      expect(cand.duplicate_of).toBe("CAND-DUP-001");
      expect(cand.is_duplicate_review).toBe(true);

      // Candidate body must NOT contain raw metadata/annotation lines
      expect(cand.body).not.toContain("Doc ID:");
      expect(cand.body).not.toContain("Candidate ID:");
      expect(cand.body).not.toContain("Duplicate Review:");
      expect(cand.body).not.toContain("Allowed Role:");

      // Substantive text preserved
      expect(cand.body).toContain(
        "A maintenance medication is defined as any prescription drug prescribed for chronic"
      );
      expect(cand.body).toContain(
        '> Advocate Script: "Maintenance medications are drugs taken regularly for chronic conditions'
      );
      expect(cand.body).toContain("**Safety Restrictions:**");
      expect(cand.body).toContain(
        "Advocates must not categorize acute symptom-relief narcotics or short-duration steroids"
      );
    });

    it("persists Document 1 into SQLite and propagates duplicate review annotations", async () => {
      const uploadRes = await handleUploadAndIngest(
        {
          filename: "maintenance_medication_def.md",
          mime_type: "text/markdown",
          content_text: DOC_1_MAINTENANCE_MEDICATION,
          uploaded_by: "Dana (Knowledge author)",
          sessionToken: "vty_sess_demo_dana",
        },
        repo
      );

      expect(uploadRes.ok).toBe(true);
      expect(uploadRes.doc_id).toBe("SRC-RX-2026-005");
      expect(uploadRes.units).toHaveLength(1);

      const unit = uploadRes.units[0]!;
      expect(unit.annotated_id).toBe("CAND-DUP-001");
      expect(unit.duplicate_of).toBe("CAND-DUP-001");
      expect(unit.is_duplicate_review).toBe(true);

      // Check DB persistence directly
      const dbCands = await repo.getCandidatesByDocId("SRC-RX-2026-005");
      expect(dbCands).toHaveLength(1);
      expect(dbCands[0]!.annotated_id).toBe("CAND-DUP-001");
      expect(dbCands[0]!.duplicate_of).toBe("CAND-DUP-001");
    });
  });

  describe("Document 2: Routine Refill Request Window Update (SRC-RX-2026-004)", () => {
    it("extracts exactly 1 candidate with versioning RX-006-v2 superseding RX-006-v1", () => {
      const res = extract(DOC_2_ROUTINE_REFILL_WINDOW, []);

      expect(res.doc_id).toBe("SRC-RX-2026-004");
      expect(res.title).toBe("Routine Refill Request Window Update");
      expect(res.owner).toBe("Pharmacy Operations");

      // Exactly 1 candidate
      expect(res.candidates).toHaveLength(1);
      const cand = res.candidates[0]!;

      // Clean title without markdown markers or brackets
      expect(cand.title).toBe("Routine Refill Request Window Update");
      expect(cand.title).not.toContain("###");
      expect(cand.title).not.toContain("[RX-006]");

      // Versioning fields
      expect(cand.cid).toBe("RX-006");
      expect(cand.annotated_id).toBe("RX-006");
      expect(cand.version).toBe(2);
      expect(cand.version_id).toBe("RX-006-v2");
      expect(cand.supersedes).toBe("RX-006-v1");

      // Body must NOT leak bulleted metadata
      expect(cand.body).not.toContain("- Proposed Version:");
      expect(cand.body).not.toContain("- Supersedes:");

      // Substantive text preserved
      expect(cand.body).toContain(
        "Members may submit routine refill requests when at least 75% of their current prescription supply"
      );
      expect(cand.body).toContain(
        '> Advocate Script: "You can request a refill once you have used at least 75 percent'
      );
      expect(cand.body).toContain("**Prohibited Interpretations:**");
      expect(cand.body).toContain(
        "Advocates must not authorize routine refills prior to the 75% elapsed window"
      );
    });

    it("propagates proposed version and supersedes linkage through draft proposal to review queue", async () => {
      const uploadRes = await handleUploadAndIngest(
        {
          filename: "refill_window_update.md",
          mime_type: "text/markdown",
          content_text: DOC_2_ROUTINE_REFILL_WINDOW,
          uploaded_by: "Dana (Knowledge author)",
          sessionToken: "vty_sess_demo_dana",
        },
        repo
      );

      const candidate = uploadRes.units[0]!;
      expect(candidate.version).toBe(2);
      expect(candidate.version_id).toBe("RX-006-v2");
      expect(candidate.supersedes).toBe("RX-006-v1");

      // Propose draft
      const draftRes = await handleProposeDrafts(
        {
          source_doc_id: "SRC-RX-2026-004",
          candidate_ids: [candidate.id],
          proposer_name: "Dana (Knowledge author)",
          proposer_role: "author",
          sessionToken: "vty_sess_demo_dana",
        },
        repo
      );

      expect(draftRes.ok).toBe(true);
      expect(draftRes.drafts).toHaveLength(1);
      const draft = draftRes.drafts[0]!;

      expect(draft.unit_id).toBe("RX-006");
      expect(draft.version).toBe(2);
      expect(draft.version_id).toBe("RX-006-v2");
      expect(draft.supersedes).toBe("RX-006-v1");

      // Check review queue item
      const queue = await handleListReviewQueue(repo);
      const rxItem = queue.find((item) => item.unit_id === "RX-006");
      expect(rxItem).toBeDefined();
      expect(rxItem!.version).toBe(2);
      expect(rxItem!.version_id).toBe("RX-006-v2");
      expect(rxItem!.supersedes).toBe("RX-006-v1");
      expect(rxItem!.source_id).toBe("SRC-RX-2026-004");
    });
  });

  describe("Document 3: Benefits Education – Mail-Order Benefit Inquiries (SRC-BEN-2026-003)", () => {
    it("ignores non-knowledge instruction sections and extracts only BEN-008", () => {
      const res = extract(DOC_3_BENEFITS_EDUCATION, []);

      expect(res.doc_id).toBe("SRC-BEN-2026-003");
      expect(res.title).toBe("Benefits Education – Mail-Order Benefit Inquiries");

      // Exactly 1 candidate — Source-Upload Instructions must not generate a unit
      expect(res.candidates).toHaveLength(1);
      const cand = res.candidates[0]!;

      expect(cand.cid).toBe("BEN-008");
      expect(cand.annotated_id).toBe("BEN-008");
      expect(cand.title).toBe("Benefits Handling of Mail-Order Rejections");
      expect(cand.title).not.toContain("###");
      expect(cand.title).not.toContain("[BEN-008]");

      // Body contains substantive instructions and scripts
      expect(cand.body).toContain(
        "When a mail-order maintenance medication prescription is rejected due to plan exclusions"
      );
      expect(cand.body).toContain(
        '> Advocate Script: "Your mail-order prescription could not be filled under standard processing.'
      );
      expect(cand.body).toContain("**Prohibited Interpretations:**");
    });
  });

  describe("Candidate Editing & Database Persistence across Reloads", () => {
    it("persists edited candidate fields to SQLite and survives reload retrieval", async () => {
      const uploadRes = await handleUploadAndIngest(
        {
          filename: "refill_window_update.md",
          mime_type: "text/markdown",
          content_text: DOC_2_ROUTINE_REFILL_WINDOW,
          uploaded_by: "Dana (Knowledge author)",
          sessionToken: "vty_sess_demo_dana",
        },
        repo
      );

      const originalCand = uploadRes.units[0]!;
      const candDbId = originalCand.id;

      // Update candidate unit
      const updateRes = await handleUpdateCandidateUnit(
        {
          id: candDbId,
          title: "Routine Refill Request Window Update (Reviewed & Clarified)",
          type: "Policy",
          content: originalCand.content + "\n\nAdditional clinical guideline note appended.",
          key_points: ["Key point 1", "Key point 2"],
          source_reference: "SRC-RX-2026-004 • Section Refill Rules",
          effective_date: "2026-03-01",
          sessionToken: "vty_sess_demo_dana",
        },
        repo
      );

      expect(updateRes.ok).toBe(true);
      expect(updateRes.candidate?.title).toBe(
        "Routine Refill Request Window Update (Reviewed & Clarified)"
      );

      // Simulate page reload: re-query candidates for document from SQLite
      const getRes = await handleGetCandidatesByDocId("SRC-RX-2026-004", repo);
      expect(getRes.ok).toBe(true);
      expect(getRes.candidates).toHaveLength(1);

      const reloaded = getRes.candidates[0]!;
      expect(reloaded.title).toBe("Routine Refill Request Window Update (Reviewed & Clarified)");
      expect(reloaded.candidate_type).toBe("Policy");
      expect(reloaded.body).toContain("Additional clinical guideline note appended.");
      expect(reloaded.effective_date).toBe("2026-03-01");
      expect(JSON.parse(reloaded.key_points_json)).toEqual(["Key point 1", "Key point 2"]);
    });
  });

  describe("Governance, Maker-Checker & Publication Regression Gates", () => {
    it("enforces maker-checker and prevents unapproved content from serving", async () => {
      // Step 1: Upload and propose Document 2
      await handleUploadAndIngest(
        {
          filename: "refill_window_update.md",
          mime_type: "text/markdown",
          content_text: DOC_2_ROUTINE_REFILL_WINDOW,
          uploaded_by: "Dana (Knowledge author)",
          sessionToken: "vty_sess_demo_dana",
        },
        repo
      );

      const cands = await repo.getCandidatesByDocId("SRC-RX-2026-004");
      const candId = cands[0]!.id;

      const draftRes = await handleProposeDrafts(
        {
          source_doc_id: "SRC-RX-2026-004",
          candidate_ids: [candId],
          proposer_name: "Dana (Knowledge author)",
          proposer_role: "author",
          sessionToken: "vty_sess_demo_dana",
        },
        repo
      );

      const draftId = draftRes.drafts[0]!.draft_id;

      // Gate 1: Maker-checker prevents author from approving their own draft
      const selfApproval = await handleDecideReviewItem(
        {
          draftId,
          action: "approve",
          sessionToken: "vty_sess_demo_dana",
          reviewerName: "Dana (Knowledge author)",
          reviewerRole: "knowledge_author",
          reviewerCapabilities: ["view_review_queue"],
        },
        repo
      );
      expect(selfApproval.ok).toBe(false);
      expect(selfApproval.error).toMatch(/Maker-checker violation/i);

      // Gate 2: Unauthorized role cannot approve
      const unauthApproval = await handleDecideReviewItem(
        {
          draftId,
          action: "approve",
          sessionToken: "vty_sess_demo_priya",
          reviewerName: "Priya (Advocate)",
          reviewerRole: "pharmacy_advocate",
          reviewerCapabilities: [],
        },
        repo
      );
      expect(unauthApproval.ok).toBe(false);
      expect(unauthApproval.error).toMatch(/unauthorized/i);

      // Gate 3: Unapproved draft text MUST NOT be returned by live engine serving
      const preApprovalServe = serveEngine({
        query: "routine refill 75 percent elapsed",
        role: "pharmacy_advocate",
        channel: "advocate_view",
      });
      const unapprovedMatch = preApprovalServe.parts.find((p) =>
        p.text?.includes("prior to the 75% threshold will be rejected")
      );
      expect(unapprovedMatch).toBeUndefined();

      // Gate 4: Independent authorized reviewer (Owen) approves
      const approvalRes = await handleDecideReviewItem(
        {
          draftId,
          action: "approve",
          sessionToken: "vty_sess_demo_owen",
          reviewerName: "Owen (Knowledge owner)",
          reviewerRole: "knowledge_owner",
          reviewerCapabilities: ["approve_standard"],
          notes: "Approved refill policy update v2.",
        },
        repo
      );
      expect(approvalRes.ok).toBe(true);

      // Gate 5: Approved draft updates live store with version 2
      const updatedDraft = await repo.getDraftById(draftId);
      expect(updatedDraft?.status).toBe("approved");

      const storeUnits = getDemoState().units;
      const published = storeUnits.find((u) => u.unit_id === "RX-006");
      expect(published).toBeDefined();
      const latestVer = published!.versions[published!.versions.length - 1]!;
      expect(latestVer.version).toBe(2);
      expect(latestVer.supersedes).toBe("RX-006-v1");
      expect(latestVer.text).toContain("75% of their current prescription supply");

      // Gate 6: Now that it's approved and published, live engine serves it
      const liveEngineUnit = getStore().engine().unit("RX-006");
      expect(liveEngineUnit).toBeDefined();
      expect(liveEngineUnit!.version).toBe(2);
      expect(liveEngineUnit!.supersedes).toBe("RX-006-v1");
      expect(liveEngineUnit!.body).toContain("75% of their current prescription supply");
    });
  });

  describe("Edge Cases & Ingestion Robustness", () => {
    it("handles empty or whitespace markdown safely", () => {
      const emptyRes = extract("", []);
      expect(emptyRes.candidates).toHaveLength(0);

      const whitespaceRes = extract("   \n\n\t  \n", []);
      expect(whitespaceRes.candidates).toHaveLength(0);
    });

    it("rejects 0-byte or empty upload cleanly", async () => {
      const res = await handleUploadAndIngest(
        {
          filename: "empty.md",
          mime_type: "text/markdown",
          content_text: "",
          uploaded_by: "Dana",
          sessionToken: "vty_sess_demo_dana",
        },
        repo
      );
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Missing required file name or file content/i);
    });

    it("rejects unsupported binary or executable mime types", async () => {
      const res = await handleUploadAndIngest(
        {
          filename: "malicious.exe",
          mime_type: "application/x-msdownload",
          content_text: "MZ...",
          uploaded_by: "Dana",
          sessionToken: "vty_sess_demo_dana",
        },
        repo
      );
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Unsupported document format/i);
    });

    it("detects exact duplicate document re-upload via content hash", async () => {
      const first = await handleUploadAndIngest(
        {
          filename: "refill_v1.md",
          mime_type: "text/markdown",
          content_text: DOC_2_ROUTINE_REFILL_WINDOW,
          uploaded_by: "Dana",
          sessionToken: "vty_sess_demo_dana",
        },
        repo
      );
      expect(first.ok).toBe(true);

      const dup = await handleUploadAndIngest(
        {
          filename: "refill_v1_dup.md",
          mime_type: "text/markdown",
          content_text: DOC_2_ROUTINE_REFILL_WINDOW,
          uploaded_by: "Dana",
          sessionToken: "vty_sess_demo_dana",
        },
        repo
      );
      expect(dup.ok).toBe(true);
      expect(dup.isDuplicate).toBe(true);
      expect(dup.duplicate_of).toBe("SRC-RX-2026-004");
      expect(dup.warnings?.[0]).toMatch(/identical SHA-256 hash/i);
    });
  });
});
