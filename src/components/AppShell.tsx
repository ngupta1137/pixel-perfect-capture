import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { CalendarClock } from "lucide-react";
import { VerityLogo } from "./VerityLogo";
import { PersonaPicker } from "./shell/PersonaPicker";
import { useSession } from "@/lib/session";
import { isStaff, navFor } from "@/lib/rights";
import { getAepStatus } from "@/services/verity";
import type { AepStatus } from "@/services/contracts";

function ActingAsBar() {
  const { person, channel, setChannel, allowedChannels, can } = useSession();
  const shown = person.capabilities.slice(0, 6);
  const more = person.capabilities.length - shown.length;
  return (
    <div className="border-b border-border bg-surface-alt">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-6 py-2 text-base">
        <p>
          You are <span className="font-semibold">{person.name}</span>, {person.persona.label}. You can:
        </p>
        <ul className="flex flex-wrap gap-1" aria-label="Capabilities">
          {shown.map((c) => (
            <li key={c} className="rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-xs">
              {c}
            </li>
          ))}
        </ul>
        {more > 0 && <span className="text-sm text-ink-muted">+ {more} more</span>}
        <Link to="/rights" className="text-sm font-semibold text-brand-green-dark underline underline-offset-4">
          See all rights
        </Link>
        {can("search") && allowedChannels.length > 1 && (
          <label className="ml-auto flex items-center gap-2 text-sm text-ink-muted">
            Channel
            <select className="field-select" value={channel} onChange={(e) => setChannel(e.target.value)}>
              {allowedChannels.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}

function AepBanner() {
  const [aep, setAep] = useState<AepStatus | null>(null);
  useEffect(() => {
    void getAepStatus().then(setAep);
  }, []);
  if (!aep) return null;
  return (
    <div className="border-b border-outcome-clarify/40 bg-outcome-clarify/10">
      <p className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-6 py-2 text-base">
        <CalendarClock className="h-4 w-4 text-outcome-clarify" aria-hidden="true" />
        <span className="font-semibold">Annual Election Period opens {aep.opensOn}.</span>
        <span>
          Plan year {aep.planYear} content: {aep.approved} of {aep.total} units approved
        </span>
        <span className="rounded border border-border bg-surface px-1.5 text-xs text-ink-muted">Illustrative</span>
      </p>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { person } = useSession();
  const nav = navFor(person);
  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <Link to="/" className="flex items-center gap-2">
            <VerityLogo />
            <span className="text-xl font-semibold tracking-tight">Verity</span>
          </Link>
          <PersonaPicker />
        </div>
        <nav aria-label="Main" className="mx-auto flex max-w-6xl flex-wrap gap-x-6 px-6">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              className="border-b-2 border-transparent py-2 text-base text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              activeProps={{ className: "!border-brand-green-dark !text-brand-green-dark font-semibold", "aria-current": "page" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <ActingAsBar />
      {isStaff(person) && <AepBanner />}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t border-border bg-surface-alt">
        <p className="mx-auto max-w-6xl px-6 py-4 text-sm text-ink-muted">
          Concept prototype by Nitin Gupta, synthetic data, not a Humana product
        </p>
      </footer>
    </div>
  );
}
