// Author page server logic: ingest -> queue -> approval gate -> live on Ask.
import { beforeEach, describe, expect, it } from "vitest";
import { authoringState, decide, ingestSource, proposeCandidates, proposeGap, resetDemo } from "../verity-engine/authoring";
import { serveEngine } from "../verity-engine/server";

const sample = (id: string) => authoringState().samples.find((s) => s.id === id)!.text;
const dana = { name: "Dana (Knowledge author)", role: "author" as const };
const rita = { name: "Rita (Legal)", role: "legal" as const };
const ask = (query: string) => serveEngine({ query, role: "pharmacy_advocate", channel: "advocate_view", lob: "MAPD", state: null } as never);

describe("authoring", () => {
  beforeEach(() => resetDemo());

  it("re-ingesting the approved script flags nothing; the revised one flags exactly two", () => {
    expect(ingestSource(sample("rx-current")).candidates.every((c) => c.status === "unchanged")).toBe(true);
    const r = ingestSource(sample("rx-revised"));
    const flagged = r.candidates.filter((c) => c.status !== "unchanged");
    expect(flagged.map((c) => c.unit_id).sort()).toEqual(["U-PH-003", "U-PH-006"]);
    expect(flagged.find((c) => c.unit_id === "U-PH-003")!.impact).toBe("contradiction");
  });

  it("a new document: copied opening recognized, reworded disclaimer flagged for Legal, new talking point proposed", () => {
    const r = ingestSource(sample("outreach-v4"));
    const by = (re: RegExp) => r.candidates.find((c) => re.test(c.body))!;
    expect(by(/recorded line/).status).toBe("unchanged");
    expect(by(/prices I give you/).status).toBe("changed");
    expect(by(/prices I give you/).route_to).toMatch(/^Legal/);
    expect(by(/automatic refills/).status).toBe("new");
    expect(by(/100-day/).unit_id).toBe("U-PH-107");
  });

  it("the author cannot approve verbatim; Legal rejects it and the approved disclaimer stays live", () => {
    const text = sample("rx-revised");
    const cids = ingestSource(text).candidates.filter((c) => c.status === "changed").map((c) => c.cid);
    const q = proposeCandidates(text, cids);
    expect(q.ok).toBe(true);
    const legalDraft = q.state.queue.find((d) => d.unit_id === "U-PH-003")!;
    expect(legalDraft.route_to).toBe("Legal");
    const denied = decide({ draft_id: legalDraft.draft_id, action: "approve", approver: dana, body: null, reason: null });
    expect(denied.ok).toBe(false);
    expect(denied.error).toMatch(/Legal/);
    expect(decide({ draft_id: legalDraft.draft_id, action: "reject", approver: rita, body: null, reason: "Contradicts approved wording" }).ok).toBe(true);
    expect(ask("rx pricing disclaimer").parts[0]!.text).toMatch(/may change/);
  });

  it("an approved revision is served on the next search", () => {
    const text = sample("rx-revised");
    const cid = ingestSource(text).candidates.find((c) => c.unit_id === "U-PH-006")!.cid;
    const draft = proposeCandidates(text, [cid]).state.queue[0]!;
    const r = decide({ draft_id: draft.draft_id, action: "approve", approver: dana, body: null, reason: null });
    expect(r.message).toMatch(/U-PH-006 v2/);
    expect(ask("how long does mail order delivery take").parts[0]!.text).toMatch(/5 to 7/);
  });

  it("a gap answer needs a person-written body and is invisible until approved", () => {
    expect(proposeGap({ cluster_id: "C01", title: "x", body: " " }).ok).toBe(false);
    const p = proposeGap({ cluster_id: "C01", title: "Specialty (tier 3) drug copay", body: "Specialty and tier 3 drug copays depend on the member plan. Quote only the member-specific amount shown in the pricing tool." });
    expect(p.ok).toBe(true);
    expect(ask("specialty drug copay").parts[0]!.outcome).toBe("insufficient_evidence");
    decide({ draft_id: p.state.queue[0]!.draft_id, action: "approve", approver: dana, body: null, reason: null });
    expect(ask("specialty drug copay").parts[0]!.outcome).toBe("answer");
  });
});
