import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { SessionProvider } from "@/lib/session";
import { DemoStoreProvider, resetDemoStore } from "@/services/demoStore";
import { findPerson } from "@/lib/rights";
import { KnowledgeGapsView } from "@/components/gaps/KnowledgeGapsView";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { AgentsToolsView } from "@/components/agents/AgentsToolsView";
import { SettingsView } from "@/components/settings/SettingsView";

describe("Verity — Remaining Screens Implementation & Real Data Verification", () => {
  beforeEach(() => {
    resetDemoStore();
  });

  describe("Knowledge Gaps Screen", () => {
    it("renders page header, category tabs, and seeded knowledge gap records", () => {
      const dana = findPerson("dana")!;
      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={dana}>
            <KnowledgeGapsView />
          </SessionProvider>
        </DemoStoreProvider>,
      );

      // Header & subtitle
      expect(screen.getByRole("heading", { name: "Knowledge gaps" })).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /Create knowledge unit/i }).length).toBeGreaterThan(0);

      // Tabs
      expect(screen.getByRole("button", { name: /All gaps/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Insufficient/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Conflicting/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Outdated/i })).toBeInTheDocument();

      // Seeded gap items
      expect(screen.getAllByText("Prior authorization for GLP-1 medications")[0]).toBeInTheDocument();
      expect(screen.getByText("Home delivery for specialty medications")).toBeInTheDocument();
      expect(screen.getByText("Coverage for weight management programs")).toBeInTheDocument();
      expect(screen.getByText("Step therapy for asthma medications")).toBeInTheDocument();
      expect(screen.getByText("Out-of-network reimbursement process")).toBeInTheDocument();
    });

    it("filters gaps by category tab and search query", () => {
      const dana = findPerson("dana")!;
      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={dana}>
            <KnowledgeGapsView />
          </SessionProvider>
        </DemoStoreProvider>,
      );

      // Filter by Conflicting tab
      fireEvent.click(screen.getByRole("button", { name: /Conflicting/i }));
      expect(screen.getByText("Home delivery for specialty medications")).toBeInTheDocument();
      expect(screen.queryByText("Coverage for weight management programs")).not.toBeInTheDocument();

      // Return to All gaps and search
      fireEvent.click(screen.getByRole("button", { name: /All gaps/i }));
      const searchInput = screen.getByPlaceholderText(/Search gaps by topic, keyword/i);
      fireEvent.change(searchInput, { target: { value: "asthma" } });

      expect(screen.getByText("Step therapy for asthma medications")).toBeInTheDocument();
      expect(screen.queryByText("Home delivery for specialty medications")).not.toBeInTheDocument();
    });

    it("displays detailed panel on row selection with Overview, Search insights, and Related content tabs", () => {
      const dana = findPerson("dana")!;
      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={dana}>
            <KnowledgeGapsView />
          </SessionProvider>
        </DemoStoreProvider>,
      );

      // Click on GLP-1 gap row
      fireEvent.click(screen.getAllByText("Prior authorization for GLP-1 medications")[0]!);

      // Detail panel content
      expect(screen.getByText("Gap summary")).toBeInTheDocument();
      expect(screen.getByText("Why this is a gap")).toBeInTheDocument();
      expect(screen.getByText(/Insufficient or no approved content/i)).toBeInTheDocument();

      // Switch to Search insights
      fireEvent.click(screen.getByRole("button", { name: "Search insights" }));
      expect(screen.getByText(/Member search demand/i)).toBeInTheDocument();
      expect(screen.getByText(/"Is Ozempic covered under MAPD 2024\?"/i)).toBeInTheDocument();

      // Switch to Related content
      fireEvent.click(screen.getByRole("button", { name: "Related content" }));
      expect(screen.getByText(/Potential nearby units/i)).toBeInTheDocument();
      expect(screen.getByText(/Formulary exceptions & tiering reviews/i)).toBeInTheDocument();
    });
  });

  describe("Analytics Screen", () => {
    it("renders real KPI metrics, trend indicators, and breakdown widgets", () => {
      const nitin = findPerson("nitin")!;
      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={nitin}>
            <AnalyticsView />
          </SessionProvider>
        </DemoStoreProvider>,
      );

      // Header
      expect(screen.getByRole("heading", { name: "Analytics" })).toBeInTheDocument();
      expect(screen.getByText(/01 Jan 2024 – 31 Jan 2024/i)).toBeInTheDocument();

      // 4 Top KPIs
      expect(screen.getByText("Total questions")).toBeInTheDocument();
      expect(screen.getAllByText("1,248")[0]).toBeInTheDocument();
      expect(screen.getByText("Answer accuracy")).toBeInTheDocument();
      expect(screen.getByText("92%")).toBeInTheDocument();
      expect(screen.getByText("Escalations")).toBeInTheDocument();
      expect(screen.getByText("38")).toBeInTheDocument();
      expect(screen.getByText("Active knowledge units")).toBeInTheDocument();

      // Top topics & Answer sources
      expect(screen.getByText("Top topics")).toBeInTheDocument();
      expect(screen.getAllByText("Pharmacy benefits")[0]).toBeInTheDocument();
      expect(screen.getAllByText("Prior authorization")[0]).toBeInTheDocument();
      expect(screen.getByText("Answer sources")).toBeInTheDocument();
      expect(screen.getByText("Approved knowledge")).toBeInTheDocument();
      expect(screen.getByText("User feedback")).toBeInTheDocument();
      expect(screen.getByText("Recent escalations")).toBeInTheDocument();
    });
  });

  describe("Agents & Tools Screen", () => {
    it("renders agents and tools table with categories and detail drawer", () => {
      const nitin = findPerson("nitin")!;
      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={nitin}>
            <AgentsToolsView />
          </SessionProvider>
        </DemoStoreProvider>,
      );

      // Header & tabs
      expect(screen.getByRole("heading", { name: "Agents & tools" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /All agents/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /LLM tools/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Integrations/i })).toBeInTheDocument();

      // Seeded agents & tools
      expect(screen.getAllByText("Q&A Agent")[0]).toBeInTheDocument();
      expect(screen.getByText("Ingestion Agent")).toBeInTheDocument();
      expect(screen.getByText("Review Assistant")).toBeInTheDocument();
      expect(screen.getByText("Analytics Agent")).toBeInTheDocument();
      expect(screen.getByText("EMR Integration")).toBeInTheDocument();

      // Detail Panel
      expect(screen.getByText("Capabilities")).toBeInTheDocument();
      expect(screen.getByText(/Search approved knowledge units/i)).toBeInTheDocument();
      expect(screen.getByText("Model settings")).toBeInTheDocument();
      expect(screen.getByText("Azure OpenAI")).toBeInTheDocument();
      expect(screen.getByText("GPT-4o")).toBeInTheDocument();
    });
  });

  describe("Settings Screen", () => {
    it("renders general workspace details, preferences, feature toggles, users, and RBAC matrix", () => {
      const alex = findPerson("alex")!;
      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={alex}>
            <SettingsView />
          </SessionProvider>
        </DemoStoreProvider>,
      );

      // Header & Tabs
      expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "General" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Users & permissions" })).toBeInTheDocument();

      // Workspace details & preferences
      expect(screen.getByText("Pharmacy Support Program")).toBeInTheDocument();
      expect(screen.getByText("WSP-001")).toBeInTheDocument();
      expect(screen.getByText("HealthCare Inc.")).toBeInTheDocument();
      expect(screen.getByText("Enterprise")).toBeInTheDocument();
      expect(screen.getByText("Preferences")).toBeInTheDocument();
      expect(screen.getByText("Feature settings")).toBeInTheDocument();
      expect(screen.getByText("Voice input")).toBeInTheDocument();

      // Users preview
      expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
      expect(screen.getByText("Rahul Mehta")).toBeInTheDocument();
      expect(screen.getByText("Anita Desai")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Integrations" })).toBeInTheDocument();
      expect(screen.getByText("Danger zone")).toBeInTheDocument();

      // Switch to Users & Permissions (RBAC Matrix)
      fireEvent.click(screen.getByRole("button", { name: "Users & permissions" }));
      expect(screen.getByRole("heading", { name: "Knowledge Base Access Matrix" })).toBeInTheDocument();
      expect(screen.getByText("Protected Role Holders")).toBeInTheDocument();
    });
  });
});
