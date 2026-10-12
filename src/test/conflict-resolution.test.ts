import { beforeEach, describe, expect, it } from "vitest";
import {
  searchAs,
  reportConflictForResolution,
  applyConsolidatingConflictResolution,
  submitReviewDecision,
  resetDemo,
} from "../services/verity";
import { getDemoState } from "../services/demoStore";

describe("Scenario 4: Mail Order Days Supply Conflict Resolution Flow", () => {
  beforeEach(async () => {
    await resetDemo();
  });

  it("completes full end-to-end conflict resolution flow across channels", async () => {
    // 1. Pharmacy Advocate asks via typed advocate view -> Conflict
    const resAdvocate = await searchAs("Priya (Pharmacy advocate)", {
      query: "How many days supply can I get by mail?",
      role: "pharmacy_advocate",
      channel: "advocate_view",
      input_mode: "typed",
    });

    expect(resAdvocate.outcome).toBe("conflict");
    const citedUnitsAdvocate = resAdvocate.parts.flatMap((p) => p.citations.map((c) => c.unit_id));
    expect(citedUnitsAdvocate).toContain("U-PH-007");
    expect(citedUnitsAdvocate).toContain("U-PH-107");

    // 1b. Pharmacy Advocate asks via voice channel -> Conflict (voice channel applicability fix verified)
    const resVoice = await searchAs("Priya (Pharmacy advocate)", {
      query: "How many days supply can I get by mail?",
      role: "pharmacy_advocate",
      channel: "voice",
      input_mode: "voice",
    });

    expect(resVoice.outcome).toBe("conflict");
    const citedUnitsVoice = resVoice.parts.flatMap((p) => p.citations.map((c) => c.unit_id));
    expect(citedUnitsVoice).toContain("U-PH-007");
    expect(citedUnitsVoice).toContain("U-PH-107");

    // 2. Advocate clicks "Report for resolution" (optional short note)
    const conflictReport = reportConflictForResolution(
      "Priya (Pharmacy advocate)",
      resAdvocate.request_id,
      "How many days supply can I get by mail?",
      ["U-PH-007", "U-PH-107"],
      "Conflict between 90-day standard and 100-day legacy rule"
    );

    expect(conflictReport.id).toBeDefined();
    expect(conflictReport.unitIds).toEqual(["U-PH-007", "U-PH-107"]);

    // Conflict ticket is recorded in demoStore reviewTasks
    const state = getDemoState();
    const task = state.reviewTasks.find((t) => t.id === conflictReport.id);
    expect(task).toBeDefined();
    expect(task?.kind).toBe("conflict");
    expect(task?.unit_ids).toEqual(["U-PH-007", "U-PH-107"]);

    // 3. Knowledge Ops opens ticket -> applies S04 consolidating source
    const resolutionRes = await applyConsolidatingConflictResolution(
      "Owen (Knowledge owner)",
      "U-PH-007, U-PH-107, KB-PHARM-0142-A, KB-PHARM-0199-B"
    );

    expect(resolutionRes.ok).toBe(true);
    expect(resolutionRes.draftId).toBeDefined();

    // 4. Legal (Rita) approves the consolidated draft unit (maker-checker: Owen proposed, Rita approves)
    const approvalRes = await submitReviewDecision({
      draftId: resolutionRes.draftId!,
      action: "approve",
      notes: "Approved consolidated 90-day maintenance policy superseding conflicting units U-PH-007 and U-PH-107.",
      sessionToken: "vty_sess_demo_rita",
    });

    expect(approvalRes.ok).toBe(true);

    // Verify superseded units marked in demoStore
    const afterState = getDemoState();
    const u7 = afterState.units.find((u) => u.unit_id === "U-PH-007");
    const u107 = afterState.units.find((u) => u.unit_id === "U-PH-107");
    expect(u7?.status).toBe("superseded");
    expect(u107?.status).toBe("superseded");

    // 5. Pharmacy Advocate asks the same question again -> Single cited answer: 90-day only!
    const resResolvedAdvocate = await searchAs("Priya (Pharmacy advocate)", {
      query: "How many days supply can I get by mail?",
      role: "pharmacy_advocate",
      channel: "advocate_view",
      input_mode: "typed",
    });

    expect(resResolvedAdvocate.outcome).toBe("answer");
    expect(resResolvedAdvocate.parts[0]?.text).toMatch(/90-day/i);
    expect(resResolvedAdvocate.parts[0]?.text).toMatch(/100-day extended supply pilot has ended/i);

    // 5b. Voice channel also returns the approved answer
    const resResolvedVoice = await searchAs("Priya (Pharmacy advocate)", {
      query: "How many days supply can I get by mail?",
      role: "pharmacy_advocate",
      channel: "voice",
      input_mode: "voice",
    });

    expect(resResolvedVoice.outcome).toBe("answer");
    expect(resResolvedVoice.parts[0]?.text).toMatch(/90-day/i);
  }, 30000);
});
