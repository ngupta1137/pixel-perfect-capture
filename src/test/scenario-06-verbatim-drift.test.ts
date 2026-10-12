import { describe, it, expect, beforeEach } from "vitest";
import { handleUploadAndIngest, handleProposeDrafts } from "../services/ingest.server";
import { handleListReviewQueue, handleListMyDrafts } from "../services/review.server";
import { decideBlocker } from "../services/verity";
import { PEOPLE } from "../lib/rights";
import { StorageRepository } from "../storage/repository";
import { calculateSha256 } from "../services/ingestion/hasher";
import { checkChange, hash, normalizeForHash } from "../verity-engine/drift";

describe("Scenario 6: Verbatim Drift Flagging & Deterministic Diff", () => {
  let inMemoryRepo: StorageRepository;

  const s06SourceText = [
    "# Home Delivery Script (REVISED)",
    "KB-PHARM-7800 v2",
    "",
    "## Transition fill (clarified)",
    "Transition fills apply only during the first **90 days** of enrollment and only for eligible non-formulary maintenance drugs.",
    "",
    "## Home delivery pricing disclaimer (verbatim — REVISED)",
    "VERBATIM:",
    '"Any home delivery cost I share today is an estimate under your current benefits and may change with formulary updates, pharmacy choice, or plan changes."',
    "Legal re-approval required before publish.",
  ].join("\n");

  const baselineText =
    "The prices I share today are estimates based on your current plan and may change. Your final cost will be confirmed when your prescription is processed.";
  const revisedText =
    "Any home delivery cost I share today is an estimate under your current benefits and may change with formulary updates, pharmacy choice, or plan changes.";

  beforeEach(() => {
    inMemoryRepo = new StorageRepository();
  });

  it("1. Deterministic hashing and diff calculates exact before/after hashes and flags drift", () => {
    const shaBefore = calculateSha256(Buffer.from(baselineText, "utf-8"));
    const shaAfter = calculateSha256(Buffer.from(revisedText, "utf-8"));

    expect(shaBefore).toHaveLength(64);
    expect(shaAfter).toHaveLength(64);
    expect(shaBefore).not.toBe(shaAfter);

    const hashBefore = hash(baselineText);
    const hashAfter = hash(revisedText);
    expect(hashBefore).not.toBe(hashAfter);

    const change = checkChange(baselineText, revisedText, true);
    expect(change.flag).toBe(true);
    expect(change.route_to).toContain("Legal (verbatim)");
    expect(change.diff.length).toBeGreaterThan(0);
  });

  it("2. Ingestion of S06 revised script flags verbatim drift on pricing disclaimer to Knowledge Author", async () => {
    const ingestRes = await handleUploadAndIngest(
      {
        filename: "S06_source_Home_Delivery_REVISED.md",
        content_text: s06SourceText,
        source_title: "Home Delivery Script (REVISED)",
        scope: "2026",
        sessionToken: "vty_sess_demo_dana",
      },
      inMemoryRepo
    );

    expect(ingestRes.ok).toBe(true);
    expect(ingestRes.units.length).toBeGreaterThan(0);

    // Find the pricing disclaimer candidate
    const disclaimerCandidate = ingestRes.units.find(
      (u) =>
        u.title.toLowerCase().includes("pricing disclaimer") ||
        u.content.toLowerCase().includes("home delivery cost")
    );

    expect(disclaimerCandidate).toBeDefined();
    expect(disclaimerCandidate?.verbatim_drift).toBe(true);
    expect(disclaimerCandidate?.type).toBe("Legal");
    expect(disclaimerCandidate?.route_to).toBe("legal");
    expect(disclaimerCandidate?.matched_unit_id).toBe("U-PH-003");
    expect(disclaimerCandidate?.current_text).toBe(baselineText);
    expect(disclaimerCandidate?.sha256_before).toBeDefined();
    expect(disclaimerCandidate?.sha256_after).toBeDefined();
    expect(disclaimerCandidate?.sha256_before).not.toBe(disclaimerCandidate?.sha256_after);
    expect(disclaimerCandidate?.diff?.length).toBeGreaterThan(0);
  });

  it("3. Proposing draft persists baseline current_text, blocking gate, and routes to Legal", async () => {
    const ingestRes = await handleUploadAndIngest(
      {
        filename: "S06_source_Home_Delivery_REVISED.md",
        content_text: s06SourceText,
        source_title: "Home Delivery Script (REVISED)",
        scope: "2026",
        sessionToken: "vty_sess_demo_dana",
      },
      inMemoryRepo
    );

    const disclaimer = ingestRes.units.find(
      (u) =>
        u.title.toLowerCase().includes("pricing disclaimer") ||
        u.content.toLowerCase().includes("home delivery cost")
    )!;

    const proposeRes = await handleProposeDrafts(
      {
        sourceDocId: ingestRes.doc_id!,
        candidateIds: [disclaimer.id],
        sessionToken: "vty_sess_demo_dana",
        proposerName: "Dana (Knowledge author)",
      },
      inMemoryRepo
    );

    expect(proposeRes.ok).toBe(true);
    expect(proposeRes.drafts).toHaveLength(1);

    const draft = proposeRes.drafts[0]!;
    expect(draft.current_text).toBe(baselineText);
    expect(draft.proposed_text).toContain(revisedText);
    expect(draft.verbatim).toBe(1);
    expect(draft.route_to).toBe("legal");

    const gate = JSON.parse(draft.gate_json || "{}");
    expect(gate.blocking).toContain("verbatim_drift");

    const annotations = JSON.parse(draft.annotations_json || "{}");
    expect(annotations.verbatim_drift).toBe(true);
    expect(annotations.sha256_before).toBeDefined();
    expect(annotations.sha256_after).toBeDefined();
    expect(annotations.sha256_before).not.toBe(annotations.sha256_after);
  });

  it("4. Review queue flags verbatim drift and blocks Knowledge Ops from approving", async () => {
    // Ingest and propose S06
    const ingestRes = await handleUploadAndIngest(
      {
        filename: "S06_source_Home_Delivery_REVISED.md",
        content_text: s06SourceText,
        source_title: "Home Delivery Script (REVISED)",
        scope: "2026",
        sessionToken: "vty_sess_demo_dana",
      },
      inMemoryRepo
    );

    const disclaimer = ingestRes.units.find(
      (u) =>
        u.title.toLowerCase().includes("pricing disclaimer") ||
        u.content.toLowerCase().includes("home delivery cost")
    )!;

    await handleProposeDrafts(
      {
        sourceDocId: ingestRes.doc_id!,
        candidateIds: [disclaimer.id],
        sessionToken: "vty_sess_demo_dana",
        proposerName: "Dana (Knowledge author)",
      },
      inMemoryRepo
    );

    const queue = await handleListReviewQueue(inMemoryRepo);
    const queueItem = queue.find((it) => it.title.toLowerCase().includes("pricing disclaimer"));

    expect(queueItem).toBeDefined();
    expect(queueItem?.verbatim_drift).toBe(true);
    expect(queueItem?.assigned_reviewer).toContain("Rita");
    expect(queueItem?.current_text).toBe(baselineText);
    expect(queueItem?.content).toContain(revisedText);
    expect(queueItem?.drift).toBeDefined();
    expect(queueItem?.drift?.flag).toBe(true);
    expect(queueItem?.drift?.sha256_before).toBeDefined();
    expect(queueItem?.drift?.sha256_after).toBeDefined();
    expect(queueItem?.gate?.blocking).toContain("verbatim_drift");

    // Authority checks:
    const owen = PEOPLE.find((p) => p.name === "Owen")!;
    const rita = PEOPLE.find((p) => p.name === "Rita")!;

    // Owen (Knowledge Ops) cannot approve verbatim drift
    const owenBlock = decideBlocker(owen, {
      id: queueItem!.id,
      cid: queueItem!.id,
      unit_id: queueItem!.unit_id!,
      title: queueItem!.title,
      proposed_text: queueItem!.content,
      current_text: queueItem!.current_text,
      proposed_by: "Dana",
      status: "proposed",
      route: "legal",
      verbatim: true,
      owner_team: "Pharmacy Ops",
      effective_date: queueItem!.suggested_effective_date,
      tags: [],
      gate: null,
      reason: null,
      decided_by: null,
      history: [],
    });
    expect(owenBlock).toBe("Needs Legal: verbatim wording");

    // Rita (Legal Approver) CAN approve verbatim drift
    const ritaBlock = decideBlocker(rita, {
      id: queueItem!.id,
      cid: queueItem!.id,
      unit_id: queueItem!.unit_id!,
      title: queueItem!.title,
      proposed_text: queueItem!.content,
      current_text: queueItem!.current_text,
      proposed_by: "Dana",
      status: "proposed",
      route: "legal",
      verbatim: true,
      owner_team: "Pharmacy Ops",
      effective_date: queueItem!.suggested_effective_date,
      tags: [],
      gate: null,
      reason: null,
      decided_by: null,
      history: [],
    });
    expect(ritaBlock).toBeNull();
  });
});
