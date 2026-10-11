import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDatabaseClient, closeDatabaseClient } from "../storage/db";
import { runMigrations } from "../storage/migrations";
import { StorageRepository } from "../storage/repository";
import { extract } from "../verity-engine/extract";
import { handleUploadAndIngest, handleProposeDrafts } from "../services/ingest.server";
import { handleListReviewQueue, handleDecideReviewItem } from "../services/review.server";
import { findPerson, canOpen, canView, navFor } from "../lib/rights";
import { SIDEBAR_ITEMS } from "../components/workspace/navigation";

const EXACT_DOCUMENT = `# Benefits Education – Mail-Order Benefit Inquiries
Doc ID: SRC-BEN-2026-003 | Revision: 1 | Plan Scope: DEMO-RX-2026 | Owner: Benefits Education | Effective: 01/01/2026 - 12/31/2026
Classification: Synthetic demonstration content | Allowed Role: insurance_advocate

### [BEN-008] Benefits Handling of Mail-Order Rejections
When a mail-order maintenance medication prescription is rejected due to plan exclusions or prior authorization requirements, advocates must notify the member within 24 hours. The member may request a one-time 30-day emergency transition refill at a retail pharmacy while an exception is reviewed.

> Advocate Script: "Your mail-order prescription could not be filled under standard processing. We have authorized a one-time 30-day emergency supply at your local pharmacy while our team reviews the coverage exception."

**Prohibited Interpretations:**
Advocates must not advise members that rejected mail-order prescriptions will automatically transfer to retail pharmacies for ongoing fills.
`;

const GENERAL_MULTI_SECTION_DOCUMENT = `# Clinical Prior Authorization Standard Operating Procedure
Source ID: SRC-CLIN-2026-009 | Revision: 2 | Plan Scope: COMMERCIAL-2026 | Owner: Clinical Pharmacy Operations
Classification: Governed clinical procedure | Allowed Role: pharmacy_advocate, clinical_reviewer

## [PA-101] Standard Intake Turnaround
Standard prior authorization requests must be processed within 72 hours of receiving complete documentation from the prescriber.

> Script: "Standard reviews are completed within 72 business hours."

## [PA-102] Urgent Exception Escalations
Urgent requests involving immediate health risks require adjudication within 24 hours.

**Prohibited Interpretations:**
Never advise the caller that verbal requests are automatically approved without physician clinical notes.
`;

describe("Phase 3C: Extraction Quality, Record Integrity, and Navigation Audit", () => {
  let db: ReturnType<typeof createDatabaseClient>;
  let repo: StorageRepository;

  beforeEach(async () => {
    db = createDatabaseClient(":memory:");
    await runMigrations(db);
    repo = new StorageRepository(db);
    const { seedInitialDraftsIfEmpty } = await import("../services/review.server");
    await seedInitialDraftsIfEmpty(repo);
  });

  afterEach(async () => {
    await closeDatabaseClient(db);
  });

  describe("1. Exact Document Extraction & Metadata Parsing", () => {
    it("parses structured metadata from the exact supplied document without accidental candidate units", () => {
      const res = extract(EXACT_DOCUMENT, []);

      // Verify structured document metadata
      expect(res.doc_id).toBe("SRC-BEN-2026-003");
      expect(res.title).toBe("Benefits Education – Mail-Order Benefit Inquiries");
      expect(res.owner).toBe("Benefits Education");
      expect(res.effective_date).toBe("2026-01-01");
      expect(res.revision).toBe("1");
      expect(res.plan_scope).toBe("DEMO-RX-2026");
      expect(res.classification).toBe("Synthetic demonstration content");
      expect(res.allowed_roles).toEqual(["insurance_advocate"]);

      // Metadata lines MUST NOT produce accidental knowledge units
      expect(res.candidates).toHaveLength(1);
      const cand = res.candidates[0]!;

      // Annotated unit ID and clean title
      expect(cand.cid).toBe("BEN-008");
      expect(cand.annotated_id).toBe("BEN-008");
      expect(cand.title).toBe("Benefits Handling of Mail-Order Rejections");
      // Must not contain markdown markers in title
      expect(cand.title).not.toContain("###");
      expect(cand.title).not.toContain("**");
      expect(cand.title).not.toContain("[BEN-008]");

      // Review date parsed from effective period end (12/31/2026 -> 2026-12-31)
      expect(cand.review_date).toBe("2026-12-31");

      // Substantive content verification: policy text, quoted script, and prohibition
      expect(cand.body).toContain(
        "When a mail-order maintenance medication prescription is rejected due to plan exclusions"
      );
      expect(cand.body).toContain(
        '> Advocate Script: "Your mail-order prescription could not be filled under standard processing.'
      );
      expect(cand.body).toContain("**Prohibited Interpretations:**");
      expect(cand.body).toContain(
        "Advocates must not advise members that rejected mail-order prescriptions will automatically transfer"
      );
    });

    it("generalizes extraction across multiple documents without hardcoding", () => {
      const res = extract(GENERAL_MULTI_SECTION_DOCUMENT, []);

      expect(res.doc_id).toBe("SRC-CLIN-2026-009");
      expect(res.title).toBe("Clinical Prior Authorization Standard Operating Procedure");
      expect(res.owner).toBe("Clinical Pharmacy Operations");
      expect(res.candidates).toHaveLength(2);

      const [c1, c2] = res.candidates;
      expect(c1!.cid).toBe("PA-101");
      expect(c1!.title).toBe("Standard Intake Turnaround");
      expect(c1!.body).toContain("processed within 72 hours");

      expect(c2!.cid).toBe("PA-102");
      expect(c2!.title).toBe("Urgent Exception Escalations");
      expect(c2!.body).toContain("adjudication within 24 hours");
      expect(c2!.body).toContain("Never advise the caller that verbal requests are automatically approved");
    });
  });

  describe("2. End-to-End Source to Draft to Review Queue Record Integrity", () => {
    it("traces the exact source through upload, draft proposal, and review queue with foreign-key linkage", async () => {
      // Step A: Ingest source document
      const uploadRes = await handleUploadAndIngest(
        {
          filename: "mail_order_inquiries.md",
          mime_type: "text/markdown",
          content_text: EXACT_DOCUMENT,
          uploaded_by: "Dana (Knowledge author)",
        },
        repo
      );

      expect(uploadRes.ok).toBe(true);
      expect(uploadRes.doc_id).toBe("SRC-BEN-2026-003");
      expect(uploadRes.document!.title).toBe("Benefits Education – Mail-Order Benefit Inquiries");
      expect(uploadRes.document!.owner_team).toBe("Benefits Education");
      expect(uploadRes.document!.lob).toBe("DEMO-RX-2026");

      // Verify candidate unit persisted in database
      const candidates = await repo.getCandidatesByDocId("SRC-BEN-2026-003");
      expect(candidates).toHaveLength(1);
      const cand = candidates[0]!;
      expect(cand.cid).toBe("BEN-008");
      expect(cand.title).toBe("Benefits Handling of Mail-Order Rejections");
      expect(cand.source_doc_id).toBe("SRC-BEN-2026-003");

      // Step B: Submit candidate as governed draft
      const draftRes = await handleProposeDrafts(
        {
          source_doc_id: "SRC-BEN-2026-003",
          candidate_ids: [cand.id],
          proposer_name: "Dana (Knowledge author)",
          proposer_role: "author",
        },
        repo
      );

      expect(draftRes.ok).toBe(true);
      expect(draftRes.drafts).toHaveLength(1);
      const draft = draftRes.drafts[0]!;
      expect(draft.unit_id).toBe("BEN-008");
      expect(draft.source_doc_id).toBe("SRC-BEN-2026-003");
      expect(draft.candidate_id).toBe(cand.id);
      expect(draft.proposed_by).toBe("Dana (Knowledge author)");

      // Step C: Retrieve Review Queue
      const queueItems = await handleListReviewQueue(repo);
      const liveItem = queueItems.find((q) => q.unit_id === "BEN-008");
      expect(liveItem).toBeDefined();

      // Check review queue item details
      expect(liveItem!.id).toBe(draft.draft_id);
      expect(liveItem!.unit_id).toBe("BEN-008");
      expect(liveItem!.source_id).toBe("SRC-BEN-2026-003");
      expect(liveItem!.source_doc).toBe("Benefits Education – Mail-Order Benefit Inquiries");
      expect(liveItem!.section).toBe("[BEN-008] Benefits Handling of Mail-Order Rejections");
      expect(liveItem!.is_demo).toBe(false);

      // Verify demo fixtures are explicitly separated
      const demoItem = queueItems.find((q) => q.id === "REV-001");
      expect(demoItem).toBeDefined();
      expect(demoItem!.is_demo).toBe(true);
      expect(demoItem!.title).toBe("Copay assistance program overview");
    });

    it("enforces maker-checker and independent reviewer governance on the live draft", async () => {
      // Upload & propose draft as Dana
      await handleUploadAndIngest(
        {
          filename: "mail_order_inquiries.md",
          content_text: EXACT_DOCUMENT,
          uploaded_by: "Dana (Knowledge author)",
        },
        repo
      );
      const cands = await repo.getCandidatesByDocId("SRC-BEN-2026-003");
      const draftRes = await handleProposeDrafts(
        {
          source_doc_id: "SRC-BEN-2026-003",
          candidate_ids: [cands[0]!.id],
          proposer_name: "Dana (Knowledge author)",
        },
        repo
      );
      const draftId = draftRes.drafts[0]!.draft_id;

      // Dana attempting to approve her own draft MUST be rejected by maker-checker
      const selfApprove = await handleDecideReviewItem(
        {
          draftId,
          action: "approve",
          reviewerName: "Dana (Knowledge author)",
          reviewerRole: "knowledge_author",
          reviewerCapabilities: ["view_review_queue"],
        },
        repo
      );
      expect(selfApprove.ok).toBe(false);
      expect(selfApprove.error).toMatch(/Maker-checker violation/i);

      // Independent knowledge owner (Owen) can approve
      const ownerApprove = await handleDecideReviewItem(
        {
          draftId,
          action: "approve",
          reviewerName: "Owen (Knowledge owner)",
          reviewerRole: "knowledge_owner",
          reviewerCapabilities: ["approve_standard"],
          notes: "Approved mail-order inquiry policy for 2026.",
        },
        repo
      );
      expect(ownerApprove.ok).toBe(true);

      // Verify status updated in database
      const updatedDraft = await repo.getDraftById(draftId);
      expect(updatedDraft?.status).toBe("approved");
      expect(updatedDraft?.decided_by).toBe("Owen (Knowledge owner)");
    });
  });

  describe("3. Role-Aware Navigation Audit", () => {
    it("displays Review queue in Dana's sidebar based on view_review_queue capability", () => {
      const dana = findPerson("dana")!;
      expect(dana.capabilities).toContain("view_review_queue");

      // Verify Dana can open /review
      expect(canOpen(dana, "/review")).toBe(true);
      expect(canView(dana, "author_queue")).toBe(true);

      // Verify sidebar items filtering for Dana
      const permittedItems = SIDEBAR_ITEMS.filter((item) => {
        if (item.to === "/legal" && !dana.capabilities.includes("approve_legal")) return false;
        if (item.views) return item.views.some((v) => canView(dana, v));
        if (item.view) return canView(dana, item.view);
        return canOpen(dana, item.to);
      });

      const reviewItem = permittedItems.find((i) => i.to === "/review");
      expect(reviewItem).toBeDefined();
      expect(reviewItem?.label).toBe("Review queue");

      // Dana should NOT see Evaluations (she lacks view_evals)
      const evalsItem = permittedItems.find((i) => i.to === "/evals");
      expect(evalsItem).toBeUndefined();
    });

    it("displays Evaluations in Nitin's sidebar and hides unpermitted operational items", () => {
      const nitin = findPerson("nitin")!;
      expect(nitin.capabilities).toContain("view_evals");
      expect(nitin.capabilities).toContain("run_evals");

      const permittedItems = SIDEBAR_ITEMS.filter((item) => {
        if (item.to === "/legal" && !nitin.capabilities.includes("approve_legal")) return false;
        if (item.views) return item.views.some((v) => canView(nitin, v));
        if (item.view) return canView(nitin, item.view);
        return canOpen(nitin, item.to);
      });

      const evalsItem = permittedItems.find((i) => i.to === "/evals");
      expect(evalsItem).toBeDefined();

      // Nitin is AI product owner and cannot approve legal content
      const legalItem = permittedItems.find((i) => i.to === "/legal");
      expect(legalItem).toBeUndefined();
    });

    it("hides Review queue from advocates (Priya) who lack view_review_queue", () => {
      const priya = findPerson("priya")!;
      expect(canOpen(priya, "/review")).toBe(false);

      const permittedItems = SIDEBAR_ITEMS.filter((item) => {
        if (item.to === "/legal" && !priya.capabilities.includes("approve_legal")) return false;
        if (item.views) return item.views.some((v) => canView(priya, v));
        if (item.view) return canView(priya, item.view);
        return canOpen(priya, item.to);
      });

      const reviewItem = permittedItems.find((i) => i.to === "/review");
      expect(reviewItem).toBeUndefined();
    });
  });
});
