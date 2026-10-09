import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RequirePage } from "@/components/shell/Denied";
import { useSession } from "@/lib/session";
import { useDemoStore } from "@/services/demoStore";
import { asOfWindow, policyPath, redactQuery } from "@/services/verity";

export const Route = createFileRoute("/audit")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => (typeof s["id"] === "string" ? { id: s["id"] } : {}),
  head: () => ({
    meta: [
      { title: "Audit — Verity" },
      { name: "description", content: "Read-only audit trail, answer replay and as-of lookup of approved knowledge." },
      { property: "og:title", content: "Audit — Verity" },
      { property: "og:description", content: "Read-only audit trail, answer replay and as-of lookup of approved knowledge." },
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
  const { can } = useSession();
  return (
    <section className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Audit</h1>
        <p className="mt-1 text-sm text-ink-muted">Read only. All versions and records kept at least 6 years (design assumption). Prototype storage is not tamper-evident; production uses write-once storage.</p>
      </div>
      <Events showDetail={can("get_unit")} />
      {can("replay_answer") && <Replay />}
      {can("get_unit") && <AsOf />}
    </section>
  );
}

const field = "field-select";

function Events({ showDetail }: { showDetail: boolean }) {
  const events = useDemoStore((s) => s.audit);
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [unit, setUnit] = useState("");
  const [date, setDate] = useState("");
  const actors = [...new Set(events.map((e) => e.actor))].sort();
  const actions = [...new Set(events.map((e) => e.action))].sort();
  const rows = events.filter((e) =>
    (!actor || e.actor === actor) && (!action || e.action === action) &&
    (!unit || e.target.toLowerCase().includes(unit.toLowerCase())) && (!date || e.at.startsWith(date)));
  return (
    <div>
      <h2 className="text-lg font-semibold">Events</h2>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <select aria-label="Actor" className={field} value={actor} onChange={(e) => setActor(e.target.value)}>
          <option value="">All actors</option>{actors.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select aria-label="Action" className={field} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>{actions.map((a) => <option key={a}>{a}</option>)}
        </select>
        <Input aria-label="Unit or target" placeholder="Unit, e.g. U-PH-207" value={unit} onChange={(e) => setUnit(e.target.value)} className="w-48" />
        <Input aria-label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
      </div>
      {!showDetail && <p className="mt-2 text-xs text-ink-muted">Details hidden: your role does not read unit text or queries.</p>}
      <div className="mt-3 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left"><tr><th className="px-3 py-2">When</th><th>Actor</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead>
          <tbody>
            {rows.map((e, i) => {
              const denied = e.action === "denied";
              return (
                <tr key={i} className={`border-t border-border align-top ${denied ? "bg-destructive/5" : ""}`}>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{e.at.replace("T", " ").slice(0, 19)}</td>
                  <td className="py-2 pr-2">{e.actor}</td>
                  <td className="py-2 pr-2">
                    {denied ? <span className="inline-flex items-center gap-1 font-semibold text-destructive"><ShieldAlert className="h-3.5 w-3.5" aria-hidden /> Denied</span> : e.action}
                  </td>
                  <td className="py-2 pr-2 font-mono text-xs">{e.target}</td>
                  <td className="py-2 pr-3">
                    {denied && <p className="text-destructive">Capability <code className="font-mono">{e.capability}</code> · {e.reason}</p>}
                    {!denied && (showDetail ? e.detail : "—")}
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={5} className="px-3 py-4 text-ink-muted">No events match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Replay() {
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/audit" });
  const requests = useDemoStore((s) => s.requests);
  const [draft, setDraft] = useState(id ?? "");
  const req = id ? requests.find((r) => r.id === id) : undefined;
  const go = (v: string) => { setDraft(v); void navigate({ search: v ? { id: v } : {} }); };
  return (
    <div>
      <h2 className="text-lg font-semibold">Answer replay</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <select aria-label="Recorded request" className={field} value={req?.id ?? ""} onChange={(e) => go(e.target.value)}>
          <option value="">Select a recorded request…</option>
          {requests.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.person} · {r.outcome}</option>)}
        </select>
        <Input aria-label="Paste request id" placeholder="or paste req-…" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => draft !== (id ?? "") && go(draft.trim())} onKeyDown={(e) => e.key === "Enter" && go(draft.trim())} className="w-64" />
      </div>
      {id && !req && <p className="mt-3 text-sm text-ink-muted">No request with id {id} in this demo session.</p>}
      {req && (
        <article className="mt-4 space-y-3 rounded-lg border border-border bg-background p-5 text-sm">
          <p className="font-mono text-xs text-ink-muted">{req.id} · {req.at}</p>
          <dl className="grid grid-cols-[10rem_1fr] gap-x-3 gap-y-1">
            <dt className="text-ink-muted">Query (redacted)</dt><dd>“{redactQuery(req.query)}”</dd>
            <dt className="text-ink-muted">Person</dt><dd>{req.person} · {req.context.role} · {req.context.channel} · {req.context.input_mode}</dd>
            <dt className="text-ink-muted">Line of business</dt><dd>{req.context.lob ?? "unknown"}</dd>
            <dt className="text-ink-muted">State</dt><dd>{req.context.state ?? "unknown"}</dd>
            <dt className="text-ink-muted">Plan year</dt><dd>{req.context.plan_year ?? "unknown"}</dd>
            <dt className="text-ink-muted">Outcome</dt><dd className="font-semibold">{req.outcome}</dd>
            <dt className="text-ink-muted">Decided by</dt><dd>{policyPath(req)}</dd>
          </dl>
          <div>
            <p className="font-semibold">Units cited</p>
            {req.cited.length === 0 ? <p className="text-ink-muted">None</p> : (
              <ul className="list-disc pl-5">{req.cited.map((c) => <li key={c.unit_id}>{c.unit_id} v{c.version} · {c.title} · approved by {c.approver ?? "not recorded"}</li>)}</ul>
            )}
          </div>
          <div>
            <p className="font-semibold">Trace ({req.trace.length} steps)</p>
            <ol className="mt-1 space-y-0.5 font-mono text-xs">{req.trace.map((t) => <li key={t}>{t}</li>)}</ol>
          </div>
        </article>
      )}
    </div>
  );
}

function AsOf() {
  const units = useDemoStore((s) => s.units);
  const [unitId, setUnitId] = useState(units[0]?.unit_id ?? "");
  const [date, setDate] = useState("2026-10-09");
  const r = unitId && date ? asOfWindow(unitId, date) : null;
  return (
    <div>
      <h2 className="text-lg font-semibold">As-of lookup</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <select aria-label="Unit" className={field} value={unitId} onChange={(e) => setUnitId(e.target.value)}>
          {units.map((u) => <option key={u.unit_id} value={u.unit_id}>{u.unit_id} · {u.title}</option>)}
        </select>
        <Input aria-label="As of date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
      </div>
      {r && (
        <div className="mt-3 rounded-lg border border-border bg-background p-4 text-sm">
          {r.version ? (
            <>
              <p className="font-semibold">{r.unit.unit_id} v{r.version.version} was live on {date}</p>
              <p className="mt-1">{r.version.text}</p>
              <p className="mt-1 text-ink-muted">Approved by {r.version.approver} · effective {r.version.effective_date} to {r.until ? `${r.until} (exclusive)` : "now"}</p>
            </>
          ) : <p className="text-ink-muted">No version was live on {date}.{r.until ? ` First version effective ${r.until}.` : ""}</p>}
        </div>
      )}
    </div>
  );
}
