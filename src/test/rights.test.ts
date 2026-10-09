import { describe, expect, it } from "vitest";
import policy from "@/data/personas.json";
import { DEFAULT_PERSON, GROUPS, PEOPLE, canOpen, findPerson, homeRoute, navFor, pageCaps } from "@/lib/rights";

const p = (id: string) => findPerson(id)!;

describe("rights from personas.json", () => {
  it("lists all 14 people in three groups, Priya first", () => {
    expect(PEOPLE).toHaveLength(policy.people.length);
    expect(PEOPLE).toHaveLength(14);
    expect(GROUPS).toEqual(["Consumers", "Authors and approvers", "Governance"]);
    expect(DEFAULT_PERSON.name).toBe("Priya");
  });
  it("advocates land on Ask and cannot open Author", () => {
    expect(homeRoute(p("priya"))).toBe("/");
    expect(canOpen(p("priya"), "/author")).toBe(false);
  });
  it("Rita lands on the Legal queue and has no Ask", () => {
    expect(homeRoute(p("rita"))).toBe("/legal");
    expect(navFor(p("rita")).map((n) => n.to)).not.toContain("/");
  });
  it("Lee reaches Health, Rights and Platform", () => {
    expect(navFor(p("lee")).map((n) => n.to)).toEqual(["/health", "/rights", "/platform"]);
  });
  it("Evals needs view_evals", () => {
    expect(pageCaps("/evals")).toEqual(["view_evals"]);
  });
  it("Eleanor is the member audience", () => {
    expect(PEOPLE.filter((x) => x.memberAudience).map((x) => x.name)).toEqual(["Eleanor"]);
  });
});
