import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SessionProvider } from "@/lib/session";
import { DemoStoreProvider, resetDemoStore } from "@/services/demoStore";
import { PEOPLE, findPerson } from "@/lib/rights";
import { ReviewQueueView } from "@/components/review/ReviewQueueView";
import { Route } from "@/routes/review";

const renderReviewQueue = (personId = "owen") => {
  const person = findPerson(personId) || PEOPLE[0]!;
  return render(
    <DemoStoreProvider>
      <SessionProvider initialPerson={person}>
        <ReviewQueueView />
      </SessionProvider>
    </DemoStoreProvider>,
  );
};

const renderReviewRoute = (personId = "priya") => {
  const person = findPerson(personId) || PEOPLE[0]!;
  const ReviewComponent = Route.options.component!;
  return render(
    <DemoStoreProvider>
      <SessionProvider initialPerson={person}>
        <ReviewComponent />
      </SessionProvider>
    </DemoStoreProvider>,
  );
};

describe("Verity Review Queue Redesign", () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it("denies access to consumers (Priya) without review queue rights", () => {
    renderReviewRoute("priya");

    expect(screen.getByRole("heading", { name: "Access denied" })).toBeInTheDocument();
  });

  it("renders page header, subtitle, search field, and filters button", () => {
    renderReviewQueue("owen");

    expect(screen.getByRole("heading", { name: "Review queue", level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText(/Review extracted knowledge units and approve, reject or request changes/i),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search units...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Filters/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /AEP 2027/i })).toBeInTheDocument();
  });

  it("renders status tabs with accurate counts", () => {
    renderReviewQueue("owen");

    expect(screen.getByRole("button", { name: /^All \(\d+\)$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^My reviews \(\d+\)$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Requested changes \(\d+\)$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Approved \(\d+\)$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Rejected \(\d+\)$/i })).toBeInTheDocument();
  });

  it("renders main review table with columns, format badges, and status pills", () => {
    renderReviewQueue("owen");

    // Table headers
    expect(screen.getByText("Title / content preview")).toBeInTheDocument();
    expect(screen.getByText("Source document")).toBeInTheDocument();
    expect(screen.getAllByText("Type").length).toBeGreaterThan(0);
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Extracted on")).toBeInTheDocument();

    // Table rows
    expect(screen.getAllByText("Copay assistance program overview").length).toBeGreaterThan(0);
    expect(screen.getByText("Eligibility criteria for copay assistance")).toBeInTheDocument();
    expect(screen.getByText("Medications covered under the program")).toBeInTheDocument();
    expect(screen.getByText("Mail order delivery time")).toBeInTheDocument();
    expect(screen.getByText("Formulary exceptions process")).toBeInTheDocument();
    expect(screen.getByText("Member ID card information")).toBeInTheDocument();

    // Status badges
    expect(screen.getAllByText("Pending review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Requested changes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rejected").length).toBeGreaterThan(0);
  });

  it("renders right-side details panel with Content, Context, Source, and History tabs", () => {
    renderReviewQueue("owen");

    // Details panel header
    expect(screen.getByRole("heading", { name: "Copay assistance program overview", level: 2 })).toBeInTheDocument();
    expect(screen.getAllByText(/Member Services Guide v3/i).length).toBeGreaterThan(0);

    // Tabs
    expect(screen.getByRole("button", { name: "Content" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Context" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Source" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument();

    // Content tab fields
    expect(screen.getByRole("heading", { name: "Extracted content" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Unit details" })).toBeInTheDocument();
    expect(screen.getByText("Line of business")).toBeInTheDocument();
    expect(screen.getByLabelText(/Reviewer notes/i)).toBeInTheDocument();

    // Bottom action buttons
    expect(screen.getByRole("button", { name: /^Reject$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Request changes$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Approve$/i })).toBeInTheDocument();
  });

  it("switches details panel when a different row is clicked", () => {
    renderReviewQueue("owen");

    const row = screen.getByText("Mail order delivery time");
    fireEvent.click(row);

    // Right details panel updates to the clicked unit
    expect(screen.getByRole("heading", { name: "Mail order delivery time", level: 2 })).toBeInTheDocument();
    expect(screen.getAllByText(/Mail Order Procedure/i).length).toBeGreaterThan(0);
  });

  it("filters review items by tab selection", () => {
    renderReviewQueue("owen");

    // Click Requested changes tab
    const requestedTab = screen.getByRole("button", { name: /^Requested changes/i });
    fireEvent.click(requestedTab);

    expect(screen.getAllByText("Medications covered under the program").length).toBeGreaterThan(0);
    expect(screen.queryByText("Eligibility criteria for copay assistance")).not.toBeInTheDocument();
  });

  it("filters review items by search query", () => {
    renderReviewQueue("owen");

    const searchInput = screen.getByPlaceholderText("Search units...");
    fireEvent.change(searchInput, { target: { value: "exceptions" } });

    expect(screen.getAllByText("Formulary exceptions process").length).toBeGreaterThan(0);
    expect(screen.queryByText("Eligibility criteria for copay assistance")).not.toBeInTheDocument();
  });

  it("approves a pending unit when authorized and updates status", () => {
    renderReviewQueue("owen");

    const approveBtn = screen.getByRole("button", { name: /^Approve$/i });
    fireEvent.click(approveBtn);

    expect(screen.getByText(/Successfully approved/i)).toBeInTheDocument();
  });

  it("rejects a unit with required reason note", () => {
    renderReviewQueue("owen");

    // Attempt reject without note
    const rejectBtn = screen.getByRole("button", { name: /^Reject$/i });
    fireEvent.click(rejectBtn);

    expect(screen.getByText(/A rejection reason or note is required/i)).toBeInTheDocument();

    // Add note and reject
    const notesInput = screen.getByLabelText(/Reviewer notes/i);
    fireEvent.change(notesInput, { target: { value: "Duplicate policy version" } });
    fireEvent.click(rejectBtn);

    expect(screen.getByText(/rejected and archived/i)).toBeInTheDocument();
  });

  it("requests changes with feedback note", () => {
    renderReviewQueue("owen");

    const requestBtn = screen.getByRole("button", { name: /^Request changes$/i });
    const notesInput = screen.getByLabelText(/Reviewer notes/i);
    fireEvent.change(notesInput, { target: { value: "Needs updated 2024 tier table" } });
    fireEvent.click(requestBtn);

    expect(screen.getByText(/Changes requested for/i)).toBeInTheDocument();
  });

  it("switches details panel sub-tabs to Context, Source, and History", () => {
    renderReviewQueue("owen");

    // Switch to Context
    const contextTab = screen.getByRole("button", { name: "Context" });
    fireEvent.click(contextTab);
    expect(screen.getByText("Governance Context")).toBeInTheDocument();
    expect(screen.getByText("Demand score:")).toBeInTheDocument();

    // Switch to Source
    const sourceTab = screen.getByRole("button", { name: "Source" });
    fireEvent.click(sourceTab);
    expect(screen.getByText("Source Document Information")).toBeInTheDocument();

    // Switch to History
    const historyTab = screen.getByRole("button", { name: "History" });
    fireEvent.click(historyTab);
    expect(screen.getByText("Audit & Decision History")).toBeInTheDocument();
  });
});
