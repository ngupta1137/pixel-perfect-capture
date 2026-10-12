import { beforeEach, describe, expect, it } from "vitest";
import {
  searchAs,
  reportConflictForResolution,
  resolveConflictBySuperseding,
  submitReviewDecision,
  reverifyUnit,
  resetDemo,
} from "../services/verity";
import { getDemoState } from "../services/demoStore";

describe("P0 Features: Conflict Resolution, Stale Enforcement, and Change Propagation", () => {
  beforeEach(async () => {
    await resetDemo();
  });

  describe("P0-1: Conflict resolution workflow (end-to-end)", () => {
    it("detects conflict, files structured ticket, resolves via superseding, and verifies clean single answer", async () => {
      // 1. On outcome=conflict, shows both units; model does not pick a winner
      const initialRes = await searchAs("Priya (Pharmacy advocate)", {
        query: "how many days supply by mail",
        role: "pharmacy_advocate",
        channel: "advocate_view",
      });

      expect(initialRes.outcome).toBe("conflict");
      const unitIds = initialRes.parts.flatMap((p) => p.citations.map((c) => c.unit_id));
      expect(unitIds).toContain("U-PH-007");
      expect(unitIds).toContain("U-PH-107");
      expect(initialRes.parts[0]?.text).toBeNull(); // No winner chosen

      // 2. Creating a report writes a visible ticket with query, role, timestamp, versions, unit_ids
      const ticketReport = reportConflictForResolution(
        "Priya (Pharmacy advocate)",
        initialRes.request_id,
        "how many days supply by mail",
        ["U-PH-007", "U-PH-107"],
        "Advocate reported 90 vs 100 days supply discrepancy",
        [1, 3],
        "pharmacy_advocate"
      );

      expect(ticketReport.id).toMatch(/^CONF-/);
      const state = getDemoState();
      const task = state.reviewTasks.find((t) => t.id === ticketReport.id);
      expect(task).toBeDefined();
      expect(task?.status).toBe("open");
      expect(task?.unit_ids).toEqual(["U-PH-007", "U-PH-107"]);
      expect(task?.query).toBe("how many days supply by mail");
      expect(task?.role).toBe("pharmacy_advocate");
      expect(task?.versions).toEqual([1, 3]);

      // Verify audit log has report_conflict event
      expect(state.audit.some((a) => a.action === "report_conflict")).toBe(true);

      // 3. Knowledge Owner marks U-PH-007 authoritative and supersedes U-PH-107
      const supersedeRes = await resolveConflictBySuperseding(
        "Owen (Knowledge owner)",
        "U-PH-007",
        ["U-PH-107"],
        ticketReport.id,
        "Designated 90-day standard U-PH-007 authoritative; retired legacy 100-day pilot U-PH-107."
      );

      expect(supersedeRes.ok).toBe(true);
      expect(supersedeRes.draftId).toBeDefined();

      // Verify audit log recorded supersede
      const stateAfterSupersede = getDemoState();
      expect(stateAfterSupersede.audit.some((a) => a.action === "supersede_unit")).toBe(true);

      // 4. Approval sign-off: Rita approves the draft designating U-PH-007
      const approvalRes = await submitReviewDecision({
        draftId: supersedeRes.draftId!,
        action: "approve",
        notes: "Approved authoritative resolution: U-PH-007 in force, U-PH-107 retired.",
        sessionToken: "vty_sess_demo_rita",
      });

      expect(approvalRes.ok).toBe(true);

      // Verify loser unit U-PH-107 is marked superseded in store
      const stateAfterApproval = getDemoState();
      const loserUnit = stateAfterApproval.units.find((u) => u.unit_id === "U-PH-107");
      expect(loserUnit?.status).toBe("superseded");

      // 5. Re-query by original advocate role returns a SINGLE answer (superseded unit excluded)
      const afterRes = await searchAs("Priya (Pharmacy advocate)", {
        query: "how many days supply by mail",
        role: "pharmacy_advocate",
        channel: "advocate_view",
      });

      expect(afterRes.outcome).toBe("answer");
      const afterCitations = afterRes.parts.flatMap((p) => p.citations.map((c) => c.unit_id));
      expect(afterCitations).toContain("U-PH-007");
      expect(afterCitations).not.toContain("U-PH-107");
      expect(afterRes.parts[0]?.text).toMatch(/90-day/i);

      // 6. Audit shows who resolved and which units changed
      const publishAudit = stateAfterApproval.audit.find((a) => a.action === "unit.published");
      expect(publishAudit).toBeDefined();
    }, 30000);
  });

  describe("P0-2: Stale / review-due enforcement at serve time", () => {
    it("blocks stale units past review_date from clean answer, restores upon confirm still valid", async () => {
      // 1. U-PH-008 has review_date 2026-06-30 (< asOf 2026-10-06)
      const initialStaleRes = await searchAs("Priya (Pharmacy advocate)", {
        query: "is there a shipping fee for mail order",
        role: "pharmacy_advocate",
        channel: "advocate_view",
      });

      // Stale unit must NOT be returned as a clean answer
      expect(initialStaleRes.outcome).toBe("stale");
      expect(initialStaleRes.parts[0]?.citations[0]?.unit_id).toBe("U-PH-008");
      expect(initialStaleRes.parts[0]?.message).toMatch(/past its review date/i);

      // 2. Owner/Author confirms still valid -> extends review_date (+12 months)
      await reverifyUnit("Owen (Knowledge owner)", "U-PH-008", "2027-10-06");

      const stateAfterReverify = getDemoState();
      const reverifiedUnit = stateAfterReverify.units.find((u) => u.unit_id === "U-PH-008");
      expect(reverifiedUnit?.status).toBe("approved");

      // Verify audit recorded confirm_still_valid
      const auditEntry = stateAfterReverify.audit.find(
        (a) => a.action === "confirm_still_valid" && a.target === "U-PH-008"
      );
      expect(auditEntry).toBeDefined();
      expect(auditEntry?.detail).toMatch(/2027-10-06/);

      // 3. Re-query immediately returns clean answer with no server restart
      const restoredRes = await searchAs("Priya (Pharmacy advocate)", {
        query: "is there a shipping fee for mail order",
        role: "pharmacy_advocate",
        channel: "advocate_view",
      });

      expect(restoredRes.outcome).toBe("answer");
      expect(restoredRes.parts[0]?.citations[0]?.unit_id).toBe("U-PH-008");
      expect(restoredRes.parts[0]?.text).toMatch(/standard shipping for mail order is at no extra cost/i);
    }, 30000);
  });

  describe("P0-3: Change propagation on publish", () => {
    it("emits in-app publish signal with notified subscriber channels and invalidates cache", async () => {
      // 1. Propose and approve a draft
      const supersedeRes = await resolveConflictBySuperseding(
        "Owen (Knowledge owner)",
        "U-PH-007",
        ["U-PH-107"],
        undefined,
        "Resolving mail order conflict"
      );

      const approvalRes = await submitReviewDecision({
        draftId: supersedeRes.draftId!,
        action: "approve",
        notes: "Approved authoritative draft",
        sessionToken: "vty_sess_demo_rita",
      });

      expect(approvalRes.ok).toBe(true);

      const state = getDemoState();
      // 2. In-app signal emitted
      expect(state.latestPublishSignal).toBeDefined();
      expect(state.latestPublishSignal?.unit_id).toBe("U-PH-007");
      expect(state.latestPublishSignal?.channels).toEqual(
        expect.arrayContaining(["Agent Assist", "Member Chat", "IVR Voice Bot", "Advocate Portal"])
      );

      // 3. Audit event unit.published recorded
      const publishEvent = state.audit.find((a) => a.action === "unit.published");
      expect(publishEvent).toBeDefined();
      expect(publishEvent?.target).toContain("U-PH-007");
      expect(publishEvent?.detail).toContain("Notified channels");

      // 4. Consumer immediately searches and gets new version without server restart
      const searchRes = await searchAs("Priya (Pharmacy advocate)", {
        query: "how many days supply by mail",
        role: "pharmacy_advocate",
        channel: "advocate_view",
      });

      expect(searchRes.outcome).toBe("answer");
      expect(searchRes.parts[0]?.citations.some((c) => c.unit_id === "U-PH-007")).toBe(true);
      expect(searchRes.parts[0]?.citations.some((c) => c.unit_id === "U-PH-107")).toBe(false);
    }, 30000);
  });
});
