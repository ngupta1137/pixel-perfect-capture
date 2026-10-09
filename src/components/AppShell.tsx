import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Compass,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  ShieldCheck,
  CircleHelp,
  ArrowUpRight,
  Headphones,
} from "lucide-react";
import { GuideRail, useGuideKeys } from "@/components/shell/GuideRail";
import { guide, useGuide } from "@/lib/guide";
import { VerityLogo } from "./VerityLogo";
import { Button } from "@/components/ui/button";
import { PersonaPicker } from "@/components/shell/PersonaPicker";
import { ActingAsBar } from "@/components/shell/ActingAsBar";
import { useSession } from "@/lib/session";
import { navFor } from "@/lib/rights";
import { resetDemo } from "@/services/verity";
import { WORKSPACE_GROUPS, PAGE_ICONS } from "@/components/workspace/navigation";

function ResetDemo() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await resetDemo();
        } finally {
          setBusy(false);
        }
      }}
    >
      <RotateCcw />
      {busy ? "Resetting…" : "Reset demo"}
    </Button>
  );
}
function GuideButton() {
  const open = useGuide((s) => s.open);
  return (
    <Button variant="ghost" size="sm" aria-pressed={open} title="Demo guide" onClick={guide.toggle}>
      <Compass />
      Guide
    </Button>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  const { person, channel, setChannel, allowedChannels, can } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const docked = useGuide((s) => s.open && !s.collapsed);
  useGuideKeys();
  const publicPage = ["/welcome", "/sign-in", "/onboarding", "/story"].includes(pathname);
  const items = navFor(person);
  const current = items.find((n) => n.to === pathname);
  const nav = (
    <nav aria-label="Workspace navigation" className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
      {WORKSPACE_GROUPS.map((group) => {
        const links = items.filter((n) => group.paths.some((path) => path === n.to));
        if (!links.length) return null;
        return (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-3 px-3 text-[10px] font-semibold text-ink-muted">{group.label}</p>
            )}
            <div className="space-y-1">
              {links.map((n) => {
                const Icon = PAGE_ICONS[n.to];
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    activeOptions={{ exact: true }}
                    title={n.label}
                    className="flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-[13px] text-ink-muted transition-colors hover:bg-muted hover:text-ink"
                    activeProps={{ className: "bg-primary/8 text-primary font-semibold" }}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span>{n.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
  if (publicPage)
    return (
      <div className="flex min-h-screen flex-col bg-surface text-ink">
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-5">
            <Link to="/welcome" className="flex items-center gap-2 text-2xl font-semibold">
              <VerityLogo />
              Verity
            </Link>
            <div className="flex items-center gap-2">
              <GuideButton />
              <Button variant="ghost" asChild>
                <Link to="/sign-in">
                  Sign in <ArrowUpRight />
                </Link>
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border px-6 py-6 text-center text-xs text-ink-muted">
          Concept prototype by Nitin Gupta · Synthetic data · Not a Humana product
        </footer>
        <GuideRail />
      </div>
    );
  return (
    <div className={`min-h-screen bg-surface-alt text-ink ${docked ? "md:pr-80" : ""}`}>
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-surface md:flex ${collapsed ? "w-[72px]" : "w-[188px]"}`}
      >
        <Link
          to="/"
          className="flex h-[64px] shrink-0 items-center gap-2.5 border-b border-border px-5"
        >
          <VerityLogo className="h-8 w-8 shrink-0" />
          {!collapsed && (
            <span className="text-2xl font-semibold">
              Verity
              <span className="block text-[9px] font-medium text-ink-muted">
                GOVERNED KNOWLEDGE
              </span>
            </span>
          )}
        </Link>
        {nav}
        <div className="border-t border-border p-3">
          <Link
            to="/story"
            title="Why Verity exists"
            className="flex items-center gap-3 px-3 py-2 text-xs text-ink-muted"
          >
            <CircleHelp className="h-4 w-4 shrink-0" />
            {!collapsed && "Why Verity exists"}
          </Link>
          <Link
            to="/welcome"
            title="Verity website"
            className="flex items-center gap-3 px-3 py-2 text-xs text-ink-muted"
          >
            <ArrowUpRight className="h-4 w-4 shrink-0" />
            {!collapsed && "Verity website"}
          </Link>
        </div>
      </aside>
      <div
        className={`flex min-h-screen min-w-0 flex-col ${collapsed ? "md:ml-[72px]" : "md:ml-[188px]"}`}
      >
        <header className="border-b border-border bg-surface">
          <div className="grid min-h-[64px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-2 sm:flex sm:justify-between lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
                title={collapsed ? "Expand navigation" : "Collapse navigation"}
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
              </Button>
              <ChevronRight className="hidden h-3 w-3 text-ink-muted lg:block" />
              <span className="text-sm font-medium">{current?.label ?? "Verity"}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <PersonaPicker />
              {pathname === "/" && can("search") && (
                <label className="hidden items-center gap-2 rounded-md border border-border px-2 sm:flex">
                  <Headphones className="h-4 w-4 text-ink-muted" />
                  <select
                    aria-label="Channel"
                    id="channel"
                    className="h-10 max-w-[120px] bg-surface text-xs"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  >
                    {allowedChannels.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <span className="hidden lg:inline-flex">
                <GuideButton />
              </span>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
            {items.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="shrink-0 rounded px-2 py-1 text-xs text-ink-muted"
                activeProps={{ className: "bg-primary/8 text-primary font-semibold" }}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </header>
        <ActingAsBar />
        <main
          className={`workspace-content mx-auto w-full max-w-[1440px] flex-1 px-4 py-7 lg:px-8 ${pathname === "/" ? "bg-surface" : ""}`}
        >
          {can("search") && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs text-ink-muted">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Plan-approved knowledge<span className="text-border">/</span>Synthetic workspace
              </span>
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                Channel
                <select
                  aria-label="Channel"
                  id="channel"
                  className="field-select"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                >
                  {allowedChannels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {children}
        </main>
        <footer className="border-t border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 lg:px-8">
            <p className="text-[11px] text-ink-muted">
              Concept prototype by Nitin Gupta · Synthetic data · Not a Humana product
            </p>
            <ResetDemo />
          </div>
        </footer>
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
