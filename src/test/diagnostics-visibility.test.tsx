import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OutcomeCard, MatchDiagnosticsSection } from "../components/ask/OutcomeCard";
import { canViewDiagnostics, findPerson } from "../lib/rights";
import type { Part } from "../services/verity";
import { SessionProvider } from "../lib/session";

describe("Match Diagnostics UI & Persona Visibility Suite", () => {
  it("enforces role-based visibility rules for developer/evaluator vs consumer personas", () => {
    const nitin = findPerson("nitin"); // ai_product_owner (platform evaluator)
    const casey = findPerson("casey"); // compliance_auditor (QA evaluator)
    const priya = findPerson("priya"); // pharmacy_advocate (consumer advocate)
    const marcus = findPerson("marcus"); // insurance_advocate (consumer advocate)
    const eleanor = findPerson("eleanor"); // member_chat (self-service member)

    expect(nitin).toBeDefined();
    expect(casey).toBeDefined();
    expect(priya).toBeDefined();
    expect(eleanor).toBeDefined();

    // Developer and evaluator personas CAN view diagnostics
    expect(canViewDiagnostics(nitin!)).toBe(true);
    expect(canViewDiagnostics(casey!)).toBe(true);

    // Frontline advocates and members CANNOT view diagnostics
    expect(canViewDiagnostics(priya!)).toBe(false);
    expect(canViewDiagnostics(marcus!)).toBe(false);
    expect(canViewDiagnostics(eleanor!)).toBe(false);
  });

  it("renders match diagnostics for authorized persona and toggles details", () => {
    const nitin = findPerson("nitin")!;
    const mockPart: Part = {
      part: "main",
      outcome: "answer",
      message: "Dispensing locations",
      text: "Prescriptions are dispensed from our licensed mail-order facility.",
      owner_team: "Pharmacy Ops",
      citations: [
        {
          unit_id: "U-PH-001",
          version: 1,
          title: "CenterWell Pharmacy dispensing locations",
          owner: "Owen (Pharmacy)",
          effective_date: "2026-01-01",
          verbatim: false,
        },
      ],
      match_diagnostics: {
        similarityScore: 0.9523,
        configuredThreshold: 0.85,
        matchingMethod: "embeddings",
        matchedQuestionId: "U-PH-001:q:0",
        ambiguityOutcome: "unambiguous",
        scoreDifference: 0.1245,
      },
    };

    render(
      <SessionProvider initialPerson={nitin}>
        <OutcomeCard part={mockPart} channel="advocate_view" />
      </SessionProvider>
    );

    // Diagnostics button is visible
    const diagToggle = screen.getByLabelText(/Toggle match diagnostics/i);
    expect(diagToggle).toBeInTheDocument();
    expect(screen.getByText(/embeddings · 0.952/i)).toBeInTheDocument();

    // Details are initially collapsed
    expect(screen.queryByTestId("match-diagnostics-details")).not.toBeInTheDocument();

    // Toggle open
    fireEvent.click(diagToggle);

    const details = screen.getByTestId("match-diagnostics-details");
    expect(details).toBeInTheDocument();

    // Verifies actual runtime numbers and labels (NOT labeled as probability or "85% confidence")
    expect(screen.getByText(/0.9523 \(cosine\)/i)).toBeInTheDocument();
    expect(screen.getByText("0.85")).toBeInTheDocument();
    expect(screen.getByText("embeddings")).toBeInTheDocument();
    expect(screen.getByText("unambiguous")).toBeInTheDocument();
    expect(screen.getByText("U-PH-001:q:0")).toBeInTheDocument();
    expect(screen.getByText("0.1245")).toBeInTheDocument();
  });

  it("completely hides match diagnostics from consumer advocate personas", () => {
    const priya = findPerson("priya")!; // pharmacy advocate
    const mockPart: Part = {
      part: "main",
      outcome: "answer",
      message: "Dispensing locations",
      text: "Prescriptions are dispensed from our licensed mail-order facility.",
      owner_team: "Pharmacy Ops",
      citations: [],
      match_diagnostics: {
        similarityScore: 0.9523,
        configuredThreshold: 0.85,
        matchingMethod: "embeddings",
        matchedQuestionId: "U-PH-001:q:0",
        ambiguityOutcome: "unambiguous",
      },
    };

    render(
      <SessionProvider initialPerson={priya}>
        <OutcomeCard part={mockPart} channel="advocate_view" />
      </SessionProvider>
    );

    // Must NOT render toggle or diagnostics container
    expect(screen.queryByLabelText(/Toggle match diagnostics/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("match-diagnostics-container")).not.toBeInTheDocument();
  });

  it("never exposes restricted question text or source metadata for not_authorized outcome", () => {
    const mockDiag: Part["match_diagnostics"] = {
      similarityScore: 0.88,
      configuredThreshold: 0.85,
      matchingMethod: "embeddings",
      matchedQuestionId: "U-IN-001:q:0",
      ambiguityOutcome: "not_applicable",
    };

    render(
      <MatchDiagnosticsSection
        diagnostics={mockDiag}
        outcome="not_authorized"
      />
    );

    const toggle = screen.getByLabelText(/Toggle match diagnostics/i);
    fireEvent.click(toggle);

    // Displays sanitized safe indicator, NOT real internal question id
    expect(screen.getByText(/Restricted \(unauthorized\)/i)).toBeInTheDocument();
    expect(screen.queryByText("U-IN-001:q:0")).not.toBeInTheDocument();
  });
});
