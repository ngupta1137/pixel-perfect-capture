import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { NAV_ITEMS, PEOPLE, canAny, homeRoute, navFor } from "@/lib/rights";
import { MemberReply } from "@/components/ask/MemberReply";
import { mockSearch, toViewPart } from "@/services/mockData";

// Expected navigation per person, taken from UI_SPEC section 1 and personas.json.
const EXPECTED: Record<string, string[]> = {
  Priya: ["Ask", "Rights"],
  Marcus: ["Ask", "Rights"],
  Sam: ["Ask", "Rights"],
  Eleanor: ["Ask", "Rights"],
  "Agent Assist": ["Ask", "Rights"],
  Dana: ["My work", "Needs my review", "Rights"],
  Ian: ["My work", "Needs my review", "Rights"],
  Owen: ["Needs my review", "Rights"],
  Olivia: ["Needs my review", "Rights"],
  Rita: ["Needs my review", "Legal queue", "Rights"],
  Alex: ["Access", "Audit", "Rights"],
  Casey: ["Needs my review", "Access", "Audit", "Evals", "Agents", "Rights"],
  Nitin: ["Access", "Audit", "Evals", "Agents", "Health", "Rights"],
  Lee: ["Health", "Rights"],
};
const HOME: Record<string, string> = {
  Priya: "/", Marcus: "/", Sam: "/", Eleanor: "/", "Agent Assist": "/", Dana: "/work", Ian: "/work",
  Owen: "/review", Olivia: "/review", Rita: "/legal", Alex: "/access", Casey: "/audit", Nitin: "/evals", Lee: "/health",
};

describe("rights-driven shell", () => {
  it("has the 14 demo people", () => expect(PEOPLE).toHaveLength(14));

  it.each(PEOPLE.map((p) => [p.name, p] as const))("%s sees only their views and lands home", (name, p) => {
    expect(navFor(p).map((n) => n.label)).toEqual(EXPECTED[name]);
    expect(homeRoute(p)).toBe(HOME[name]);
    for (const n of NAV_ITEMS) expect(canAny(p, n.caps)).toBe(EXPECTED[name]?.includes(n.label));
  });

  it("opening a route directly without the capability shows the Denied page", async () => {
    window.localStorage.setItem("verity:person", "priya");
    const router = createRouter({
      routeTree,
      context: { queryClient: new QueryClient() },
      history: createMemoryHistory({ initialEntries: ["/legal"] }),
    });
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(screen.getByText("This attempt is recorded in the audit log.")).toBeInTheDocument());
    expect(screen.getByText("approve_legal")).toBeInTheDocument();
  });
});

describe("member chat shows no internal detail", () => {
  const queries = [
    "Rx pricing disclaimer", "closing", "how long does mail take", "ID card replacement", "days supply",
    "shipping fee", "copay", "pricing disclaimer for insurance", "weather", "I have chest pain",
  ];
  it.each(queries)("%s", (query) => {
    const res = mockSearch({ query, role: "member_chat", channel: "member_chat" });
    for (const wire of res.parts) {
      const { container, unmount } = render(
        <MemberReply part={toViewPart(wire)} channel="member_chat" onChooseState={() => {}} onTalk={() => {}} />,
      );
      const text = container.textContent ?? "";
      expect(text).not.toMatch(/U-[A-Z]{2}-\d+/); // unit ids
      expect(text).not.toMatch(/\bv\d+\b/); // versions
      expect(text).not.toMatch(/Compliance|Pharmacy Ops|Outbound Pharmacy|Member Services|KB-/); // owners
      expect(text).not.toMatch(/Next step|Why this answer|How Verity checked|Persist record/); // internal steps, trace
      if (wire.outcome === "answer") expect(text).toContain(wire.text ?? "__missing__");
      unmount();
    }
  });
});
