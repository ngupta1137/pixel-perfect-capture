import { describe, expect, it } from "vitest";
import { mockSearch } from "@/services/mockData";
import { flagAnswer, getReadBeforeBenefits, recordRead } from "@/services/verity";
import { getDemoState, resetDemoStore } from "@/services/demoStore";

const base = { role: "pharmacy_advocate", channel: "advocate_view" };

describe("Ask upgrade fixtures", () => {
  it("days supply depends on plan year", () => {
    expect(mockSearch({ ...base, query: "days supply", plan_year: "2026" }).outcome).toBe("conflict");
    const y27 = mockSearch({ ...base, query: "days supply", plan_year: "2027" }).parts[0]!;
    expect(y27.text).toBe("Maintenance supply by mail is 84 days.");
    expect(y27.citations[0]?.unit_id).toBe("U-PH-207");
    const unknown = mockSearch({ ...base, query: "how many days", plan_year: null }).parts[0]!;
    expect(unknown.message).toBe("Which plan year: 2026 or 2027?");
    expect(unknown.choices?.map((c) => c.label)).toEqual(["2026", "2027"]);
  });
  it("mail order delivery by year", () => {
    expect(mockSearch({ ...base, query: "mail order delivery", plan_year: "2026" }).parts[0]?.text).toBe("7 to 10 business days after the prescription is received.");
    expect(mockSearch({ ...base, query: "mail order delivery", plan_year: "2027" }).parts[0]?.text).toBe("6 to 9 business days after the prescription is received.");
  });
  it("insurance advocate is told to transfer to Pharmacy", () => {
    expect(mockSearch({ ...base, role: "insurance_advocate", query: "pricing disclaimer" }).parts[0]?.next_step).toBe("Transfer to Pharmacy");
  });
  it("luminexa copay refuses to infer", () => {
    expect(mockSearch({ ...base, query: "luminexa copay" }).parts[0]?.message).toBe("The approved unit gives the tier but does not state a copay.");
  });
  it("read-before-benefits applies to pharmacy advocates, not insurance advocates", () => {
    expect(getReadBeforeBenefits("pharmacy_advocate")?.unit_id).toBe("U-PH-003");
    expect(getReadBeforeBenefits("insurance_advocate")).toBeNull();
  });
  it("read events and flags land in the shared store", () => {
    resetDemoStore();
    recordRead("Priya", "req-1", "U-PH-003");
    expect(getDemoState().readEvents[0]).toMatchObject({ person: "Priya", unit_id: "U-PH-003" });
    expect(flagAnswer("Priya", "req-1", ["U-PH-006"], "wrong").owner).toBe("Owen");
    expect(getDemoState().reviewTasks[0]).toMatchObject({ kind: "flag", owner: "Owen", status: "open" });
    resetDemoStore();
    expect(getDemoState().readEvents).toHaveLength(0);
  });
});
