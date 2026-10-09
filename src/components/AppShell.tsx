import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Compass,
  Home,
  ChevronRight,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
} from "lucide-react";
import { GuideRail, useGuideKeys } from "@/components/shell/GuideRail";
import { guide, useGuide } from "@/lib/guide";
import { VerityLogo } from "./VerityLogo";
import { Button } from "@/components/ui/button";
import { PersonaPicker } from "@/components/shell/PersonaPicker";
import { ChannelPicker } from "@/components/shell/ChannelPicker";
import { NotificationPopover } from "@/components/shell/NotificationPopover";
import { UserMenu } from "@/components/shell/UserMenu";
import { HelpModal } from "@/components/shell/HelpModal";
import { ActingAsBar } from "@/components/shell/ActingAsBar";
import { useSession } from "@/lib/session";
import { SIDEBAR_ITEMS } from "@/components/workspace/navigation";
import { useBreadcrumbs } from "@/lib/breadcrumbs";

function GuideButton() {
  const open = useGuide((s) => s.open);
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={open}
      title="Demo guide"
      onClick={guide.toggle}
      className="text-xs text-ink-muted hover:text-ink"
    >
      <Compass className="h-4 w-4" />
      <span className="hidden xl:inline">Guide</span>
    </Button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { person } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [collapsed, setCollapsed] = useState(false);
  const docked = useGuide((s) => s.open && !s.collapsed);
  useGuideKeys();
  const publicPage = ["/welcome", "/sign-in", "/onboarding", "/story"].includes(pathname);
  const customCrumbs = useBreadcrumbs();

  // Derive current page label for breadcrumb
  const currentItem = SIDEBAR_ITEMS.find((n) => n.to === pathname);
  const pageTitle = pathname === "/" ? "Ask" : (currentItem?.label ?? "Verity");
  const breadcrumbs = pathname === "/" && customCrumbs.length > 0 ? customCrumbs : [pageTitle];


  const nav = (
    <nav aria-label="Workspace navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
      {SIDEBAR_ITEMS.map((item, idx) => {
        const Icon = item.icon;
        const isActive = pathname === item.to && (item.label !== "Knowledge gaps" || idx === 0);
        return (
          <Link
            key={`${item.to}-${item.label}`}
            to={item.to}
            activeOptions={{ exact: true }}
            title={item.label}
            className={`group relative flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-[13px] font-normal transition-all ${
              isActive
                ? "bg-[#EAF7EE] text-[#1E5E2E] font-medium shadow-none"
                : "text-ink-muted hover:bg-muted/80 hover:text-ink"
            }`}
          >
            <div className="flex items-center gap-3">
              {isActive && (
                <span className="absolute -left-3 top-1.5 bottom-1.5 w-1 rounded-r bg-[#1E5E2E]" />
              )}
              <Icon
                className={`h-[18px] w-[18px] shrink-0 ${
                  isActive ? "text-[#1E5E2E]" : "text-ink-muted group-hover:text-ink"
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
            </div>
            {!collapsed && item.badge && (
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                  item.badge.color === "amber"
                    ? "bg-[#FDE8D7] text-[#C25E00]"
                    : item.badge.color === "red"
                    ? "bg-[#FDE2E2] text-[#D32F2F]"
                    : "bg-[#EAF7EE] text-[#1E5E2E]"
                }`}
              >
                {item.badge.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  if (publicPage) {
    return (
      <div className="flex min-h-screen flex-col bg-surface text-ink">
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-4">
            <Link to="/welcome" className="flex items-center gap-2 text-2xl font-semibold">
              <VerityLogo className="h-8 w-8" />
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-ink leading-none">Verity</span>
                <span className="text-[8px] font-semibold tracking-wider text-ink-muted uppercase">
                  GOVERNED KNOWLEDGE
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <GuideButton />
              <Button variant="ghost" asChild>
                <Link to="/sign-in">
                  Sign in <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border px-6 py-5 text-center text-xs text-ink-muted">
          Concept prototype by Nitin Gupta · Synthetic data · Not a Humana product
        </footer>
        <GuideRail />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#F9FAFB] text-ink ${docked ? "md:pr-80" : ""}`}>
      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-surface md:flex ${
          collapsed ? "w-[72px]" : "w-[216px]"
        }`}
      >
        <Link
          to="/"
          className="flex h-[64px] shrink-0 items-center gap-2.5 border-b border-border px-4"
        >
          <VerityLogo className="h-8 w-8 shrink-0" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-ink leading-tight">
                Verity
              </span>
              <span className="text-[8.5px] font-semibold tracking-wider text-ink-muted uppercase">
                GOVERNED KNOWLEDGE
              </span>
            </div>
          )}
        </Link>
        {nav}
        <div className="border-t border-border p-3">
          {!collapsed ? (
            <HelpModal />
          ) : (
            <div className="flex justify-center py-2">
              <HelpModal />
            </div>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div
        className={`flex min-h-screen min-w-0 flex-col ${
          collapsed ? "md:ml-[72px]" : "md:ml-[216px]"
        }`}
      >
        {/* Top Navigation */}
        <header className="sticky top-0 z-20 border-b border-border bg-surface">
          <div className="flex min-h-[64px] items-center justify-between gap-3 px-6 lg:px-8">
            {/* Left: Breadcrumbs */}
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded border border-border bg-surface text-ink-muted">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-ink-muted">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              {breadcrumbs.map((crumb, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {idx > 0 && <ChevronRight className="h-3 w-3 text-ink-muted" />}
                  <span
                    className={`text-xs ${
                      idx === breadcrumbs.length - 1
                        ? "font-semibold text-ink"
                        : "font-normal text-ink-muted"
                    }`}
                  >
                    {crumb}
                  </span>
                </div>
              ))}
            </div>

            {/* Right: Controls & Profile */}
            <div className="flex items-center gap-3">
              <PersonaPicker />
              <ChannelPicker />
              <NotificationPopover />
              <UserMenu />
            </div>
          </div>

          {/* Mobile navigation tab bar */}
          <div className="flex gap-2 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
            {SIDEBAR_ITEMS.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="shrink-0 rounded px-2.5 py-1 text-xs text-ink-muted"
                activeProps={{ className: "bg-primary/8 text-primary font-semibold" }}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </header>

        {pathname !== "/" && <ActingAsBar />}

        {/* Main Workspace Content */}
        <main
          className={`workspace-content mx-auto w-full max-w-[1536px] flex-1 px-4 py-6 sm:px-6 lg:px-8 ${
            pathname === "/" ? "" : "bg-surface"
          }`}
        >
          {children}
        </main>
      </div>
      <GuideRail />
    </div>
  );
}

export function PagePlaceholder({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="mt-6">{children}</div>
    </section>
  );
}
