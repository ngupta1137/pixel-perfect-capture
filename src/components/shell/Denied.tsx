import { Link } from "@tanstack/react-router";
import { ShieldX } from "lucide-react";
import type { ReactNode } from "react";
import { CAPABILITIES, canAny, homeRoute } from "@/lib/rights";
import { useSession } from "@/lib/session";

export function Denied({ capability, reason }: { capability: string; reason?: string }) {
  const { person } = useSession();
  return (
    <section
      role="alert"
      aria-labelledby="denied-title"
      className="mx-auto max-w-2xl rounded-lg border-2 border-outcome-unauthorized bg-outcome-unauthorized/5 p-6"
    >
      <p className="flex items-center gap-2 text-sm font-bold text-outcome-unauthorized">
        <ShieldX className="h-5 w-5" aria-hidden="true" /> Access denied
      </p>
      <h1 id="denied-title" className="mt-3 text-2xl font-semibold">
        {person.name} cannot open this page
      </h1>
      <p className="mt-3 text-base">
        Missing capability: <code className="rounded bg-surface-alt px-1.5 py-0.5 font-mono text-sm">{capability}</code>
        {CAPABILITIES[capability] ? <span className="text-ink-muted"> ({CAPABILITIES[capability]})</span> : null}
      </p>
      {reason && <p className="mt-2 text-base">{reason}</p>}
      <p className="mt-4 text-base font-semibold">This attempt is recorded in the audit log.</p>
      <Link
        to={homeRoute(person)}
        className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-base font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Go to my home page
      </Link>
    </section>
  );
}

/** Route guard: renders children only when the acting person holds one of `caps`. */
export function RequireView({ caps, children }: { caps: readonly string[]; children: ReactNode }) {
  const { person, ready } = useSession();
  if (!ready) {
    return (
      <p role="status" className="text-base text-ink-muted">
        Checking your rights...
      </p>
    );
  }
  if (!canAny(person, caps)) {
    return (
      <Denied
        capability={caps.join(" or ")}
        reason={`${person.persona.label} does not hold this capability in the rights policy.`}
      />
    );
  }
  return <>{children}</>;
}

export function ComingLater({ title, intro }: { title: string; intro: string }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-base text-ink-muted">{intro}</p>
      <div className="mt-6 rounded-lg border border-dashed border-border bg-surface-alt p-6 text-base">
        Nothing here yet. This screen arrives in the next drop.
      </div>
    </section>
  );
}
