import { describe, it, expect } from "vitest";
import { freshness } from "@/components/ask/AnswerDetails";

describe("answer freshness", () => {
  const today = new Date("2026-10-09");
  it("marks a future review date current", () =>
    expect(freshness("2027-01-15", today).label).toBe("Current · review by 2027-01-15"));
  it("marks a past review date overdue", () =>
    expect(freshness("2026-01-01", today).label).toBe("Review overdue since 2026-01-01"));
  it("never invents a date when none is recorded", () =>
    expect(freshness(undefined, today).label).toBe("Review date not recorded"));
});
