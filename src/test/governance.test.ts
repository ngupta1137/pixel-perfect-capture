import { beforeEach, describe, expect, it } from "vitest";
import { getDemoState, resetDemoStore } from "@/services/demoStore";
import { asOfWindow, changeKbAccess } from "@/services/verity";
import { PEOPLE, canOpen } from "@/lib/rights";

const who = (n: string) => PEOPLE.find((p) => p.name === n)!;

describe("governance", () => {
  beforeEach(() => resetDemoStore());
  it("access changes need a reason and are audited", () => {
    expect(changeKbAccess(who("Alex"), "pharmacy_advocate", "KB-INS", true, "").ok).toBe(false);
    expect(changeKbAccess(who("Alex"), "pharmacy_advocate", "KB-INS", true, "Pilot").ok).toBe(true);
    expect(getDemoState().access["pharmacy_advocate"]).toContain("KB-INS");
    expect(getDemoState().audit[0]).toMatchObject({ actor: "Alex", action: "grant_access", reason: "Pilot" });
  });
  it("only an access administrator can change access", () => {
    expect(changeKbAccess(who("Casey"), "pharmacy_advocate", "KB-INS", true, "x").ok).toBe(false);
    expect(getDemoState().audit[0]?.action).toBe("denied");
  });
  it("everyone can open Rights", () => {
    expect(PEOPLE.every((p) => canOpen(p, "/rights"))).toBe(true);
  });
  it("as-of returns the version live on a date", () => {
    expect(asOfWindow("U-SH-002", "2025-12-01")?.version?.version).toBe(1);
    expect(asOfWindow("U-SH-002", "2025-12-01")?.until).toBe("2026-01-15");
  });
});
