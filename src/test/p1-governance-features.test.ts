import { beforeEach, describe, expect, it } from "vitest";
import {
  searchAs,
  resetDemo,
  listSynonyms,
  saveSynonym,
  toggleSynonym,
  confirmCandidateSynonym,
  retirePublishedUnit,
  changeKbAccess,
  resolveGapProcessFix,
  resolveGapUnitCreated,
  getGapDispositionCounts,
  listMergeProposals,
  acceptMergeProposal,
  rejectMergeProposal,
  listSplitSuggestions,
  confirmSplitSuggestion,
  submitReviewDecision,
} from "../services/verity";
import { getDemoState } from "../services/demoStore";

describe("P1 Features: Synonyms, Explicit Retire, Governed Access, Gap Disposition, and Merge/Split", () => {
  beforeEach(async () => {
    await resetDemo();
  });

  // --------------------------------------------------------------------------
  // P1-1: Synonyms / Humana-speak map
  // --------------------------------------------------------------------------
  describe("P1-1: Synonyms / Humana-speak map", () => {
    it("expands acronym/synonym to hit the same unit as the expanded phrase", async () => {
      // 1. Query using expanded phrase
      const expandedRes = await searchAs("Priya (Pharmacy advocate)", {
        query: "mail order setup steps",
        role: "pharmacy_advocate",
        channel: "advocate_view",
      });

      expect(expandedRes.outcome).toBe("answer");
      const expandedCitations = expandedRes.parts.flatMap((p) => p.citations.map((c) => c.unit_id));
      expect(expandedCitations).toContain("U-PH-005");

      // 2. Query using acronym "MO setup steps" (or synonym "home delivery setup steps")
      const synonymRes = await searchAs("Priya (Pharmacy advocate)", {
        query: "home delivery setup steps",
        role: "pharmacy_advocate",
        channel: "advocate_view",
      });

      expect(synonymRes.outcome).toBe("answer");
      const synonymCitations = synonymRes.parts.flatMap((p) => p.citations.map((c) => c.unit_id));
      expect(synonymCitations).toContain("U-PH-005");
      expect(synonymRes.parts[0]?.text).toMatch(/confirm shipping address/i);
    });

    it("audits synonym additions, edits, toggles, and candidate confirmations", async () => {
      // 1. Add new synonym
      await saveSynonym("Owen (Knowledge owner)", {
        term: "formulary exception",
        expansion: "tier exception request",
        category: "humana_speak",
      });

      const stateAfterAdd = getDemoState();
      expect(stateAfterAdd.synonyms.some((s) => s.term === "formulary exception")).toBe(true);
      expect(
        stateAfterAdd.audit.some((a) => a.action === "synonym_created" && a.target === "formulary exception")
      ).toBe(true);

      // 2. Toggle synonym enabled/disabled
      const paSynonym = stateAfterAdd.synonyms.find((s) => s.term.toUpperCase() === "PA");
      expect(paSynonym).toBeDefined();
      await toggleSynonym("Owen (Knowledge owner)", paSynonym!.id, false);

      const stateAfterToggle = getDemoState();
      const updatedPa = stateAfterToggle.synonyms.find((s) => s.id === paSynonym!.id);
      expect(updatedPa?.enabled).toBe(false);
      expect(stateAfterToggle.audit.some((a) => a.action === "synonym_toggled")).toBe(true);

      // 3. Confirm candidate synonym from logs
      const candidate = (stateAfterToggle.candidateSynonyms ?? [])[0];
      if (candidate) {
        await confirmCandidateSynonym("Owen (Knowledge owner)", candidate.id, candidate.suggested_expansion);
        const stateAfterConfirm = getDemoState();
        expect(stateAfterConfirm.audit.some((a) => a.action === "candidate_synonym_confirmed")).toBe(true);
      }
    });

    it("enforces entitlements strictly even after synonym expansion", async () => {
      // Query "pcp change" as pharmacy_advocate (lacks KB-INS entitlement)
      const unauthorizedRes = await searchAs("Priya (Pharmacy advocate)", {
        query: "pcp change",
        role: "pharmacy_advocate",
        channel: "advocate_view",
      });

      // Even though PCP expands to primary care provider, insurance KB units remain inaccessible
      expect(unauthorizedRes.outcome).toBe("not_authorized");
      const citations = unauthorizedRes.parts.flatMap((p) => p.citations.map((c) => c.unit_id));
      expect(citations).not.toContain("U-IN-002");
    });
  });

  // --------------------------------------------------------------------------
  // P1-3: Explicit Retire unit
  // --------------------------------------------------------------------------
  describe("P1-3: Explicit Retire unit", () => {
    it("prevents retired units from ever being cited as answers", async () => {
      // Seeded retired unit U-SH-000 must never be returned
      const state = getDemoState();
      const retiredSeed = state.units.find((u) => u.unit_id === "U-SH-000");
      expect(retiredSeed?.status).toBe("retired");

      // Retire a currently approved unit U-PH-021
      const retireRes = await retirePublishedUnit(
        "Owen (Knowledge owner)",
        "U-PH-021",
        "Legacy copay assistance procedure superseded by 2026 federal guidance."
      );

      expect(retireRes.ok).toBe(true);
      const stateAfterRetire = getDemoState();
      const unit = stateAfterRetire.units.find((u) => u.unit_id === "U-PH-021");
      expect(unit?.status).toBe("retired");

      // Verify retired unit cannot be cited in retrieval
      const searchRes = await searchAs("Priya (Pharmacy advocate)", {
        query: "copay assistance program rules",
        role: "pharmacy_advocate",
        channel: "advocate_view",
      });

      const citedIds = searchRes.parts.flatMap((p) => p.citations.map((c) => c.unit_id));
      expect(citedIds).not.toContain("U-PH-021");
    });

    it("mandates a reason string to retire a unit and records full audit trail", async () => {
      // Attempting to retire without reason must fail
      await expect(
        retirePublishedUnit("Owen (Knowledge owner)", "U-PH-023", "")
      ).rejects.toThrow(/mandatory reason/i);

      // Retiring with valid reason succeeds
      await retirePublishedUnit(
        "Rita (Legal)",
        "U-PH-023",
        "Clinical guidelines retired pending FDA review."
      );

      const state = getDemoState();
      const auditEntry = state.audit.find(
        (a) => a.action === "unit_retired" && a.target === "U-PH-023"
      );
      expect(auditEntry).toBeDefined();
      expect(auditEntry?.actor).toBe("Rita (Legal)");
      expect(auditEntry?.reason).toBe("Clinical guidelines retired pending FDA review.");
      expect(auditEntry?.detail).toContain("Prior status");

      // History remains viewable
      const retiredUnit = state.units.find((u) => u.unit_id === "U-PH-023");
      expect(retiredUnit).toBeDefined();
      expect(retiredUnit?.versions.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // P1-4: Grant / revoke KB access with reason
  // --------------------------------------------------------------------------
  describe("P1-4: Grant / revoke KB access with reason", () => {
    it("immediately revokes retrieval access to a KB with mandatory audit reason", async () => {
      // Initially, Marcus (insurance_advocate) can retrieve KB-INS units
      const initialRes = await searchAs("Marcus (Insurance advocate)", {
        query: "replace id card",
        role: "insurance_advocate",
        channel: "advocate_view",
      });
      expect(initialRes.outcome).toBe("answer");

      // Admin revokes insurance_advocate access to KB-INS
      await changeKbAccess(
        { name: "Amara (Access admin)", capabilities: ["manage_access"] },
        "insurance_advocate",
        "KB-INS",
        false,
        "Quarterly entitlement audit compliance quarantine"
      );

      // Verify audit trail contains access_revoked with reason
      const state = getDemoState();
      const revokeAudit = state.audit.find(
        (a) => a.action === "access_revoked" && a.target === "insurance_advocate/KB-INS"
      );
      expect(revokeAudit).toBeDefined();
      expect(revokeAudit?.reason).toBe("Quarterly entitlement audit compliance quarantine");

      // Subsequent query is immediately blocked with not_authorized
      const afterRevokeRes = await searchAs("Marcus (Insurance advocate)", {
        query: "replace id card",
        role: "insurance_advocate",
        channel: "advocate_view",
      });
      expect(afterRevokeRes.outcome).toBe("not_authorized");
    });

    it("allows retrieval immediately after granting KB access", async () => {
      // Insurance advocate (Marcus) initially cannot query KB-PHARM
      const beforeGrant = await searchAs("Marcus (Insurance advocate)", {
        query: "rx pricing disclaimer",
        role: "insurance_advocate",
        channel: "advocate_view",
      });
      expect(beforeGrant.outcome).toBe("not_authorized");

      // Admin grants insurance_advocate access to KB-PHARM
      await changeKbAccess(
        { name: "Amara (Access admin)", capabilities: ["manage_access"] },
        "insurance_advocate",
        "KB-PHARM",
        true,
        "Temporary cross-domain cross-training pilot"
      );

      // Subsequent query immediately retrieves published KB-PHARM answer
      const afterGrant = await searchAs("Marcus (Insurance advocate)", {
        query: "rx pricing disclaimer",
        role: "insurance_advocate",
        channel: "advocate_view",
      });
      expect(afterGrant.outcome).toBe("answer");
      expect(afterGrant.parts[0]?.text).toMatch(/prices I share today are estimates/i);
    });

    it("prevents AI actor from granting or modifying access permissions", async () => {
      await expect(
        changeKbAccess(
          { name: "Verity AI Extractor", persona: "ai_bot" as any, capabilities: ["manage_access"] },
          "member",
          "KB-PHARM",
          true,
          "Automated privilege elevation attempt"
        )
      ).rejects.toThrow(/AI cannot grant or revoke access/i);
    });
  });

  // --------------------------------------------------------------------------
  // P1-5: Gap disposition — unit vs process fix
  // --------------------------------------------------------------------------
  describe("P1-5: Gap disposition — unit vs process fix", () => {
    it("closes a gap as a process fix without creating a unit and updates counts", async () => {
      const initialCounts = getGapDispositionCounts();

      // Close GAP-001 as a process fix with mandatory reason and system note
      const res = resolveGapProcessFix(
        "Owen (Knowledge owner)",
        "GAP-001",
        "Specialty medications must route through Specialty Pharmacy Call Center IVR queue #4.",
        "Jira TICKET-OPS-912"
      );

      expect(res.ok).toBe(true);
      const state = getDemoState();
      const disposition = state.gapDispositions?.["GAP-001"];
      expect(disposition).toBeDefined();
      expect(disposition?.disposition).toBe("process_fix");
      expect(disposition?.reason).toContain("Specialty Pharmacy Call Center");
      expect(disposition?.system_note).toBe("Jira TICKET-OPS-912");

      // Verify audit recorded disposition
      const gapAudit = state.audit.find(
        (a) => a.action === "gap_disposition" && a.target === "GAP-001"
      );
      expect(gapAudit).toBeDefined();
      expect(gapAudit?.detail).toContain("Process fix");

      // Verify analytics counts updated
      const updatedCounts = getGapDispositionCounts();
      expect(updatedCounts.processFix).toBe(initialCounts.processFix + 1);
    });

    it("supports closing a gap as unit_created while preserving draft flow", () => {
      const initialCounts = getGapDispositionCounts();

      const res = resolveGapUnitCreated(
        "Owen (Knowledge owner)",
        "GAP-002",
        "D-GAP-002"
      );

      expect(res.ok).toBe(true);
      const state = getDemoState();
      const disposition = state.gapDispositions?.["GAP-002"];
      expect(disposition?.disposition).toBe("unit_created");

      const updatedCounts = getGapDispositionCounts();
      expect(updatedCounts.unitCreated).toBe(initialCounts.unitCreated + 1);
    });
  });

  // --------------------------------------------------------------------------
  // P1-2: Merge / split suggestions
  // --------------------------------------------------------------------------
  describe("P1-2: Merge / split suggestions", () => {
    it("displays merge proposals for near-duplicates and requires normal approval upon acceptance", async () => {
      const proposals = listMergeProposals();
      expect(proposals.length).toBeGreaterThan(0);

      const mergeProposal = proposals.find((p) => p.id === "MERGE-01");
      expect(mergeProposal).toBeDefined();
      expect(mergeProposal?.similarity).toBeGreaterThanOrEqual(0.8);
      expect(mergeProposal?.status).toBe("pending");

      // Author accepts merge proposal -> creates draft in review queue, does NOT auto-publish
      const acceptRes = await acceptMergeProposal("Owen (Knowledge owner)", "MERGE-01");
      expect(acceptRes.ok).toBe(true);
      expect(acceptRes.draft_id).toBeDefined();

      const state = getDemoState();
      const draft = state.chainDrafts.find((d) => d.id === acceptRes.draft_id);
      expect(draft).toBeDefined();
      expect(draft?.status).toBe("proposed"); // Standard maker-checker review required
      expect(draft?.tags).toContain("merged");

      // Verify proposal marked accepted
      const updatedProposal = state.mergeProposals?.find((p) => p.id === "MERGE-01");
      expect(updatedProposal?.status).toBe("accepted");

      // Normal approval path: approver reviews and signs off
      const approvalRes = await submitReviewDecision({
        draftId: acceptRes.draft_id!,
        action: "approve",
        notes: "Approved merge of near-duplicate units.",
        sessionToken: "vty_sess_demo_rita",
      });
      expect(approvalRes.ok).toBe(true);
    });

    it("rejecting merge proposal leaves units unchanged", () => {
      const initialUnits = getDemoState().units;

      const rejectRes = rejectMergeProposal(
        "Owen (Knowledge owner)",
        "MERGE-01",
        "These units cover distinct policy years and should not be merged."
      );

      expect(rejectRes.ok).toBe(true);
      const state = getDemoState();
      const proposal = state.mergeProposals?.find((p) => p.id === "MERGE-01");
      expect(proposal?.status).toBe("rejected");
      expect(proposal?.decided_by).toBe("Owen (Knowledge owner)");

      // Audit recorded rejection
      const auditEntry = state.audit.find(
        (a) => a.action === "merge_rejected" && a.target === "MERGE-01"
      );
      expect(auditEntry).toBeDefined();

      // Original units unchanged
      expect(state.units.length).toBe(initialUnits.length);
    });

    it("confirms split suggestions into multiple candidate drafts for human review", async () => {
      const splits = listSplitSuggestions();
      expect(splits.length).toBeGreaterThan(0);

      const split = splits.find((s) => s.id === "SPLIT-01");
      expect(split).toBeDefined();
      expect(split?.candidate_splits.length).toBe(2);

      // Confirm split
      const confirmRes = await confirmSplitSuggestion("Owen (Knowledge owner)", "SPLIT-01");
      expect(confirmRes.ok).toBe(true);
      expect(confirmRes.draft_ids.length).toBe(2);

      const state = getDemoState();
      // Candidate drafts were created with status="proposed" (no auto-publish)
      for (const draftId of confirmRes.draft_ids) {
        const draft = state.chainDrafts.find((d) => d.id === draftId);
        expect(draft).toBeDefined();
        expect(draft?.status).toBe("proposed");
      }

      // Proposal status updated to accepted
      const updatedSplit = state.splitSuggestions?.find((s) => s.id === "SPLIT-01");
      expect(updatedSplit?.status).toBe("accepted");
    });
  });
});
