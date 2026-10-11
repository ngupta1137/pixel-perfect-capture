import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { StorageRepository } from "../storage/repository";
import { createDatabaseClient, closeDatabaseClient } from "../storage/db";
import { runMigrations } from "../storage/migrations";
import { handleDecideReviewItem } from "../services/review.server";
import {
  handleUploadAndIngest,
  handleProposeDrafts,
  handleUpdateCandidateUnit,
} from "../services/ingest.server";
import {
  createSession,
  validateSessionToken,
  type AuthenticatedUser,
} from "../services/auth.server";
import { resetStore } from "../verity-engine/server";

describe("Phase 1: Adversarial Server-Side Identity & RBAC Tests", () => {
  let testDb: ReturnType<typeof createDatabaseClient>;
  let repo: StorageRepository;

  // Stable server sessions for test personas
  let authorSession: { token: string; user: AuthenticatedUser };
  let ownerSession: { token: string; user: AuthenticatedUser };
  let legalSession: { token: string; user: AuthenticatedUser };
  let advocateSession: { token: string; user: AuthenticatedUser };

  beforeEach(async () => {
    resetStore();
    testDb = createDatabaseClient(":memory:");
    await runMigrations(testDb);
    repo = new StorageRepository(testDb);

    // Create cryptographically signed server sessions
    authorSession = createSession("dana");
    ownerSession = createSession("owen");
    legalSession = createSession("rita");
    advocateSession = createSession("priya");
  });

  afterEach(async () => {
    await closeDatabaseClient(testDb);
  });

  describe("1. Unauthenticated request boundary enforcement", () => {
    it("rejects unauthenticated upload attempts", async () => {
      const res = await handleUploadAndIngest(
        {
          fileName: "unauth_test.md",
          content_text: "# Test Policy\nBody content.",
          // No sessionToken provided
        },
        repo
      );
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Authentication required|No valid session/i);
    });

    it("rejects unauthenticated draft proposal attempts", async () => {
      const res = await handleProposeDrafts(
        {
          sourceDocId: "DOC-UNAUTH",
          candidateIds: ["CAND-1"],
          // No sessionToken provided
        },
        repo
      );
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Authentication required|No valid session/i);
    });

    it("rejects unauthenticated candidate update attempts", async () => {
      const res = await handleUpdateCandidateUnit(
        {
          id: "CAND-UNAUTH",
          title: "New Title",
          // No sessionToken provided
        },
        repo
      );
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Authentication required|No valid session/i);
    });

    it("rejects unauthenticated review decision attempts", async () => {
      const res = await handleDecideReviewItem(
        {
          draftId: "REV-001",
          action: "approve",
          // No sessionToken provided
        },
        repo
      );
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Authentication required|No valid session/i);
    });
  });

  describe("2. Author capability boundaries (Dana cannot decide review items)", () => {
    it("denies Knowledge Author from approving a draft", async () => {
      const [draft] = await repo.createDrafts([
        {
          draft_id: "DRAFT-AUTH-001",
          candidate_id: null,
          source_doc_id: "DOC-1",
          unit_id: "U-001",
          title: "Maintenance Med Window",
          proposed_text: "Refill window is 21 days.",
          current_text: null,
          candidate_type: "Policy",
          verbatim: 0,
          route_to: "owner",
          owner_team: "Pharmacy Ops",
          knowledge_base: "KB-PHARM",
          effective_date: "2026-01-01",
          tags_json: "[]",
          proposed_by: "System Pre-seed",
          proposer_id: "system",
          status: "proposed",
          reason: null,
          decided_by: null,
          gate_json: null,
          history_json: "[]",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const res = await handleDecideReviewItem(
        {
          draftId: draft.draft_id,
          action: "approve",
          sessionToken: authorSession.token,
        },
        repo
      );

      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Unauthorized: User "Dana".*lacks authorization/i);
    });

    it("denies Knowledge Author from rejecting or requesting changes on drafts", async () => {
      const [draft] = await repo.createDrafts([
        {
          draft_id: "DRAFT-AUTH-002",
          candidate_id: null,
          source_doc_id: "DOC-1",
          unit_id: "U-002",
          title: "Prior Auth Guidelines",
          proposed_text: "Guidelines text.",
          current_text: null,
          candidate_type: "Policy",
          verbatim: 0,
          route_to: "owner",
          owner_team: "Pharmacy Ops",
          knowledge_base: "KB-PHARM",
          effective_date: "2026-01-01",
          tags_json: "[]",
          proposed_by: "System Pre-seed",
          proposer_id: "system",
          status: "proposed",
          reason: null,
          decided_by: null,
          gate_json: null,
          history_json: "[]",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const rejectRes = await handleDecideReviewItem(
        {
          draftId: draft.draft_id,
          action: "reject",
          sessionToken: authorSession.token,
          notes: "Attempting reject as author",
        },
        repo
      );
      expect(rejectRes.ok).toBe(false);
      expect(rejectRes.error).toMatch(/Unauthorized: User "Dana".*lacks authorization/i);

      const changeRes = await handleDecideReviewItem(
        {
          draftId: draft.draft_id,
          action: "request_changes",
          sessionToken: authorSession.token,
          notes: "Attempting change request as author",
        },
        repo
      );
      expect(changeRes.ok).toBe(false);
      expect(changeRes.error).toMatch(/Unauthorized: User "Dana".*lacks authorization/i);
    });
  });

  describe("3. Spoofing resilience (Request-body claims are ignored)", () => {
    it("ignores forged reviewerRole and reviewerCapabilities in request body", async () => {
      const [draft] = await repo.createDrafts([
        {
          draft_id: "DRAFT-SPOOF-001",
          candidate_id: null,
          source_doc_id: "DOC-1",
          unit_id: "U-003",
          title: "Benefits Explanation",
          proposed_text: "Benefits text.",
          current_text: null,
          candidate_type: "Policy",
          verbatim: 0,
          route_to: "owner",
          owner_team: "Pharmacy Ops",
          knowledge_base: "KB-PHARM",
          effective_date: "2026-01-01",
          tags_json: "[]",
          proposed_by: "System",
          proposer_id: "system",
          status: "proposed",
          reason: null,
          decided_by: null,
          gate_json: null,
          history_json: "[]",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      // Dana's session token is provided, but request maliciously claims to be Rita with legal capabilities
      const res = await handleDecideReviewItem(
        {
          draftId: draft.draft_id,
          action: "approve",
          sessionToken: authorSession.token, // Authenticated as Dana
          reviewerName: "Rita",
          reviewerRole: "legal_approver",
          reviewerCapabilities: ["approve_legal", "approve_standard"],
          notes: "Forged credentials payload",
        },
        repo
      );

      // Server must derive permissions from verified session (Dana), NOT forged body claims!
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Unauthorized: User "Dana".*lacks authorization/i);
      expect(res.error).not.toMatch(/Rita/);
    });

    it("ignores forged actor/uploaded_by during source upload", async () => {
      // Owen (knowledge owner) does not hold "ingest_source" capability!
      const res = await handleUploadAndIngest(
        {
          fileName: "spoofed_upload.md",
          content_text: "# Title\nSubstantive content.",
          sessionToken: ownerSession.token, // Authenticated as Owen
          actor: "Dana (Knowledge author)", // Malicious claim
          uploaded_by: "Dana",
        },
        repo
      );

      // Owen lacks ingest_source capability (separation of duties!)
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/User "Owen".*lacks required capability "ingest_source"/i);
    });
  });

  describe("4. Maker-checker enforcement with stable user IDs", () => {
    it("prevents proposer from approving own draft even if display name is modified", async () => {
      const [draft] = await repo.createDrafts([
        {
          draft_id: "DRAFT-MC-001",
          candidate_id: null,
          source_doc_id: "DOC-1",
          unit_id: "U-004",
          title: "Self Authored Policy",
          proposed_text: "Authored policy.",
          current_text: null,
          candidate_type: "Policy",
          verbatim: 0,
          route_to: "owner",
          owner_team: "Pharmacy Ops",
          knowledge_base: "KB-PHARM",
          effective_date: "2026-01-01",
          tags_json: "[]",
          proposed_by: "Owen (Knowledge owner)",
          proposer_id: "owen", // Stable proposer ID
          status: "proposed",
          reason: null,
          decided_by: null,
          gate_json: null,
          history_json: "[]",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      // Owen attempts to approve his own draft with a spoofed display name in body
      const res = await handleDecideReviewItem(
        {
          draftId: draft.draft_id,
          action: "approve",
          sessionToken: ownerSession.token, // Verified as Owen
          reviewerName: "Alex Reviewer", // Altered display name
        },
        repo
      );

      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Maker-checker violation: You \(Owen\) cannot approve your own proposed draft/i);
    });
  });

  describe("5. Legal and Verbatim approval governance", () => {
    it("denies standard reviewer Owen from approving verbatim legal draft", async () => {
      const [draft] = await repo.createDrafts([
        {
          draft_id: "DRAFT-LEG-001",
          candidate_id: null,
          source_doc_id: "DOC-LEG",
          unit_id: "U-005",
          title: "Legal Disclaimer Script",
          proposed_text: "You must read this exact disclaimer.",
          current_text: null,
          candidate_type: "Script",
          verbatim: 1, // Verbatim legal unit
          route_to: "legal",
          owner_team: "Compliance",
          knowledge_base: "KB-SHARED",
          effective_date: "2026-01-01",
          tags_json: "[]",
          proposed_by: "Dana (Knowledge author)",
          proposer_id: "dana",
          status: "proposed",
          reason: null,
          decided_by: null,
          gate_json: null,
          history_json: "[]",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const res = await handleDecideReviewItem(
        {
          draftId: draft.draft_id,
          action: "approve",
          sessionToken: ownerSession.token, // Owen holds approve_standard but NOT approve_legal
        },
        repo
      );

      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Legal Approver authorization \(capability: approve_legal\)/i);
    });

    it("allows legal approver Rita to approve verbatim legal draft", async () => {
      const [draft] = await repo.createDrafts([
        {
          draft_id: "DRAFT-LEG-002",
          candidate_id: null,
          source_doc_id: "DOC-LEG",
          unit_id: "U-LEG-ADV-001",
          title: "HIPAA Privacy Disclosures",
          proposed_text: "Verbatim HIPAA privacy disclosure text.",
          current_text: null,
          candidate_type: "Script",
          verbatim: 1,
          route_to: "legal",
          owner_team: "Compliance",
          knowledge_base: "KB-SHARED",
          effective_date: "2026-01-01",
          tags_json: "[]",
          proposed_by: "Dana (Knowledge author)",
          proposer_id: "dana",
          status: "proposed",
          reason: null,
          decided_by: null,
          gate_json: null,
          history_json: "[]",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const res = await handleDecideReviewItem(
        {
          draftId: draft.draft_id,
          action: "approve",
          sessionToken: legalSession.token, // Rita holds approve_legal
          notes: "Approved verbatim statement by Legal.",
        },
        repo
      );

      expect(res.ok).toBe(true);
      expect(res.draft?.status).toBe("approved");
      expect(res.draft?.decided_by).toMatch(/Rita \(Legal \/ Compliance approver\)/i);
    });
  });

  describe("6. Authorized standard approval and rejection", () => {
    it("allows Owen to approve an eligible draft proposed by Dana", async () => {
      const [draft] = await repo.createDrafts([
        {
          draft_id: "DRAFT-STD-001",
          candidate_id: null,
          source_doc_id: "DOC-STD",
          unit_id: "U-007",
          title: "Copay Threshold",
          proposed_text: "Copay for Tier 1 is $0.",
          current_text: null,
          candidate_type: "Policy",
          verbatim: 0,
          route_to: "owner",
          owner_team: "Pharmacy Ops",
          knowledge_base: "KB-PHARM",
          effective_date: "2026-01-01",
          tags_json: "[]",
          proposed_by: "Dana (Knowledge author)",
          proposer_id: "dana",
          status: "proposed",
          reason: null,
          decided_by: null,
          gate_json: null,
          history_json: "[]",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const res = await handleDecideReviewItem(
        {
          draftId: draft.draft_id,
          action: "approve",
          sessionToken: ownerSession.token,
          notes: "Approved Tier 1 copay guidance.",
        },
        repo
      );

      expect(res.ok).toBe(true);
      expect(res.draft?.status).toBe("approved");
      expect(res.draft?.decided_by).toMatch(/Owen \(Knowledge owner \(domain\)\)/i);
    });

    it("allows Owen to reject an eligible draft with required notes", async () => {
      const [draft] = await repo.createDrafts([
        {
          draft_id: "DRAFT-STD-002",
          candidate_id: null,
          source_doc_id: "DOC-STD",
          unit_id: "U-008",
          title: "Obsolete Delivery Timeline",
          proposed_text: "Standard delivery 14 days.",
          current_text: null,
          candidate_type: "Policy",
          verbatim: 0,
          route_to: "owner",
          owner_team: "Pharmacy Ops",
          knowledge_base: "KB-PHARM",
          effective_date: "2026-01-01",
          tags_json: "[]",
          proposed_by: "Dana (Knowledge author)",
          proposer_id: "dana",
          status: "proposed",
          reason: null,
          decided_by: null,
          gate_json: null,
          history_json: "[]",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const res = await handleDecideReviewItem(
        {
          draftId: draft.draft_id,
          action: "reject",
          sessionToken: ownerSession.token,
          notes: "Rejected due to obsolete timeframe.",
        },
        repo
      );

      expect(res.ok).toBe(true);
      expect(res.draft?.status).toBe("rejected");
      expect(res.draft?.decided_by).toMatch(/Owen \(Knowledge owner \(domain\)\)/i);
    });
  });

  describe("7. Safe failure on invalid session data", () => {
    it("fails safely when session token is invalid or corrupted", async () => {
      const res = await handleDecideReviewItem(
        {
          draftId: "REV-001",
          action: "approve",
          sessionToken: "invalid_corrupted_token_xyz",
        },
        repo
      );

      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Authentication failed: Invalid or expired session token/i);
    });
  });
});
