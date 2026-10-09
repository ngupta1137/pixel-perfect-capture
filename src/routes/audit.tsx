import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequirePage } from "@/components/shell/Denied";
import { useDemoStore } from "@/services/demoStore";

export const Route = createFileRoute("/audit")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => (typeof s["id"] === "string" ? { id: s["id"] } : {}),
  head: () => ({
    meta: [
      { title: "Audit replay — Verity" },
      { name: "description", content: "Replay any answer: what was shown, which version, who approved." },
      { property: "og:title", content: "Audit replay — Verity" },
      { property: "og:description", content: "Replay any answer: what was shown, which version, who approved." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequirePage to="/audit">
      <AuditPage />
    </RequirePage>
  ),
});

function AuditPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/audit" });
  const [draft, setDraft] = useState(id ?? "");
  const requests = useDemoStore((s) => s.requests);
  const req = id ? requests.find((r) => r.id === id) : undefined;
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Audit replay</h1>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void navigate({ search: draft ? { id: draft } : {} }); }}>
        <Input aria-label="Request id" placeholder="req-…" value={draft} onChange={(e) => setDraft(e.target.value)} className="max-w-sm" />
        <Button type="submit">Replay</Button>
      </form>
      {id && !req && <p className="text-sm text-ink-muted">No request with id {id} in this demo session.</p>}
      {!id && requests.length > 0 && (
        <ul className="space-y-1 text-sm">
          {requests.slice(-8).reverse().map((r) => (
            <li key={r.id}><button type="button" className="underline" onClick={() => { setDraft(r.id); void navigate({ search: { id: r.id } }); }}>{r.id}</button> · {r.person} · “{r.query}” · {r.outcome}</li>
          ))}
        </ul>
      )}
      {req && (
        <article className="space-y-3 rounded-lg border border-border bg-background p-5 text-sm">
          <p className="font-mono text-xs text-ink-muted">{req.id} · {req.at}</p>
          <p className="text-lg">“{req.query}”</p>
          <p>Asked by <b>{req.person}</b> · {req.context.role} · {req.context.channel} · {req.context.lob ?? "?"} / {req.context.state ?? "state unknown"} / {req.context.plan_year ?? "year unknown"}</p>
          <p>Outcome shown: <b>{req.outcome}</b></p>
          <div>
            <p className="font-semibold">Units cited</p>
            {req.cited.length === 0 ? <p className="text-ink-muted">None</p> : (
              <ul className="list-disc pl-5">{req.cited.map((c) => <li key={c.unit_id}>{c.unit_id} v{c.version} · {c.title} · approved by {c.approver ?? "—"}</li>)}</ul>
            )}
          </div>
          <details><summary className="cursor-pointer font-semibold">Trace</summary><ol className="mt-2 list-decimal pl-5">{req.trace.map((t, i) => <li key={i}>{t}</li>)}</ol></details>
        </article>
      )}
    </section>
  );
}
