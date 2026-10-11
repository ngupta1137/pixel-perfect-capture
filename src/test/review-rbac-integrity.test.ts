import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { StorageRepository } from "../storage/repository";
import { createDatabaseClient, closeDatabaseClient } from "../storage/db";
import { runMigrations } from "../storage/migrations";
import { handleDecideReviewItem } from "../services/review.server";
import { extract } from "../verity-engine/extract";
import type { KnowledgeUnit } from "../verity-engine/types";

describe("Review RBAC Actions & Extraction Integrity Direct Server Tests", () => {
  let testDb: ReturnType<typeof createDatabaseClient>;
  let repo: StorageRepository;

  beforeEach(async () => {
    testDb = createDatabaseClient(":memory:");
    await runMigrations(testDb);
    repo = new StorageRepository(testDb);
  });

  afterEach(async () => {
    await closeDatabaseClient(testDb);
  });

  describe("1. Role-based review actions & direct server API security", () => {
    it("rejects unauthorized user trying to reject a draft directly", async () => {
      // Create a draft proposed by Dana
      await repo.createDrafts([
        {
          draft_id: "DRAFT-SEC-001",
          candidate_id: null,
          source_doc_id: "DOC-SEC-01",
          unit_id: "U-SEC-001",
          title: "Prior Auth Window",
          proposed_text: "Standard prior auth turn-around window is 72 hours.",
          current_text: null,
          candidate_type: "Fact",
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

      // Dana (author) attempts to reject
      const rejectRes = await handleDecideReviewItem(
        {
          draftId: "DRAFT-SEC-001",
          action: "reject",
          reviewerName: "Dana (Knowledge author)",
          reviewerRole: "knowledge_author",
          reviewerCapabilities: ["view_review_queue", "propose_unit"],
          notes: "Attempted unauthorized reject",
        },
        repo
      );

      expect(rejectRes.ok).toBe(false);
      expect(rejectRes.error).toMatch(/Unauthorized/i);
    });

    it("rejects unauthorized user trying to request changes directly", async () => {
      await repo.createDrafts([
        {
          draft_id: "DRAFT-SEC-002",
          candidate_id: null,
          source_doc_id: "DOC-SEC-01",
          unit_id: "U-SEC-002",
          title: "Prior Auth Appeals",
          proposed_text: "Appeals must be submitted within 60 days.",
          current_text: null,
          candidate_type: "Fact",
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

      // Reader Charlie attempts to request changes
      const reqChangeRes = await handleDecideReviewItem(
        {
          draftId: "DRAFT-SEC-002",
          action: "request_changes",
          reviewerName: "Charlie (Reader)",
          reviewerRole: "consumer",
          reviewerCapabilities: ["search"],
          notes: "Change wording please",
        },
        repo
      );

      expect(reqChangeRes.ok).toBe(false);
      expect(reqChangeRes.error).toMatch(/Unauthorized/i);
    });

    it("enforces maker-checker: author Dana cannot approve her own draft", async () => {
      await repo.createDrafts([
        {
          draft_id: "DRAFT-SEC-003",
          candidate_id: null,
          source_doc_id: "DOC-SEC-01",
          unit_id: "U-SEC-003",
          title: "Maintenance Med Policy",
          proposed_text: "Prescriptions for maintenance drugs cover 90 days.",
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

      const selfApproval = await handleDecideReviewItem(
        {
          draftId: "DRAFT-SEC-003",
          action: "approve",
          reviewerName: "Dana (Knowledge author)",
          reviewerRole: "knowledge_author",
          reviewerCapabilities: ["approve_standard", "view_review_queue"],
          notes: "Self approving",
        },
        repo
      );

      expect(selfApproval.ok).toBe(false);
      expect(selfApproval.error).toMatch(/Maker-checker violation/i);
    });

    it("prevents standard reviewer from approving verbatim legal draft", async () => {
      await repo.createDrafts([
        {
          draft_id: "DRAFT-SEC-004",
          candidate_id: null,
          source_doc_id: "DOC-LEGAL-01",
          unit_id: "U-LEG-001",
          title: "Legal Non-Discrimination Notice",
          proposed_text: "Humana does not discriminate on the basis of race, color, or national origin.",
          current_text: null,
          candidate_type: "Legal",
          verbatim: 1,
          route_to: "legal",
          owner_team: "Compliance",
          knowledge_base: "KB-SHARED",
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

      // Owen (standard owner) attempts to approve verbatim legal unit
      const owenApproval = await handleDecideReviewItem(
        {
          draftId: "DRAFT-SEC-004",
          action: "approve",
          reviewerName: "Owen (Knowledge owner)",
          reviewerRole: "knowledge_owner",
          reviewerCapabilities: ["approve_standard", "view_review_queue"],
          notes: "Approving verbatim unit",
        },
        repo
      );

      expect(owenApproval.ok).toBe(false);
      expect(owenApproval.error).toMatch(/Legal Approver authorization/i);
    });

    it("allows legal approver Rita to approve verbatim legal draft", async () => {
      await repo.createDrafts([
        {
          draft_id: "DRAFT-SEC-005",
          candidate_id: null,
          source_doc_id: "DOC-LEGAL-02",
          unit_id: "U-LEG-002",
          title: "Legal Closing Disclaimer",
          proposed_text: "This call was recorded for quality assurance.",
          current_text: null,
          candidate_type: "Legal",
          verbatim: 1,
          route_to: "legal",
          owner_team: "Compliance",
          knowledge_base: "KB-SHARED",
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

      const ritaApproval = await handleDecideReviewItem(
        {
          draftId: "DRAFT-SEC-005",
          action: "approve",
          reviewerName: "Rita (Legal / Compliance approver)",
          reviewerRole: "legal_approver",
          reviewerCapabilities: ["approve_legal", "approve_standard", "view_review_queue"],
          notes: "Approved verbatim statement as required by compliance.",
        },
        repo
      );

      expect(ritaApproval.ok).toBe(true);
      expect(ritaApproval.message).toMatch(/Successfully approved/i);
    });
  });

  describe("2. Extraction integrity & metadata hygiene", () => {
    it("extracts Maintenance Medication Definition without metadata annotations in body", () => {
      const doc = `# Maintenance Medication Definition
Source: Pharmacy Operations Guide
Doc ID: SRC-RX-2026-005
Domain Team: Pharmacy Ops
Allowed Role: ["pharmacy_advocate", "member_chat"]
Effective: 2026-01-01

### Unit: CAND-DUP-001
Type: Policy
Domain: Pharmacy Ops
Allowed Role: ["pharmacy_advocate",
"member_chat"]

Maintenance medications are prescription drugs taken on an ongoing, regular basis to treat chronic conditions such as high blood pressure, diabetes, asthma, or high cholesterol.

> Advocate Script:
> "Maintenance medications are those prescribed for chronic, long-term conditions. They are typically filled as 90-day supplies through mail order or designated retail pharmacies."

* Warning: Acute medications such as short-course antibiotics are not classified as maintenance medications.
`;

      const result = extract(doc, [], undefined, "SRC-RX-2026-005");
      expect(result.candidates.length).toBe(1);

      const candidate = result.candidates[0]!;
      expect(candidate.annotated_id).toBe("CAND-DUP-001");
      expect(candidate.type).toBe("policy");
      expect(candidate.domain).toBe("Pharmacy Ops");
      expect(candidate.allowed_roles).toContain("pharmacy_advocate");
      expect(candidate.allowed_roles).toContain("member_chat");

      // Candidate body must begin with the actual definition, NOT '"member_chat"]'
      expect(candidate.body).not.toMatch(/member_chat/);
      expect(candidate.body).not.toMatch(/^\s*["\]]/);
      expect(candidate.body.startsWith("Maintenance medications are prescription drugs")).toBe(true);

      // Must preserve quotes, scripts, warnings, and Markdown text
      expect(candidate.body).toContain('> Advocate Script:');
      expect(candidate.body).toContain('* Warning: Acute medications');
    });

    it("extracts Refill Request Window Update with version RX-006-v2 and supersedes RX-006-v1", () => {
      const doc = `# Routine Refill Request Window Update
Doc ID: SRC-RX-2026-004
Owner: Pharmacy Ops

### Unit: RX-006
Proposed Version: RX-006-v2
Supersedes: RX-006-v1
Type: Policy

Members may request routine refills when 75% of the current supply has elapsed (day 23 of a 30-day supply, or day 68 of a 90-day supply).
`;

      const existingUnit: KnowledgeUnit = {
        unit_id: "RX-006",
        title: "Routine Refill Request Window",
        type: "policy",
        body: "Members may request refills at day 25 of 30.",
        verbatim: false,
        spoken_version: null,
        knowledge_base: "KB-PHARM",
        audience: ["advocate"],
        channels: ["advocate_view"],
        authority_level: "knowledge_article",
        source_doc: "SRC-RX-2026-001",
        source_section: "Refill Window",
        effective_date: "2025-01-01",
        review_date: "2026-01-01",
        version: 1,
        status: "approved",
        supersedes: null,
        synonyms: ["refill window"],
        owner: "Pharmacy Ops",
        approved_by: "Owen",
        applies_to: { lob: ["MAPD"], states: "ALL", plan_year: 2025 },
      };

      const result = extract(doc, [existingUnit], undefined, "SRC-RX-2026-004");
      expect(result.candidates.length).toBe(1);

      const candidate = result.candidates[0]!;
      expect(candidate.annotated_id).toBe("RX-006");
      expect(candidate.version).toBe(2);
      expect(candidate.supersedes).toBe("RX-006-v1");
      expect(candidate.body.startsWith("Members may request routine refills")).toBe(true);
    });

    it("extracts Benefits Education BEN-008 preserving full substantive text", () => {
      const doc = `# Benefits Education – Mail-Order Benefit Inquiries
Doc ID: SRC-BEN-2026-003
Owner: Benefits Education

### Unit: BEN-008
Type: Fact
Domain: Benefits Education

Mail-order pharmacy benefits allow eligible members to receive up to a 90-day supply of maintenance medications delivered directly to their home. Standard delivery takes 5 to 7 business days.

#### Copay Incentives:
Tier 1 and Tier 2 generic maintenance drugs ordered through the designated mail-order pharmacy have a $0 copay for MAPD plan members.
`;

      const result = extract(doc, [], undefined, "SRC-BEN-2026-003");
      expect(result.candidates.length).toBe(1);

      const candidate = result.candidates[0]!;
      expect(candidate.annotated_id).toBe("BEN-008");
      expect(candidate.domain).toBe("Benefits Education");
      expect(candidate.body).toContain("Mail-order pharmacy benefits allow eligible members");
      expect(candidate.body).toContain("#### Copay Incentives:");
      expect(candidate.body).toContain("$0 copay for MAPD plan members");
    });
  });
});
