import { createFileRoute } from "@tanstack/react-router";
import { Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RequirePage } from "@/components/shell/Denied";
import { Chip } from "@/components/authoring/Chain";
import { useSession } from "@/lib/session";
import { getDemoState, useDemoStore } from "@/services/demoStore";
import { aepReadiness, reverifyUnit, reviewQueue } from "@/services/verity";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Needs my review — Verity" },
      { name: "description", content: "Ranked stale, conflict, flagged and AEP items with demand, due date and verifier." },
      { property: "og:title", content: "Needs my review — Verity" },
      { property: "og:description", content: "Ranked stale, conflict, flagged and AEP items with demand, due date and verifier." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequirePage to="/review">
      <ReviewPage />
    </RequirePage>
  ),
});

function ReviewPage() {
  const { person, can } = useSession();
  // Recompute whenever anything in the store changes.
  useDemoStore((s) => s);
  const s = getDemoState();
  const items = reviewQueue(s);
  const ready = aepReadiness(s);
  const pct = Math.round((ready.done / ready.total) * 100);
  return (
    <section className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Review workspace</h1><p className="mt-2 text-sm text-ink-muted">Prioritize stale, conflicting, and flagged knowledge by demand.</p></div>
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="font-semibold">AEP 2027 readiness: {ready.done} of {ready.total} ({pct}%)</p>
        <Progress value={pct} className="mt-2" aria-label="AEP readiness" />
        <ul className="mt-3 grid gap-1 text-sm md:grid-cols-2">
          {ready.items.map((i) => (
            <li key={i.label} className="flex items-center gap-1.5">
              {i.done ? <Check className="h-4 w-4 text-brand-green-dark" aria-hidden /> : <Circle className="h-4 w-4 text-ink-muted" aria-hidden />}
              <span className={i.done ? "" : "text-ink-muted"}>{i.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="overflow-x-auto rounded-md border border-border bg-surface"><table className="w-full text-sm">
        <thead className="text-left text-ink-muted">
          <tr className="border-b border-border"><th className="py-2">#</th><th>Kind</th><th>Item</th><th>Demand</th><th>Due</th><th>Verifier</th><th /></tr>
        </thead>
        <tbody>
          {items.map((it, n) => (
            <tr key={it.key} className={`border-b border-border ${it.done ? "text-ink-muted" : ""}`}>
              <td className="py-2">{n + 1}</td>
              <td><Chip tone={it.kind === "Stale" || it.kind === "Conflict" ? "bad" : it.kind === "Flagged" ? "warn" : "info"}>{it.kind}</Chip></td>
              <td className="pr-3">{it.title}{it.unit_id && <span className="ml-1 font-mono text-xs text-ink-muted">{it.unit_id}</span>}</td>
              <td>{it.demand}</td>
              <td>{it.due}</td>
              <td>{it.verifier}</td>
              <td className="py-2 text-right">
                {it.done ? <span className="text-xs">Re-verified</span> : it.unit_id ? (
                  <Button size="sm" variant="outline" disabled={!can("reverify_unit")} onClick={() => { if (it.unit_id) reverifyUnit(person.name, it.unit_id); }}>Re-verify</Button>
                ) : <span className="text-xs">Needs a new unit</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </section>
  );
}
