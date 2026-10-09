import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SessionProvider } from "@/lib/session";
import { DemoStoreProvider, resetDemoStore } from "@/services/demoStore";
import { PEOPLE, findPerson } from "@/lib/rights";
import { Route } from "@/routes/work";
import { ReviewExtractWorkspace } from "@/components/ingest/ReviewExtractWorkspace";
import { MEMBER_SERVICES_GUIDE_UNITS } from "@/types/ingest";

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

const renderReviewExtractWorkspace = (personId = "dana") => {
  const person = findPerson(personId) || PEOPLE[0]!;
  return render(
    <DemoStoreProvider>
      <SessionProvider initialPerson={person}>
        <ReviewExtractWorkspace
          documentTitle="Member Services Guide v3.pdf"
          sourceType="Policy"
          lob="MAPD"
          uploadedOn="12 Jan 2024"
          initialUnits={MEMBER_SERVICES_GUIDE_UNITS}
          onBackToIngest={() => {}}
          onReplaceDocument={() => {}}
          onSubmitForReview={() => {}}
        />
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

  it("extracts candidate units and opens Review & Extract 3-column workspace", async () => {
    renderWorkPage("dana");

    // Click extract candidate units
    const extractBtn = screen.getByRole("button", { name: /Extract candidate units/i });
    fireEvent.click(extractBtn);

    // Wait for Review & extract view to render
    await waitFor(
      () => {
        expect(screen.getByRole("heading", { name: "Review & extract", level: 1 })).toBeInTheDocument();
      },
      { timeout: 4000 },
    );

    // Check 3-column elements
    expect(screen.getByRole("heading", { name: "Document preview" })).toBeInTheDocument();
    expect(screen.getByText(/4.2 Copay Assistance Program/i)).toBeInTheDocument();
    expect(screen.getByText(/Extracted candidate units/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Document info" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Unit details" })).toBeInTheDocument();
  });

  it("renders Review & Extract 3-column layout, filters, and unit details editor", () => {
    renderReviewExtractWorkspace("dana");

    // Stepper checks
    expect(screen.getAllByText("Member Services Guide v3.pdf").length).toBeGreaterThan(0);

    // Left column document preview
    expect(screen.getByText("Member Services Guide")).toBeInTheDocument();
    expect(screen.getByText(/4.2 Copay Assistance Program/i)).toBeInTheDocument();
    expect(screen.getByText(/4.3 Mail Order Pharmacy/i)).toBeInTheDocument();

    // Middle column extracted units
    expect(screen.getByText("Copay assistance program overview")).toBeInTheDocument();
    expect(screen.getByText("Eligibility criteria for copay assistance")).toBeInTheDocument();
    expect(screen.getByText("Medications covered under the program")).toBeInTheDocument();
    expect(screen.getByText("Program terms and changes")).toBeInTheDocument();
    expect(screen.getByText("Contact Member Services")).toBeInTheDocument();
    expect(screen.getByText("Mail order pharmacy overview")).toBeInTheDocument();
    expect(screen.getByText("Mail order delivery time")).toBeInTheDocument();
    expect(screen.getByText("Mail order cost information")).toBeInTheDocument();

    // Right column unit details
    expect(screen.getByLabelText("Title")).toHaveValue("Copay assistance program overview");
    expect(screen.getByLabelText("Content")).toBeInTheDocument();
    expect(screen.getByLabelText(/Source reference/i)).toHaveValue("Member Services Guide v3.pdf • Section 4.2");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
  });

  it("selects candidate unit, updates unit details, and saves changes", () => {
    renderReviewExtractWorkspace("dana");

    // Click another unit card in column 2
    const mailOrderCard = screen.getByText("Mail order pharmacy overview");
    fireEvent.click(mailOrderCard);

    // Right column editor should reflect the clicked unit
    expect(screen.getByLabelText("Title")).toHaveValue("Mail order pharmacy overview");

    // Edit the title and content
    const titleInput = screen.getByLabelText("Title");
    fireEvent.change(titleInput, { target: { value: "Mail order pharmacy overview (Updated)" } });

    // Click Save changes
    const saveBtn = screen.getByRole("button", { name: "Save changes" });
    fireEvent.click(saveBtn);

    expect(screen.getByText(/Changes saved successfully/i)).toBeInTheDocument();
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
      expect(screen.getAllByText(/Prior authorization for GLP-1 medications/i).length).toBeGreaterThan(0);
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
