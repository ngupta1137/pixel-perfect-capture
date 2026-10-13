import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KnowledgeLibraryView } from "@/components/library/KnowledgeLibraryView";
import { SessionProvider } from "@/lib/session";
import { DemoStoreProvider, resetDemoStore } from "@/services/demoStore";
import { PEOPLE, findPerson } from "@/lib/rights";

const renderLibrary = (personId = "priya") => {
  const person = findPerson(personId) || PEOPLE[0]!;
  return render(
    <DemoStoreProvider>
      <SessionProvider initialPerson={person}>
        <KnowledgeLibraryView />
      </SessionProvider>
    </DemoStoreProvider>,
  );
};

describe("Knowledge Library Screen & Functionality", () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it("renders page heading, description, Add knowledge button, and search filters", () => {
    renderLibrary("priya");

    expect(screen.getByRole("heading", { name: "Knowledge library", level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText(/Browse and search approved knowledge units/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add knowledge/i })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Search knowledge by keyword, topic or document/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/^\d+ knowledge units$/i)).toBeInTheDocument();
  });

  it("displays knowledge table with initial units matching the approved reference", () => {
    renderLibrary("priya");

    expect(screen.getAllByText("Copay assistance program").length).toBeGreaterThan(0);
    expect(screen.getByText("Mail order benefits")).toBeInTheDocument();
    expect(screen.getByText("Rx pricing disclaimer")).toBeInTheDocument();
    expect(screen.getByText("Call closing: no impact on membership")).toBeInTheDocument();
    expect(screen.getByText("Days supply by mail (90-day)")).toBeInTheDocument();
    expect(screen.getByText("Member ID card")).toBeInTheDocument();
    expect(screen.getByText("Change primary care provider")).toBeInTheDocument();
    expect(screen.getByText("Formulary exceptions")).toBeInTheDocument();
    expect(screen.getByText("Clinical review process")).toBeInTheDocument();
    expect(screen.getByText("Step therapy requirements")).toBeInTheDocument();
  });

  it("filters knowledge units by search keyword", () => {
    renderLibrary("priya");

    const searchInput = screen.getByPlaceholderText(/Search knowledge by keyword, topic or document/i);
    fireEvent.change(searchInput, { target: { value: "copay" } });

    expect(screen.getAllByText(/Copay assistance program/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("Mail order benefits")).not.toBeInTheDocument();
  });

  it("filters knowledge units by content type", () => {
    renderLibrary("priya");

    const typeSelect = screen.getByLabelText(/Filter by content type/i);
    fireEvent.change(typeSelect, { target: { value: "Legal" } });

    expect(screen.getByText("Rx pricing disclaimer")).toBeInTheDocument();
    expect(screen.queryByText("Mail order benefits")).not.toBeInTheDocument();
  });

  it("opens right detail panel on row selection and displays Overview, summary, and metadata", () => {
    renderLibrary("priya");

    // Click on "Rx pricing disclaimer" row
    const row = screen.getByText("Rx pricing disclaimer");
    fireEvent.click(row);

    // Right detail panel displays title, status, and summary
    const detailPanel = screen.getByLabelText("Knowledge unit details");
    expect(detailPanel).toBeInTheDocument();
    expect(screen.getByText("Approved content")).toBeInTheDocument();
    expect(screen.getByText(/Mandatory verbatim disclosure for drug pricing estimates/i)).toBeInTheDocument();
    expect(screen.getByText(/View source document/i)).toBeInTheDocument();
    expect(screen.getByText(/Edit \(if permitted\)/i)).toBeInTheDocument();
  });

  it("switches detail panel tabs to Source, History, and Related", () => {
    renderLibrary("priya");

    // Click on "Source" tab in detail panel
    const sourceTab = screen.getByRole("button", { name: "source" });
    fireEvent.click(sourceTab);
    expect(screen.getAllByText(/Source Document/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Ingested Excerpt/i)).toBeInTheDocument();

    // Click on "History" tab
    const historyTab = screen.getByRole("button", { name: "history" });
    fireEvent.click(historyTab);
    expect(screen.getByText(/Version 1/i)).toBeInTheDocument();

    // Click on "Related" tab
    const relatedTab = screen.getByRole("button", { name: "related" });
    fireEvent.click(relatedTab);
    expect(screen.getByText(/Related policies, procedures and guidelines/i)).toBeInTheDocument();
  });

  it("paginates records cleanly across pages", () => {
    renderLibrary("priya");

    expect(screen.getByText(/1–10 of \d+/i)).toBeInTheDocument();

    // Navigate to page 2
    const page2Button = screen.getByRole("button", { name: "Page 2" });
    fireEvent.click(page2Button);

    expect(screen.getByText(/11–20 of \d+/i)).toBeInTheDocument();
    expect(screen.getByText("Prior authorization turnaround times")).toBeInTheDocument();
  });

  it("renders Add knowledge button for all users", () => {
    renderLibrary("priya");

    const addBtn = screen.getByRole("button", { name: /Add knowledge/i });
    expect(addBtn).toBeInTheDocument();
  });

  it("does not display overdue/stale review banner for advocates like Priya", () => {
    renderLibrary("priya");

    // Priya is a pharmacy advocate (consumer) without reverify_unit or review queue capabilities
    expect(screen.queryByText(/knowledge unit past review date/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Click to confirm still valid/i)).not.toBeInTheDocument();
  });

  it("displays overdue/stale review banner for Knowledge Owner (Owen)", () => {
    renderLibrary("owen");

    // Owen has reverify_unit and view_owner_queue capabilities
    expect(screen.getByText(/knowledge unit past review date/i)).toBeInTheDocument();
    expect(screen.getByText(/Click to confirm still valid/i)).toBeInTheDocument();
  });
});
