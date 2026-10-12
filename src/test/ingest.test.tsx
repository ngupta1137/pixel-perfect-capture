import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SessionProvider } from "@/lib/session";
import { DemoStoreProvider, resetDemoStore } from "@/services/demoStore";
import { PEOPLE, findPerson } from "@/lib/rights";
import { Route } from "@/routes/work";
import { ReviewExtractWorkspace } from "@/components/ingest/ReviewExtractWorkspace";
import { MEMBER_SERVICES_GUIDE_UNITS } from "@/types/ingest";
import * as verityServices from "@/services/verity";

vi.mock("@tanstack/react-router", async (orig) => ({
  ...(await orig<typeof import("@tanstack/react-router")>()),
  useRouterState: ({ select }: { select?: (s: any) => any } = {}) => {
    const state = { location: { search: {}, pathname: "/work" } };
    return select ? select(state) : state;
  },
  useNavigate: () => vi.fn(),
}));

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
          documentTitle="S01_source_Rx_Education_Script_Mail_Order_2026.docx"
          sourceType="Policy"
          lob="MAPD"
          uploadedOn="12 Oct 2026"
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
    expect(screen.getByText("S01_source_Rx_Education_Script_Mail_Order_2026.docx")).toBeInTheDocument();
    expect(screen.getByText("S02_source_Insurance_Benefits_Snippet_2026.docx")).toBeInTheDocument();
    expect(screen.getByText("S04_source_A_Mail_Order_90_day.docx")).toBeInTheDocument();
    expect(screen.getByText("S04_source_B_Mail_Order_100_day_pilot.docx")).toBeInTheDocument();
    expect(screen.getByText("S05_source_Kentucky_Copay_Assistance.docx")).toBeInTheDocument();

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
    vi.spyOn(verityServices, "uploadAndIngestSource").mockResolvedValueOnce({
      ok: true,
      filename: "S01_source_Rx_Education_Script_Mail_Order_2026.docx",
      doc_id: "SRC-S01-001",
      units: MEMBER_SERVICES_GUIDE_UNITS.map((u) => ({
        id: u.id,
        cid: u.cid || "C1",
        title: u.title,
        type: u.type,
        content: u.content,
        key_points: u.key_points,
        source_reference: u.source_reference,
        suggested_effective_date: u.suggested_effective_date,
        match_status: "new",
      })),
    } as any);

    renderWorkPage("dana");

    // Click extract candidate units
    const extractBtn = screen.getByRole("button", { name: /Extract candidate units/i });
    fireEvent.click(extractBtn);

    // Wait for Review & extract view to render
    await waitFor(
      () => {
        expect(screen.getByRole("heading", { name: "Review & extract", level: 1 })).toBeInTheDocument();
      },
      { timeout: 8000 },
    );

    // Check 3-column elements
    expect(screen.getByRole("heading", { name: "Document preview" })).toBeInTheDocument();
    expect(screen.getAllByText(/1. 90-Day Mail-Order Supply Eligibility/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Extracted candidate units/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Document info" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Unit details" })).toBeInTheDocument();
  });

  it("renders Review & Extract 3-column layout, filters, and unit details editor", () => {
    renderReviewExtractWorkspace("dana");

    // Stepper checks
    expect(screen.getAllByText("S01_source_Rx_Education_Script_Mail_Order_2026.docx").length).toBeGreaterThan(0);

    // Left column document preview
    expect(screen.getByText("1. 90-Day Mail-Order Supply Eligibility")).toBeInTheDocument();

    // Middle column extracted units
    expect(screen.getByText("1. 90-day mail-order supply eligibility")).toBeInTheDocument();
    expect(screen.getByText("2. Member cost-share language")).toBeInTheDocument();
    expect(screen.getByText("3. Prior authorization note")).toBeInTheDocument();
    expect(screen.getByText("4. Pricing disclaimer (Legal verbatim)")).toBeInTheDocument();
    expect(screen.getByText("5. Closing guidance")).toBeInTheDocument();

    // Right column unit details
    expect(screen.getByLabelText("Title")).toHaveValue("1. 90-day mail-order supply eligibility");
    expect(screen.getByLabelText("Content")).toBeInTheDocument();
    expect(screen.getByLabelText(/Source reference/i)).toHaveValue("S01_source_Rx_Education_Script_Mail_Order_2026.docx • Section 1");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
  });

  it("selects candidate unit, updates unit details, and saves changes", () => {
    renderReviewExtractWorkspace("dana");

    // Click another unit card in column 2
    const mailOrderCard = screen.getByText("2. Member cost-share language");
    fireEvent.click(mailOrderCard);

    // Right column editor should reflect the clicked unit
    expect(screen.getByLabelText("Title")).toHaveValue("2. Member cost-share language");

    // Edit the title and content
    const titleInput = screen.getByLabelText("Title");
    fireEvent.change(titleInput, { target: { value: "2. Member cost-share language (Updated)" } });

    // Click Save changes
    const saveBtn = screen.getByRole("button", { name: "Save changes" });
    fireEvent.click(saveBtn);

    expect(screen.getByText(/Changes saved successfully/i)).toBeInTheDocument();
  });

  it("tracks drafts in My drafts tab with governance lifecycle", async () => {
    vi.spyOn(verityServices, "fetchMyDrafts").mockResolvedValueOnce([
      {
        draft_id: "DRAFT-001",
        candidate_id: "CAND-001",
        unit_id: "U-PH-001",
        source_doc_id: "SRC-001",
        title: "90-day mail-order supply eligibility",
        proposed_text: "Members can get up to 90 days supply.",
        current_text: null,
        candidate_type: "Policy",
        verbatim: 0,
        route_to: "owner",
        owner_team: "Pharmacy Ops",
        knowledge_base: "KB-PHARM",
        effective_date: "2026-01-01",
        status: "proposed",
        proposed_by: "Dana (Knowledge author)",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags_json: "[]",
        history_json: "[]",
        reason: null,
        decided_by: null,
        decided_at: null,
        supersedes: null,
        duplicate_of: null,
        version: 1,
        version_id: null,
      } as any,
    ]);

    renderWorkPage("dana");

    const draftsTab = screen.getByRole("tab", { name: "My drafts" });
    fireEvent.pointerDown(draftsTab);
    fireEvent.click(draftsTab);

    await waitFor(() => {
      expect(
        screen.queryByText(/My active draft proposals/i) ||
        screen.queryByText(/No drafts created yet/i)
      ).toBeInTheDocument();
    });
  });

  it("renders Gaps and Insights tabs correctly", async () => {
    renderWorkPage("dana");

    // Gaps tab
    const gapsTab = screen.getByRole("tab", { name: "Gaps" });
    fireEvent.pointerDown(gapsTab);
    fireEvent.click(gapsTab);
    await waitFor(() => {
      expect(screen.getAllByText(/Specialty and oncology medication mail-order delivery/i).length).toBeGreaterThan(0);
    });

    // Insights tab
    const insightsTab = screen.getByRole("tab", { name: "Insights" });
    fireEvent.pointerDown(insightsTab);
    fireEvent.click(insightsTab);
    await waitFor(() => {
      expect(screen.getByText(/No question analytics yet/i)).toBeInTheDocument();
    });
  });

  describe("Ingestion error handling & regression tests", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("handles successful extraction with units", async () => {
      vi.spyOn(verityServices, "uploadAndIngestSource").mockResolvedValueOnce({
        ok: true,
        units: [
          {
            id: "UNIT-CUSTOM-1",
            cid: "C1",
            title: "Custom Policy Rule",
            type: "Policy",
            content: "Policy statement content for test.",
            key_points: ["Key point 1"],
            source_reference: "Test Doc • Section 1",
            suggested_effective_date: "2026-01-01",
            match_status: "new",
          },
        ],
        filename: "test-policy.txt",
        doc_id: "DOC-123",
      } as any);

      renderWorkPage("dana");
      const extractBtn = screen.getByRole("button", { name: /Extract candidate units/i });
      fireEvent.click(extractBtn);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Review & extract", level: 1 })).toBeInTheDocument();
      });
      expect(screen.getByText("Custom Policy Rule")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("handles unsuccessful ingestion response containing a server error without crashing", async () => {
      const serverErrorMessage = "Database connection failed: disk I/O error or readonly filesystem";
      vi.spyOn(verityServices, "uploadAndIngestSource").mockResolvedValueOnce({
        ok: false,
        error: serverErrorMessage,
      } as any);

      renderWorkPage("dana");
      const extractBtn = screen.getByRole("button", { name: /Extract candidate units/i });
      fireEvent.click(extractBtn);

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent(serverErrorMessage);
      });

      // Does not navigate to Review & extract workspace
      expect(screen.queryByRole("heading", { name: "Review & extract", level: 1 })).not.toBeInTheDocument();
      // Remained on Ingest source step
      expect(screen.getByRole("heading", { name: "Ingest source", level: 1 })).toBeInTheDocument();
    });

    it("handles a successful response with missing or invalid units array without .map() error", async () => {
      // Simulate an invalid response where ok is true but units is missing / undefined
      vi.spyOn(verityServices, "uploadAndIngestSource").mockResolvedValueOnce({
        ok: true,
        units: undefined as any,
      } as any);

      renderWorkPage("dana");
      const extractBtn = screen.getByRole("button", { name: /Extract candidate units/i });
      fireEvent.click(extractBtn);

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent(/No candidate units could be extracted/i);
      });

      // Does not crash or transition to invalid workspace
      expect(screen.queryByRole("heading", { name: "Review & extract", level: 1 })).not.toBeInTheDocument();
    });

    it("displays a useful error in the UI instead of throwing a .map() TypeError", async () => {
      const dbError = "SQLite error: cannot open database file in /data/verity.db";
      vi.spyOn(verityServices, "uploadAndIngestSource").mockResolvedValueOnce({
        ok: false,
        error: dbError,
      } as any);

      renderWorkPage("dana");
      const extractBtn = screen.getByRole("button", { name: /Extract candidate units/i });
      
      // Clicking extract button should not throw any unhandled TypeError
      expect(() => fireEvent.click(extractBtn)).not.toThrow();

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert).toBeInTheDocument();
        expect(alert.textContent).toBe(dbError);
      });
      // The button should be re-enabled after failure
      expect(screen.getByRole("button", { name: /Extract candidate units/i })).toBeEnabled();
    });
  });
});

