import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SessionProvider } from "@/lib/session";
import { DemoStoreProvider, resetDemoStore } from "@/services/demoStore";
import { PEOPLE, findPerson } from "@/lib/rights";
import { Route } from "@/routes/work";

const renderWorkPage = (personId = "dana") => {
  const person = findPerson(personId) || PEOPLE[0]!;
  const WorkComponent = Route.options.component!;
  return render(
    <DemoStoreProvider>
      <SessionProvider initialPerson={person}>
        <WorkComponent />
      </SessionProvider>
    </DemoStoreProvider>,
  );
};

describe("Verity Ingest & Drafts Screen", () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it("denies access to consumers (Priya) without ingest_source capability", () => {
    renderWorkPage("priya");

    expect(screen.getByRole("heading", { name: "Access denied" })).toBeInTheDocument();
    expect(screen.getByText(/ingest_source/i)).toBeInTheDocument();
  });

  it("renders page header, subtitle, 4 tabs, and right-side guide rail for authorized authors (Dana)", () => {
    renderWorkPage("dana");

    expect(screen.getByRole("heading", { name: "Ingest source", level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText(/Upload or paste a source document to extract candidate knowledge units/i),
    ).toBeInTheDocument();

    // Tabs
    expect(screen.getByRole("tab", { name: "Sources" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "My drafts" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Gaps" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Insights" })).toBeInTheDocument();

    // Right Guide rail cards
    expect(screen.getByRole("heading", { name: "Ingestion guide", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tips for good sources", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Supported content", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("Need help?")).toBeInTheDocument();
  });

  it("renders 4-step wizard stepper and 2-column upload and metadata cards", () => {
    renderWorkPage("dana");

    // Stepper items
    expect(screen.getByText("Upload source")).toBeInTheDocument();
    expect(screen.getByText("Review & extract")).toBeInTheDocument();
    expect(screen.getByText("Review units")).toBeInTheDocument();
    expect(screen.getByText("Submit for review")).toBeInTheDocument();

    // 2-column headers
    expect(screen.getByRole("heading", { name: "1. Upload or paste a document" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2. Provide basic information" })).toBeInTheDocument();

    // Form inputs
    expect(screen.getByPlaceholderText("Enter a title for this document")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Extract candidate units/i })).toBeInTheDocument();
  });

  it("displays recent uploads table with status badges and format indicators", () => {
    renderWorkPage("dana");

    expect(screen.getByRole("heading", { name: "Recent uploads" })).toBeInTheDocument();
    expect(screen.getByText("Member Services Guide v3.pdf")).toBeInTheDocument();
    expect(screen.getByText("Pharmacy Benefits Policy.docx")).toBeInTheDocument();
    expect(screen.getByText("Mail Order Procedure.pdf")).toBeInTheDocument();
    expect(screen.getByText("Clinical Review Criteria.pptx")).toBeInTheDocument();
    expect(screen.getByText("Formulary Exceptions.txt")).toBeInTheDocument();

    // Statuses
    expect(screen.getAllByText("Extracted").length).toBeGreaterThan(0);
    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("switches input mode to paste content and allows loading sample source", () => {
    renderWorkPage("dana");

    const pasteTabBtn = screen.getByRole("button", { name: "Paste content" });
    fireEvent.click(pasteTabBtn);

    expect(screen.getByLabelText("Source text content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load AEP Sample Policy" })).toBeInTheDocument();
  });

  it("extracts candidate units, displays diffs, guardrails, and allows proposing drafts", async () => {
    renderWorkPage("dana");

    // Click extract candidate units
    const extractBtn = screen.getByRole("button", { name: /Extract candidate units/i });
    fireEvent.click(extractBtn);

    // Wait for candidate review table to render
    await waitFor(
      () => {
        expect(screen.getByText(/Extracted units for/i)).toBeInTheDocument();
      },
      { timeout: 4000 },
    );

    // Check candidate details
    expect(screen.getByText(/Pricing disclaimer \(legacy wording\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Days supply by mail \(2027\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Saturday mail delivery/i)).toBeInTheDocument();
    expect(screen.getByText(/Opening statement/i)).toBeInTheDocument();

    // Check guardrails & route flags
    expect(screen.getAllByText(/Guardrail trigger:/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Route: Needs Legal Review/i)).toBeInTheDocument();

    // Propose selected candidates
    const proposeBtns = screen.getAllByRole("button", { name: /Propose selected/i });
    expect(proposeBtns[0]).toBeEnabled();
    fireEvent.click(proposeBtns[0]);

    // Should switch to My drafts tab and show proposed units
    await waitFor(
      () => {
        expect(screen.getByText(/My active draft proposals/i)).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
  });

  it("tracks drafts in My drafts tab with governance lifecycle", async () => {
    renderWorkPage("dana");

    const draftsTab = screen.getByRole("tab", { name: "My drafts" });
    fireEvent.pointerDown(draftsTab);
    fireEvent.click(draftsTab);

    await waitFor(() => {
      expect(screen.getByText(/No drafts created yet/i)).toBeInTheDocument();
    });
  });

  it("renders Gaps and Insights tabs correctly", async () => {
    renderWorkPage("dana");

    // Gaps tab
    const gapsTab = screen.getByRole("tab", { name: "Gaps" });
    fireEvent.pointerDown(gapsTab);
    fireEvent.click(gapsTab);
    await waitFor(() => {
      expect(screen.getByText(/No unresolved knowledge gaps/i)).toBeInTheDocument();
    });

    // Insights tab
    const insightsTab = screen.getByRole("tab", { name: "Insights" });
    fireEvent.pointerDown(insightsTab);
    fireEvent.click(insightsTab);
    await waitFor(() => {
      expect(screen.getByText(/No question analytics yet/i)).toBeInTheDocument();
    });
  });
});
