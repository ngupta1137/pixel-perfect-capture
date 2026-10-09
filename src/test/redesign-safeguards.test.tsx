import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { scopedLibrary } from "@/lib/library";
import { findPerson, canOpen } from "@/lib/rights";
import { SessionProvider, useSession } from "@/lib/session";
import { listUnits } from "@/services/verity";
import { mockSearch } from "@/services/mockData";
import { OutcomeCard } from "@/components/ask/OutcomeCard";

describe("redesign entitlement safeguards", () => {
  it("Alex cannot browse units or open the library", () => {
    const alex = findPerson("alex");
    if (!alex) throw new Error("Missing Alex fixture");
    expect(scopedLibrary(listUnits(), alex)).toEqual([]);
    expect(canOpen(alex, "/library")).toBe(false);
  });

  it("Priya's library excludes insurance knowledge", () => {
    const priya = findPerson("priya");
    if (!priya) throw new Error("Missing Priya fixture");
    const units = scopedLibrary(listUnits(), priya);
    expect(units.some(u => u.unit_id === "U-PH-003")).toBe(true);
    expect(units.some(u => u.unit_id === "U-IN-002")).toBe(false);
  });

  it("member approved answers preserve exact text and conceal internal citation metadata", () => {
    const response = mockSearch({ query: "Rx pricing disclaimer", role: "member_chat", channel: "member_chat" });
    const part = response.parts[0];
    if (!part?.text || !part.citations[0]) throw new Error("Missing approved fixture");
    const citation = part.citations[0];
    function MemberResult() {
      const { setPersona } = useSession();
      return <><button onClick={() => setPersona("eleanor")}>Select member</button><OutcomeCard part={part} channel="member_chat" compact /></>;
    }
    const { container } = render(<SessionProvider><MemberResult /></SessionProvider>);
    fireEvent.click(screen.getByText("Select member"));
    expect(screen.getByText(part.text)).toBeInTheDocument();
    expect(container.textContent).not.toContain(citation.unit_id);
    expect(container.textContent).not.toContain(citation.owner);
    expect(container.textContent).not.toContain(`v${citation.version}`);
  });
});