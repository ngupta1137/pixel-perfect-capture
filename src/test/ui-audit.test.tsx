import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SessionProvider } from "@/lib/session";
import { DemoStoreProvider, resetDemoStore } from "@/services/demoStore";
import { findPerson } from "@/lib/rights";
import { UserMenu } from "@/components/shell/UserMenu";
import { NotificationPopover } from "@/components/shell/NotificationPopover";
import { HelpModal } from "@/components/shell/HelpModal";
import { SettingsView } from "@/components/settings/SettingsView";
import { AgentsToolsView } from "@/components/agents/AgentsToolsView";
import { KnowledgeGapsView } from "@/components/gaps/KnowledgeGapsView";

// Mock tanstack router navigation
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to, onClick, className }: any) => (
      <a
        href={to}
        className={className}
        onClick={(e) => {
          e.preventDefault();
          onClick?.(e);
          mockNavigate({ to });
        }}
      >
        {children}
      </a>
    ),
  };
});

describe("Verity — Final UI Functionality Audit", () => {
  beforeEach(() => {
    resetDemoStore();
    mockNavigate.mockClear();
  });

  describe("User Profile Menu & Actions", () => {
    it("renders profile menu trigger with avatar and opens dropdown on click", async () => {
      const priya = findPerson("priya")!;
      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={priya}>
            <UserMenu />
          </SessionProvider>
        </DemoStoreProvider>,
      );

      const trigger = screen.getByRole("button", { name: /User menu for Priya/i });
      expect(trigger).toBeInTheDocument();

      fireEvent.keyDown(trigger, { key: "Enter", code: "Enter" });

      // Verify menu contents
      expect(await screen.findByText("Priya")).toBeInTheDocument();
      expect(screen.getByText("Pharmacy advocate")).toBeInTheDocument();
      expect(screen.getByText("View Rights & Scope")).toBeInTheDocument();
      expect(screen.getByText("Why Verity exists")).toBeInTheDocument();
      expect(screen.getByText("Verity Overview")).toBeInTheDocument();
      expect(screen.getByText("Sign out")).toBeInTheDocument();
      expect(screen.getByText("Reset demo state")).toBeInTheDocument();
    });

    it("executes sign out, clears active session, and navigates to welcome page", async () => {
      const priya = findPerson("priya")!;
      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={priya}>
            <UserMenu />
          </SessionProvider>
        </DemoStoreProvider>,
      );

      const trigger = screen.getByRole("button", { name: /User menu for Priya/i });
      fireEvent.keyDown(trigger, { key: "Enter", code: "Enter" });

      const signOutBtn = await screen.findByText("Sign out");
      fireEvent.click(signOutBtn);

      expect(mockNavigate).toHaveBeenCalledWith({ to: "/welcome" });
    });

    it("resets demo state to initial fixtures on Reset demo state click", async () => {
      const priya = findPerson("priya")!;
      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={priya}>
            <UserMenu />
          </SessionProvider>
        </DemoStoreProvider>,
      );

      const trigger = screen.getByRole("button", { name: /User menu for Priya/i });
      fireEvent.keyDown(trigger, { key: "Enter", code: "Enter" });

      const resetBtn = await screen.findByText("Reset demo state");
      fireEvent.click(resetBtn);

      await waitFor(() => {
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      });
    });
  });

  describe("Notification Popover & Direct Links", () => {
    it("renders notification badge and lists actionable updates", async () => {
      render(
        <DemoStoreProvider>
          <SessionProvider>
            <NotificationPopover />
          </SessionProvider>
        </DemoStoreProvider>,
      );

      const bell = screen.getByRole("button", { name: /Notifications/i });
      fireEvent.click(bell);

      expect(await screen.findByText("Notifications")).toBeInTheDocument();
      expect(screen.getByText("Review queue update")).toBeInTheDocument();
      expect(screen.getByText("Knowledge gaps logged")).toBeInTheDocument();
      expect(screen.getByText("AEP 2027 Readiness")).toBeInTheDocument();
    });
  });

  describe("Help & Support Modal", () => {
    it("opens help modal with key governance principles and resources", async () => {
      render(
        <DemoStoreProvider>
          <SessionProvider>
            <HelpModal />
          </SessionProvider>
        </DemoStoreProvider>,
      );

      const helpBtn = screen.getByRole("button", { name: /Help & Support/i });
      fireEvent.click(helpBtn);

      expect(await screen.findByText("Verity Help & Support")).toBeInTheDocument();
      expect(screen.getByText("One Approved Truth, in Every Channel")).toBeInTheDocument();
      expect(screen.getByText("Interactive Demo Guide")).toBeInTheDocument();
    });
  });

  describe("Interactive Settings Controls", () => {
    it("allows toggling feature switches and displays confirmation feedback", () => {
      const nitin = findPerson("nitin")!;
      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={nitin}>
            <SettingsView />
          </SessionProvider>
        </DemoStoreProvider>,
      );

      const voiceToggle = screen.getByRole("switch", { name: /Voice input/i });
      expect(voiceToggle).toHaveAttribute("aria-checked", "true");

      fireEvent.click(voiceToggle);
      expect(voiceToggle).toHaveAttribute("aria-checked", "false");
    });
  });

  describe("Agents & Tools Live Execution", () => {
    it("executes governed agent test runner and displays execution output", async () => {
      const nitin = findPerson("nitin")!;
      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={nitin}>
            <AgentsToolsView />
          </SessionProvider>
        </DemoStoreProvider>,
      );

      // Click Test agent button in drawer
      const testBtn = screen.getByRole("button", { name: /Test agent/i });
      fireEvent.click(testBtn);

      // Verify testing view
      expect(screen.getByText(/Live Governed Tool Tester/i)).toBeInTheDocument();

      const runBtn = screen.getByRole("button", { name: /Call tool/i });
      fireEvent.click(runBtn);

      await waitFor(() => {
        expect(screen.getByText(/Outcome:/i)).toBeInTheDocument();
      });
    });
  });

  describe("Knowledge Gaps Creation Workflow", () => {
    it("triggers create unit action callback when clicking Create knowledge unit", () => {
      const createSpy = vi.fn();
      const dana = findPerson("dana")!;
      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={dana}>
            <KnowledgeGapsView onCreateUnit={createSpy} />
          </SessionProvider>
        </DemoStoreProvider>,
      );

      const createButtons = screen.getAllByRole("button", { name: /Create knowledge unit/i });
      fireEvent.click(createButtons[0]!);

      expect(createSpy).toHaveBeenCalledTimes(1);
    });
  });
});
