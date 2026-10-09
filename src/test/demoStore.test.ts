import { describe, expect, it, vi } from "vitest";
import { getDemoState, resetDemoStore } from "@/services/demoStore";
import { asOf, giveFeedback, replay, searchAs } from "@/services/verity";

vi.stubEnv("VITE_VERITY_ENGINE", "mock");

describe("shared demo store", () => {
  it("records requests from different people in one store and resets to fixtures", async () => {
    resetDemoStore();
    const a = await searchAs("Priya", { query: "Rx pricing disclaimer", role: "pharmacy_advocate", channel: "advocate_view" });
    await searchAs("Marcus", { query: "Rx pricing disclaimer", role: "insurance_advocate", channel: "advocate_view" });
    giveFeedback("Priya", a.request_id, "up");
    expect(getDemoState().requests.map((r) => r.person)).toEqual(["Marcus", "Priya"]);
    expect(replay(a.request_id)?.cited[0]).toMatchObject({ unit_id: "U-PH-003", version: 1, approver: "Rita (Legal)" });
    resetDemoStore();
    expect(getDemoState().requests).toHaveLength(0);
    expect(getDemoState().feedback).toHaveLength(0);
  }, 5000);
  it("asOf returns the version in force on a date", () => {
    expect(asOf("U-SH-002", "2025-12-31")?.version).toBe(1);
    expect(asOf("U-SH-002", "2026-02-01")?.version).toBe(2);
  });
});
