import { beforeEach, describe, expect, it } from "vitest";
import { getDemoState, resetDemoStore } from "@/services/demoStore";
import { AEP_CANDIDATES } from "@/services/mockData";
import { aepReadiness, decideChainDraft, proposeCandidates, searchAs, startReview } from "@/services/verity";
import { PEOPLE } from "@/lib/rights";

const who = (n: string) => PEOPLE.find((p) => p.name === n)!;
const cand = (cid: string) => AEP_CANDIDATES.find((c) => c.cid === cid)!;

describe("authoring chain", () => {
  beforeEach(() => resetDemoStore());

  it("the author cannot approve their own draft", () => {
    const [d] = proposeCandidates("Dana", [cand("C5")]);
    expect(decideChainDraft(who("Dana"), d!.id, "approve").message).toBe("You proposed this: a second person must decide");
  });

  it("the legacy disclaimer is blocked by the gate and needs a reason to reject", () => {
    const [d] = proposeCandidates("Dana", [cand("C2")]);
    startReview("Rita", d!.id);
    expect(decideChainDraft(who("Rita"), d!.id, "approve").ok).toBe(false);
    expect(decideChainDraft(who("Rita"), d!.id, "reject", "").ok).toBe(false);
    expect(decideChainDraft(who("Rita"), d!.id, "reject", "Contradicts U-PH-003").ok).toBe(true);
  });

  it("Rita publishing 2027 days supply makes Priya's 2027 answer v2 approved by Rita", async () => {
    const before = aepReadiness(getDemoState()).done;
    const [d] = proposeCandidates("Dana", [cand("C5")]);
    startReview("Rita", d!.id);
    expect(decideChainDraft(who("Rita"), d!.id, "approve").ok).toBe(true);
    const u = getDemoState().units.find((x) => x.unit_id === "U-PH-207")!;
    expect(u.versions.at(-1)).toMatchObject({ version: 2, approver: "Rita", effective_date: "2027-01-01" });
    expect(aepReadiness(getDemoState()).done).toBe(before + 1);
    const res = await searchAs("Priya", { query: "how many days supply by mail", role: "pharmacy_advocate", channel: "advocate_view", plan_year: "2027" });
    expect(res.parts[0]!.citations[0]!.version).toBe(2);
    expect(res.parts[0]!.text).toBe(u.versions.at(-1)!.text);
  });
});
