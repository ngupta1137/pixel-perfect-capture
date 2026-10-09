import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SessionProvider, useSession } from "@/lib/session";
import { DemoStoreProvider, resetDemoStore } from "@/services/demoStore";
import { PEOPLE, findPerson } from "@/lib/rights";
import { RequirePage } from "@/components/shell/Denied";
import { ChannelPicker } from "@/components/shell/ChannelPicker";
import { AskPage } from "@/routes/index";

vi.mock("@tanstack/react-router", async (orig) => ({
  ...(await orig<typeof import("@tanstack/react-router")>()),
  Link: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  useRouterState: () => "/",
  useNavigate: () => vi.fn(),
}));

describe("Verity Demo Role Access and Working Channel Selector", () => {
  beforeEach(() => {
    resetDemoStore();
  });

  describe("Role-Access Information Panel", () => {
    it("renders informative role-access panel when persona lacks capability", () => {
      const priya = findPerson("priya") || PEOPLE[0]!;
      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={priya}>
            <RequirePage to="/work">
              <div data-testid="guarded-work-content">Authorized Ingest Content</div>
            </RequirePage>
          </SessionProvider>
        </DemoStoreProvider>,
      );

      // Verify access denied header & role access info
      expect(screen.getByRole("heading", { name: "Access denied" })).toBeInTheDocument();
      expect(screen.getByText(/Role Access Required/i)).toBeInTheDocument();
      expect(screen.getByText(/You are currently acting as/i)).toBeInTheDocument();
      expect(screen.getByText(/Priya/i)).toBeInTheDocument();
      expect(screen.getByText(/ingest_source/i)).toBeInTheDocument();
      expect(screen.getByText(/Authorized Demo Roles/i)).toBeInTheDocument();

      // Guarded content must not be visible
      expect(screen.queryByTestId("guarded-work-content")).not.toBeInTheDocument();
    });

    it("allows one-click role switching on unauthorized screen and reveals guarded content without reload", async () => {
      const priya = findPerson("priya") || PEOPLE[0]!;
      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={priya}>
            <RequirePage to="/work">
              <div data-testid="guarded-work-content">Authorized Ingest Content</div>
            </RequirePage>
          </SessionProvider>
        </DemoStoreProvider>,
      );

      // Find switch button to Dana (Knowledge author)
      const switchDanaBtn = screen.getByRole("button", { name: /Switch to Dana/i });
      expect(switchDanaBtn).toBeInTheDocument();

      // Click switch role
      fireEvent.click(switchDanaBtn);

      // Now guarded content is mounted immediately
      await waitFor(() => {
        expect(screen.getByTestId("guarded-work-content")).toBeInTheDocument();
      });

      // Role access panel is removed
      expect(screen.queryByRole("heading", { name: "Access denied" })).not.toBeInTheDocument();
    });

    it("displays distinct authorized roles specifically for /review screen", () => {
      const priya = findPerson("priya") || PEOPLE[0]!;
      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={priya}>
            <RequirePage to="/review">
              <div data-testid="guarded-review-content">Authorized Review Queue</div>
            </RequirePage>
          </SessionProvider>
        </DemoStoreProvider>,
      );

      expect(screen.getByRole("heading", { name: "Access denied" })).toBeInTheDocument();
      expect(screen.getByText(/reverify_unit/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Switch to Owen/i })).toBeInTheDocument();
    });
  });

  describe("Channel Selector Functionality", () => {
    function ChannelController() {
      const { channel, setChannel } = useSession();
      return (
        <div>
          <button type="button" onClick={() => setChannel("advocate_view")}>
            Set Advocate
          </button>
          <button type="button" onClick={() => setChannel("member_chat")}>
            Set Member
          </button>
          <button type="button" onClick={() => setChannel("voice")}>
            Set Voice
          </button>
          <div data-testid="active-channel-display">{channel}</div>
        </div>
      );
    }

    it("allows switching between Advocate view, Member chat, and Voice channels", () => {
      const owen = findPerson("owen") || PEOPLE[0]!;
      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={owen}>
            <ChannelController />
          </SessionProvider>
        </DemoStoreProvider>,
      );

      // Default is voice
      expect(screen.getByTestId("active-channel-display")).toHaveTextContent("voice");

      // Switch to Member chat
      fireEvent.click(screen.getByRole("button", { name: "Set Member" }));
      expect(screen.getByTestId("active-channel-display")).toHaveTextContent("member_chat");

      // Switch to Advocate view
      fireEvent.click(screen.getByRole("button", { name: "Set Advocate" }));
      expect(screen.getByTestId("active-channel-display")).toHaveTextContent("advocate_view");
    });

    function AskWithChannel({ initialChannel = "member_chat" }: { initialChannel?: string }) {
      const { setChannel } = useSession();
      return (
        <div>
          <button type="button" onClick={() => setChannel("member_chat")}>
            To Member Chat
          </button>
          <button type="button" onClick={() => setChannel("voice")}>
            To Voice
          </button>
          <AskPage />
        </div>
      );
    }

    it("renders member chat interface when member_chat channel is active", () => {
      const priya = findPerson("priya") || PEOPLE[0]!;
      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={priya}>
            <AskWithChannel initialChannel="member_chat" />
          </SessionProvider>
        </DemoStoreProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "To Member Chat" }));

      // Verify conversational member chat UI elements
      expect(screen.getByPlaceholderText("Ask Verity...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Talk to a person/i })).toBeInTheDocument();
      expect(screen.getByText("A+")).toBeInTheDocument();
    });

    it("displays informative speech capability notice when voice channel is selected in unsupported environment", () => {
      const priya = findPerson("priya") || PEOPLE[0]!;
      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={priya}>
            <AskWithChannel initialChannel="voice" />
          </SessionProvider>
        </DemoStoreProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "To Voice" }));

      // In jsdom environment (where SpeechRecognition is absent), clear guidance is shown
      expect(
        screen.getByText(/Speech recognition is not supported in this browser/i),
      ).toBeInTheDocument();
    });
  });
});
