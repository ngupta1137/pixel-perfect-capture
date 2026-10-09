import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { SessionProvider, useSession } from "@/lib/session";
import { DemoStoreProvider, resetDemoStore } from "@/services/demoStore";
import { PEOPLE, findPerson, homeRoute } from "@/lib/rights";
import { AppShell } from "@/components/AppShell";
import { RequirePage } from "@/components/shell/Denied";
import { Route as OnboardingRoute } from "@/routes/onboarding";

// Mock router state
let currentPath = "/";
const mockNavigate = vi.fn((opts: { to: string }) => {
  currentPath = opts.to;
});

vi.mock("@tanstack/react-router", async (orig) => ({
  ...(await orig<typeof import("@tanstack/react-router")>()),
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className} data-to={to}>
      {children}
    </a>
  ),
  useRouterState: () => currentPath,
  useNavigate: () => mockNavigate,
}));

describe("Verity Demo Role-Selection Flow & Permission-Aware Navigation", () => {
  beforeEach(() => {
    resetDemoStore();
    if (typeof window !== "undefined") {
      sessionStorage.clear();
    }
    currentPath = "/";
    mockNavigate.mockClear();
  });

  describe("Landing & Role-Selection Flow", () => {
    it("redirects unauthenticated users to /welcome landing page", async () => {
      currentPath = "/";
      render(
        <DemoStoreProvider>
          <SessionProvider initialAuthenticated={false}>
            <AppShell>
              <div data-testid="workspace-content">Workspace Content</div>
            </AppShell>
          </SessionProvider>
        </DemoStoreProvider>,
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/welcome" });
      });
    });

    it("proceeds through onboarding role selection to route user to their role workspace", async () => {
      currentPath = "/onboarding";
      const OnboardingComponent = OnboardingRoute.options.component!;

      render(
        <DemoStoreProvider>
          <SessionProvider initialAuthenticated={false}>
            <OnboardingComponent />
          </SessionProvider>
        </DemoStoreProvider>,
      );

      // Choose 'Knowledge author' role card
      const authorRoleBtn = screen.getByRole("button", { name: /Knowledge author/i });
      fireEvent.click(authorRoleBtn);

      // Select Dana persona
      const danaBtn = screen.getByRole("button", { name: /Dana/i });
      fireEvent.click(danaBtn);

      // Enter workspace
      const enterBtn = screen.getByRole("button", { name: /Enter workspace/i });
      fireEvent.click(enterBtn);

      // Verify routed to Dana's home route
      const dana = findPerson("dana")!;
      expect(mockNavigate).toHaveBeenCalledWith({ to: homeRoute(dana) });
    });
  });

  describe("Permission-Aware Sidebar Navigation", () => {
    it("displays only advocate-permitted items in sidebar for Priya", () => {
      currentPath = "/";
      const priya = findPerson("priya") || PEOPLE[0]!;

      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={priya}>
            <AppShell>
              <div>Advocate Workspace</div>
            </AppShell>
          </SessionProvider>
        </DemoStoreProvider>,
      );

      const nav = screen.getByRole("navigation", { name: "Workspace navigation" });

      // Permitted items for Advocate
      expect(within(nav).getByRole("link", { name: /^Ask$/i })).toBeInTheDocument();
      expect(within(nav).getByRole("link", { name: /^Knowledge library$/i })).toBeInTheDocument();

      // Unauthorized items must NOT be rendered in the sidebar
      expect(within(nav).queryByRole("link", { name: /^Ingest$/i })).not.toBeInTheDocument();
      expect(within(nav).queryByRole("link", { name: /Review queue/i })).not.toBeInTheDocument();
      expect(within(nav).queryByRole("link", { name: /Knowledge gaps/i })).not.toBeInTheDocument();
      expect(within(nav).queryByRole("link", { name: /^Analytics$/i })).not.toBeInTheDocument();
      expect(within(nav).queryByRole("link", { name: /Agents/i })).not.toBeInTheDocument();
      expect(within(nav).queryByRole("link", { name: /^Settings$/i })).not.toBeInTheDocument();
    });

    it("displays author-permitted items in sidebar for Dana", () => {
      currentPath = "/work";
      const dana = findPerson("dana")!;

      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={dana}>
            <AppShell>
              <div>Author Workspace</div>
            </AppShell>
          </SessionProvider>
        </DemoStoreProvider>,
      );

      const nav = screen.getByRole("navigation", { name: "Workspace navigation" });

      // Permitted for Dana (Authoring & Gaps)
      expect(within(nav).getByRole("link", { name: /^Knowledge library$/i })).toBeInTheDocument();
      expect(within(nav).getByRole("link", { name: /^Ingest$/i })).toBeInTheDocument();
      expect(within(nav).getByRole("link", { name: /Knowledge gaps/i })).toBeInTheDocument();

      // Unauthorized for Dana
      expect(within(nav).queryByRole("link", { name: /Review queue/i })).not.toBeInTheDocument();
      expect(within(nav).queryByRole("link", { name: /^Analytics$/i })).not.toBeInTheDocument();
      expect(within(nav).queryByRole("link", { name: /Agents/i })).not.toBeInTheDocument();
      expect(within(nav).queryByRole("link", { name: /^Settings$/i })).not.toBeInTheDocument();
    });

    it("displays reviewer/owner-permitted items in sidebar for Owen", () => {
      currentPath = "/review";
      const owen = findPerson("owen")!;

      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={owen}>
            <AppShell>
              <div>Owner Workspace</div>
            </AppShell>
          </SessionProvider>
        </DemoStoreProvider>,
      );

      const nav = screen.getByRole("navigation", { name: "Workspace navigation" });

      // Permitted for Owen (Governance & Review)
      expect(within(nav).getByRole("link", { name: /^Knowledge library$/i })).toBeInTheDocument();
      expect(within(nav).getByRole("link", { name: /Review queue/i })).toBeInTheDocument();
      expect(within(nav).getByRole("link", { name: /Knowledge gaps/i })).toBeInTheDocument();

      // Unauthorized for Owen
      expect(within(nav).queryByRole("link", { name: /^Analytics$/i })).not.toBeInTheDocument();
      expect(within(nav).queryByRole("link", { name: /Agents/i })).not.toBeInTheDocument();
      expect(within(nav).queryByRole("link", { name: /^Settings$/i })).not.toBeInTheDocument();
    });

    it("displays governance and admin items in sidebar for Alex and Nitin", () => {
      currentPath = "/access";
      const alex = findPerson("alex")!;

      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={alex}>
            <AppShell>
              <div>Admin Workspace</div>
            </AppShell>
          </SessionProvider>
        </DemoStoreProvider>,
      );

      const nav = screen.getByRole("navigation", { name: "Workspace navigation" });

      // Permitted for Alex (Access Admin)
      expect(within(nav).getByRole("link", { name: /^Settings$/i })).toBeInTheDocument();

      // Unauthorized for Alex
      expect(within(nav).queryByRole("link", { name: /^Ingest$/i })).not.toBeInTheDocument();
      expect(within(nav).queryByRole("link", { name: /Review queue/i })).not.toBeInTheDocument();
    });
  });

  describe("Restricted Direct URLs & In-Place Role Switching", () => {
    it("blocks unauthorized direct URL and displays role access panel with dynamic switcher", async () => {
      currentPath = "/review";
      const priya = findPerson("priya") || PEOPLE[0]!;

      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={priya}>
            <AppShell>
              <RequirePage to="/review">
                <div data-testid="protected-review-workspace">Protected Review Queue</div>
              </RequirePage>
            </AppShell>
          </SessionProvider>
        </DemoStoreProvider>,
      );

      // Protected content not visible
      expect(screen.queryByTestId("protected-review-workspace")).not.toBeInTheDocument();

      // Role access panel shown
      expect(screen.getByRole("heading", { name: "Access denied" })).toBeInTheDocument();
      expect(screen.getByText(/Role Access Required/i)).toBeInTheDocument();
      expect(screen.getByText(/reverify_unit/i)).toBeInTheDocument();

      // Switch to authorized reviewer (Owen)
      const switchOwenBtn = screen.getByRole("button", { name: /Switch to Owen/i });
      fireEvent.click(switchOwenBtn);

      // Protected content is now mounted in-place without page reload
      await waitFor(() => {
        expect(screen.getByTestId("protected-review-workspace")).toBeInTheDocument();
      });
    });

    it("automatically redirects to new persona's default permitted screen when switched persona is unauthorized for current page", async () => {
      // Dana is on /work (Ingest)
      currentPath = "/work";
      const dana = findPerson("dana")!;

      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={dana}>
            <AppShell>
              <div data-testid="author-content">Author Work</div>
            </AppShell>
          </SessionProvider>
        </DemoStoreProvider>,
      );

      // Open persona picker dropdown
      const personaBtn = screen.getByRole("button", { name: /Signed in as Dana/i });
      fireEvent.keyDown(personaBtn, { key: "Enter", code: "Enter" });

      // Select Priya (Advocate, who cannot access /work)
      const priyaOption = await screen.findByRole("menuitem", { name: /Priya/i });
      fireEvent.click(priyaOption);

      // Verify routed to Priya's default home route (/ or /ask)
      const priya = findPerson("priya")!;
      expect(mockNavigate).toHaveBeenCalledWith({ to: homeRoute(priya) });
    });

    it("stays on the current page when switching to a persona that is also authorized for that page", async () => {
      // Dana is on /library (Knowledge library)
      currentPath = "/library";
      const dana = findPerson("dana")!;

      render(
        <DemoStoreProvider>
          <SessionProvider initialPerson={dana}>
            <AppShell>
              <div data-testid="library-content">Knowledge Library Content</div>
            </AppShell>
          </SessionProvider>
        </DemoStoreProvider>,
      );

      // Open persona picker dropdown
      const personaBtn = screen.getByRole("button", { name: /Signed in as Dana/i });
      fireEvent.keyDown(personaBtn, { key: "Enter", code: "Enter" });

      // Select Priya (who CAN access /library)
      const priyaOption = await screen.findByRole("menuitem", { name: /Priya/i });
      fireEvent.click(priyaOption);

      // Priya is authorized for /library, so no forced redirect away
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
