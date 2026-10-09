import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Compass, RotateCcw } from "lucide-react";
import { GuideRail, useGuideKeys } from "@/components/shell/GuideRail";
import { guide, useGuide } from "@/lib/guide";
import { VerityLogo } from "./VerityLogo";
import { Button } from "@/components/ui/button";
import { PersonaPicker } from "@/components/shell/PersonaPicker";
import { ActingAsBar } from "@/components/shell/ActingAsBar";
import { useSession } from "@/lib/session";
import { navFor } from "@/lib/rights";
import { resetDemo } from "@/services/verity";

function ChannelSwitch() {
  const { channel, setChannel, allowedChannels, can } = useSession();
  if (!can("search")) return null;
  return (
    <>
      <label className="sr-only" htmlFor="channel">Channel</label>
      <select id="channel" className="field-select" value={channel} onChange={(e) => setChannel(e.target.value)}>
        {allowedChannels.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>
    </>
  );
}

function ResetDemo() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await resetDemo();
        setBusy(false);
      }}
    >
      <RotateCcw className="h-4 w-4" /> {busy ? "Resetting…" : "Reset demo"}
    </Button>
  );
}

function GuideButton() {
  const open = useGuide((s) => s.open);
  return (
    <Button variant={open ? "default" : "outline"} size="sm" aria-pressed={open} title="Demo guide (g)" onClick={guide.toggle}>
      <Compass className="h-4 w-4" /> Guide
    </Button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { person } = useSession();
  useGuideKeys();
  const docked = useGuide((s) => s.open && !s.collapsed);
  const plain = useRouterState({ select: (s) => s.location.pathname === "/story" });
  return (
    <div className={`flex min-h-screen flex-col bg-surface text-ink ${docked ? "md:pr-80" : ""}`}>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <Link to="/" className="flex items-center gap-2">
            <VerityLogo />
            <span className="text-xl font-semibold tracking-tight">Verity</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {!plain && <PersonaPicker />}
            {!plain && <ChannelSwitch />}
            <GuideButton />
          </div>
        </div>
        {!plain && <nav className="mx-auto flex max-w-6xl gap-6 px-6">
          {navFor(person).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              className="border-b-2 border-transparent py-2 text-sm text-ink-muted hover:text-ink"
              activeProps={{ className: "!border-brand-green-dark !text-brand-green-dark font-semibold" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>}
      </header>
      {!plain && <ActingAsBar />}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
      <footer className="border-t border-border bg-surface-alt">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <p className="text-sm text-ink-muted">Concept prototype by Nitin Gupta · Synthetic data · Not a Humana product</p>
          <ResetDemo />
        </div>
      </footer>
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
