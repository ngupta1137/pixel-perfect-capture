import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runDrift, type DriftResult } from "@/services/engine.functions";

export const Route = createFileRoute("/author")({
  head: () => ({
    meta: [
      { title: "Author — Verity" },
      { name: "description", content: "Manage knowledge units and check revised sources for drift." },
      { property: "og:title", content: "Author — Verity" },
      { property: "og:description", content: "Manage knowledge units and check revised sources for drift." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthorPage,
});

type Badge = "conflict" | "stale" | "retired" | undefined;
const UNITS: { id: string; title: string; owner?: string; v?: number; verbatim?: boolean; badge?: Badge }[] = [
  { id: "U-PH-003", title: "Pricing disclaimer (Rx)", owner: "Compliance", v: 1, verbatim: true },
  { id: "U-SH-002", title: "Call closing", owner: "Compliance", v: 2, verbatim: true },
  { id: "U-PH-006", title: "Mail order delivery time", owner: "Pharmacy Ops", v: 1 },
  { id: "U-PH-007", title: "Days supply by mail (90-day)", owner: "Pharmacy Ops", v: 1 },
  { id: "U-PH-107", title: "Days supply by mail (100-day, legacy)", owner: "Outbound Pharmacy", v: 3, badge: "conflict" },
  { id: "U-PH-008", title: "Mail order shipping cost", owner: "Pharmacy Ops", v: 1, badge: "stale" },
  { id: "U-SH-000", title: "Call closing (old)", badge: "retired" },
];

const BADGE = {
  conflict: { label: "In conflict", cls: "border-outcome-conflict text-outcome-conflict bg-outcome-conflict/10" },
  stale: { label: "Stale", cls: "border-border text-ink-muted bg-surface-alt" },
  retired: { label: "Retired", cls: "border-border text-ink-muted bg-surface-alt" },
};

const APPROVED = "The prices I share today are estimates based on your current plan and may change.";
const PREFILL = "The prices I share today are estimates based on your current plan and will not change.";
const FORMAT_ONLY = "The prices I share today  are estimates based on your current plan and may change .";

function AuthorPage() {
  const [text, setText] = useState(PREFILL);
  const [result, setResult] = useState<DriftResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function check(after: string) {
    setText(after);
    setBusy(true);
    setError(null);
    try {
      // Real drift detector from the Verity engine, run server-side.
      setResult(await runDrift({ data: { before: APPROVED, after, verbatim: true } }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Author</h1>
        <span className="rounded-full border border-border bg-surface-alt px-3 py-1 text-sm">Dana, Knowledge author</span>
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <ul className="space-y-2 lg:col-span-2">
          {UNITS.map((u) => (
            <li key={u.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-ink-muted">{u.id}</span>
                {u.verbatim && <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-green-dark"><Lock className="h-3 w-3" />VERBATIM</span>}
                {u.badge && <span className={`rounded border px-1.5 py-0.5 text-xs font-semibold ${BADGE[u.badge].cls}`}>{BADGE[u.badge].label}</span>}
              </div>
              <p className={`font-semibold ${u.badge === "retired" ? "text-ink-muted line-through" : ""}`}>{u.title}</p>
              {u.owner && <p className="text-sm text-ink-muted">{u.owner} · v{u.v}</p>}
            </li>
          ))}
        </ul>
        <div className="rounded-lg border border-border p-5 lg:col-span-3">
          <h2 className="font-semibold">Upload a revised source</h2>
          <p className="mt-1 text-sm text-ink-muted">Compared against approved verbatim U-PH-003: &ldquo;{APPROVED}&rdquo;</p>
          <textarea className="mt-3 h-28 w-full rounded-md border border-border p-3" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => check(text)}>Check against approved units</Button>
            <Button variant="outline" disabled={busy} onClick={() => check(FORMAT_ONLY)}>Formatting-only change</Button>
          </div>
          {error && <p className="mt-4 text-sm text-destructive">Drift check unavailable: {error}</p>}
          {result && result.flag && (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-ink-muted">Word-level diff against U-PH-003 · Pricing disclaimer (Rx) · v1</p>
              <ul className="flex flex-wrap gap-2">
                {result.diff.map((d) => {
                  const [from, to] = d.includes("->") ? d.split("->") : d.startsWith("+") ? ["", d.slice(1)] : [d.slice(1), ""];
                  return (
                    <li key={d} className="rounded-md bg-surface-alt px-3 py-1.5">
                      {from && <del className="bg-destructive/10 text-destructive">{from}</del>}
                      {from && to && " → "}
                      {to && <ins className="bg-brand-green/15 text-brand-green-dark no-underline">{to}</ins>}
                    </li>
                  );
                })}
              </ul>
              <span className="inline-flex items-center gap-1 rounded bg-destructive px-2 py-1 text-sm font-semibold text-primary-foreground">
                <AlertTriangle className="h-4 w-4" /> Drift flagged: {result.impact.replace(/_/g, " ")}
              </span>
              <p className="font-semibold">Routed to: {result.route_to}</p>
              <p className="text-sm text-ink-muted">Any change to verbatim is flagged, whatever its similarity ({Math.round(result.similarity * 100)}% here). A model may raise priority but can never clear a flag.</p>
            </div>
          )}
          {result && !result.flag && (
            <p className="mt-5 inline-flex items-center gap-2 font-semibold text-brand-green-dark">
              <CheckCircle2 className="h-5 w-5" /> No flag: identical after normalization
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
