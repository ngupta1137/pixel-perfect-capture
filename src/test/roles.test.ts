import { describe, it, expect } from "vitest";
import { DEMO_ROLES, peopleForRole } from "@/lib/roles";
import { can } from "@/lib/rights";

const role = (id: string) => DEMO_ROLES.find((r) => r.id === id)!;

describe("demo entry roles", () => {
  it("offers exactly four roles", () => expect(DEMO_ROLES).toHaveLength(4));
  it("every role offers at least one person", () => {
    for (const r of DEMO_ROLES) expect(peopleForRole(r).length).toBeGreaterThan(0);
  });
  it("authors can all ingest or propose", () => {
    for (const p of peopleForRole(role("author")))
      expect(can(p, "ingest_source") || can(p, "propose_unit")).toBe(true);
  });
  it("consumers hold no approval capability", () => {
    for (const p of peopleForRole(role("consumer")))
      expect(can(p, "approve_standard") || can(p, "approve_legal")).toBe(false);
  });
});
