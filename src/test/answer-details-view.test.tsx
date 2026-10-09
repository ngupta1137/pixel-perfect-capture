import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnswerDetailsView } from "@/components/ask/AnswerDetailsView";
import { SessionProvider } from "@/lib/session";
import { DemoStoreProvider } from "@/services/demoStore";
import type { SearchResponse } from "@/services/verity";

function makeResponse(outcome: SearchResponse["outcome"], text: string | null = "Test text"): SearchResponse {
  return {
    request_id: "req-test-123",
    outcome,
    parts: [
      {
        part: "test-intent",
        outcome,
        message: `Outcome message for ${outcome}`,
        text,
        owner_team: "Pharmacy Ops",
        citations: [
          {
            unit_id: "U-PH-010",
            version: 1,
            title: "Copay assistance program (Kentucky pilot)",
            owner: "Pharmacy Ops",
            effective_date: "2026-03-01",
            verbatim: false,
            text: "Members in Kentucky can enroll in the Rx copay assistance pilot.",
          },
        ],
        next_step: outcome === "insufficient_evidence" ? "Check with supervisor" : null,
      },
    ],
    trace: ["1. Trace step 1", "2. Trace step 2"],
    engine: "mock",
  };
}

describe("AnswerDetailsView component", () => {
  const defaultProps = {
    question: "Is there a copay assistance program?",
    response: makeResponse("answer", "Yes. There is a copay assistance program for eligible members."),
    lob: "MAPD",
    setLob: vi.fn(),
    state: "KY",
    setState: vi.fn(),
    planYear: "2026",
    setPlanYear: vi.fn(),
    onBack: vi.fn(),
    onSelectQuestion: vi.fn(),
    onChoose: vi.fn(),
  };

  const renderComponent = (props = defaultProps) =>
    render(
      <DemoStoreProvider>
        <SessionProvider>
          <AnswerDetailsView {...props} />
        </SessionProvider>
      </DemoStoreProvider>,
    );

  it("renders question title, context pills, and approved answer banner", () => {
    renderComponent();
    expect(screen.getByText("Is there a copay assistance program?")).toBeInTheDocument();
    expect(screen.getByText("Approved answer")).toBeInTheDocument();
    expect(screen.getByText(/Line of business/i)).toBeInTheDocument();
    expect(screen.getAllByText("MAPD").length).toBeGreaterThan(0);
    expect(screen.getByText("Edit context")).toBeInTheDocument();
  });

  it("renders sources sidebar and related questions", () => {
    renderComponent();
    expect(screen.getByText(/Sources/i)).toBeInTheDocument();
    expect(screen.getByText("Related questions")).toBeInTheDocument();
    expect(screen.getByText("How do I apply for copay assistance?")).toBeInTheDocument();
  });

  it("calls onBack when 'Back to search' button is clicked", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Back to search"));
    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it("calls onSelectQuestion when a related question is clicked", () => {
    renderComponent();
    fireEvent.click(screen.getByText("How do I apply for copay assistance?"));
    expect(defaultProps.onSelectQuestion).toHaveBeenCalledWith("How do I apply for copay assistance?");
  });

  it("renders clarification outcome when outcome is needs_clarification", () => {
    const props = {
      ...defaultProps,
      response: {
        ...makeResponse("needs_clarification", null),
        parts: [
          {
            part: "clarify",
            outcome: "needs_clarification",
            message: "Which state is the member in?",
            text: null,
            owner_team: null,
            citations: [],
            choices: [{ label: "KY", set: { state: "KY" } }],
          },
        ],
      },
    };
    renderComponent(props);
    expect(screen.getByText("A little more context is needed")).toBeInTheDocument();
    expect(screen.getAllByText("KY").length).toBeGreaterThan(0);
  });

  it("renders insufficient evidence outcome correctly", () => {
    const props = {
      ...defaultProps,
      response: makeResponse("insufficient_evidence", null),
    };
    renderComponent(props);
    expect(screen.getByText("No approved answer found")).toBeInTheDocument();
    expect(screen.getByText(/Verity does not answer from general knowledge/i)).toBeInTheDocument();
  });

  it("renders conflict outcome correctly without picking a side", () => {
    const props = {
      ...defaultProps,
      response: makeResponse("conflict", null),
    };
    renderComponent(props);
    expect(screen.getByText(/Conflicting sources — answer withheld/i)).toBeInTheDocument();
    expect(screen.getByText(/Verity will not pick an answer/i)).toBeInTheDocument();
  });

  it("renders stale outcome correctly", () => {
    const props = {
      ...defaultProps,
      response: makeResponse("stale", "Standard shipping is free."),
    };
    renderComponent(props);
    expect(screen.getByText(/Review required — answer withheld/i)).toBeInTheDocument();
  });

  it("renders unauthorized outcome correctly", () => {
    const props = {
      ...defaultProps,
      response: makeResponse("not_authorized", null),
    };
    renderComponent(props);
    expect(screen.getByText(/Outside your access/i)).toBeInTheDocument();
  });

  it("renders safety escalation outcome correctly", () => {
    const props = {
      ...defaultProps,
      response: makeResponse("safety_escalation", "Call 911 immediately."),
    };
    renderComponent(props);
    expect(screen.getByText(/Immediate safety escalation/i)).toBeInTheDocument();
  });
});
