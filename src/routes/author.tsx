import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertTriangle, CheckCircle2, FileText, History, Inbox, Lock, PlusCircle, RotateCcw, Search, ShieldCheck, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  decideFn, getAuthoring, ingestSourceFn, proposeFn, proposeGapFn, resetDemoFn,
} from "@/services/authoring.functions";
import type {
  ActionResult, ApproverRole, AuthoringState, CandidateView, DraftView, GapCluster, IngestView,
} from "@/services/authoring";

export const Route = createFileRoute("/author")({
  head: () => ({
    meta: [
      { title: "Author — Verity" },
      { name: "description", content: "Turn source documents into knowledge units, review and approve them, and close gaps." },
      { property: "og:title", content: "Author — Verity" },
      { property: "og:description", content: "Turn source documents into knowledge units, review and approve them, and close gaps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthorPage,
});

const PEOPLE: { name: string; role: ApproverRole; label: string }[] = [
  { name: "Dana (Knowledge author)", role: "author", label: "Dana, Knowledge author" },
  { name: "Rita (Legal)", role: "legal", label: "Rita, Legal" },
];

const BADGE = {
  conflict: { label: "In conflict", cls: "border-outcome-conflict text-outcome-conflict bg-outcome-conflict/10" },
  stale: { label: "Stale", cls: "border-border text-ink-muted bg-surface-alt" },
  retired: { label: "Retired", cls: "border-border text-ink-muted bg-surface-alt" },
};

const STATUS = {
  unchanged: { label: "Unchanged", Icon: CheckCircle2, cls: "border-border text-ink-muted bg-surface-alt" },
  changed: { label: "Changed: flagged", Icon: AlertTriangle, cls: "border-outcome-insufficient text-outcome-insufficient bg-outcome-insufficient/10" },
  new: { label: "New unit", Icon: PlusCircle, cls: "border-outcome-clarify text-outcome-clarify bg-outcome-clarify/10" },
};

function Diff({ diff }: { diff: string[] }) {
  if (!diff.length) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Word-level changes">
      {diff.map((d) => {
        const [from, to] = d.includes("->") ? d.split("->") : d.startsWith("+") ? ["", d.slice(1)] : [d.slice(1), ""];
        return (
          <li key={d} className="rounded-md bg-surface-alt px-2.5 py-1 text-sm">
            {from && <del className="bg-destructive/10 text-destructive">{from}</del>}
            {from && to && " → "}
            {to && <ins className="bg-brand-green/15 text-brand-green-dark no-underline">{to}</ins>}
          </li>
        );
      })}
    </ul>
  );
}

function RouteChip({ to }: { to: string }) {
  const legal = /legal/i.test(to);
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-semibold ${legal ? "border-outcome-unauthorized text-outcome-unauthorized" : "border-border text-ink"}`}>
      {legal ? <Lock className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
      {legal ? "Needs Legal" : "Needs author"}
    </span>
  );
}

function AuthorPage() {
  const [state, setState] = useState<AuthoringState | null>(null);
  const [personIdx, setPersonIdx] = useState(0);
  const [tab, setTab] = useState("ingest");
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const person = PEOPLE[personIdx] ?? PEOPLE[0]!;

  useEffect(() => {
    getAuthoring()
      .then(setState)
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  function apply(r: ActionResult) {
    setState(r.state);
    setFlash(r.ok ? { ok: true, text: r.message ?? "Done" } : { ok: false, text: r.error ?? "Something went wrong" });
  }

  const pending = state?.queue.filter((d) => d.status === "pending").length ?? 0;

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Author</h1>
          <p className="text-sm text-ink-muted">Source document to approved unit. AI proposes; a named person approves; Legal owns verbatim.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="author-person">Acting as</label>
          <select
            id="author-person"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={personIdx}
            onChange={(e) => setPersonIdx(Number(e.target.value))}
          >
            {PEOPLE.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => resetDemoFn().then(apply)} title="Reset to seed data">
            <RotateCcw className="h-4 w-4" /> Reset demo
          </Button>
        </div>
      </div>

      {flash && (
        <p role="status" className={`mb-4 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${flash.ok ? "bg-brand-green/10 text-brand-green-dark" : "bg-destructive/10 text-destructive"}`}>
          {flash.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {flash.text}
          {flash.ok && /live on the Ask page/.test(flash.text) && (
            <Link to="/" className="underline">Open Ask</Link>
          )}
        </p>
      )}
      {loadError && <p className="mb-4 text-sm text-destructive">Authoring unavailable: {loadError}</p>}

      <div className="grid gap-6 lg:grid-cols-5">
        <UnitList state={state} />
        <div className="lg:col-span-3">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4 flex h-auto flex-wrap justify-start">
              <TabsTrigger value="ingest"><FileText className="mr-1 h-4 w-4" />Ingest a source</TabsTrigger>
              <TabsTrigger value="queue"><Inbox className="mr-1 h-4 w-4" />Review queue{pending ? ` (${pending})` : ""}</TabsTrigger>
              <TabsTrigger value="gaps"><Search className="mr-1 h-4 w-4" />Gaps{state ? ` (${state.gaps.length})` : ""}</TabsTrigger>
              <TabsTrigger value="audit"><History className="mr-1 h-4 w-4" />Audit log</TabsTrigger>
            </TabsList>
            <TabsContent value="ingest">
              <IngestPanel state={state} onQueued={(r) => { apply(r); if (r.ok) setTab("queue"); }} />
            </TabsContent>
            <TabsContent value="queue">
              <QueuePanel state={state} person={person} onResult={apply} />
            </TabsContent>
            <TabsContent value="gaps">
              <GapsPanel state={state} onResult={(r) => { apply(r); if (r.ok) setTab("queue"); }} />
            </TabsContent>
            <TabsContent value="audit">
              <AuditPanel state={state} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}

function UnitList({ state }: { state: AuthoringState | null }) {
  return (
    <div className="lg:col-span-2">
      <h2 className="mb-2 font-semibold">Published units</h2>
      <ul className="space-y-2">
        {(state?.units ?? []).map((u) => (
          <li key={u.unit_id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="whitespace-nowrap font-mono text-xs text-ink-muted">{u.unit_id}</span>
              {u.verbatim && <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-green-dark"><Lock className="h-3 w-3" />VERBATIM</span>}
              {u.badge && <span className={`rounded border px-1.5 py-0.5 text-xs font-semibold ${BADGE[u.badge].cls}`}>{BADGE[u.badge].label}</span>}
              {u.updated && <span className="rounded border border-brand-green px-1.5 py-0.5 text-xs font-semibold text-brand-green-dark">{u.version > 1 ? "Updated" : "New"}</span>}
            </div>
            <p className={`font-semibold ${u.badge === "retired" ? "text-ink-muted line-through" : ""}`}>{u.title}</p>
            <p className="text-sm text-ink-muted">{u.owner} · v{u.version}</p>
          </li>
        ))}
        {!state && <li className="text-sm text-ink-muted">Loading…</li>}
      </ul>
    </div>
  );
}

function IngestPanel({ state, onQueued }: { state: AuthoringState | null; onQueued: (r: ActionResult) => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<IngestView | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(t: string) {
    setText(t);
    setBusy(true);
    setError(null);
    try {
      const r = await ingestSourceFn({ data: { text: t } });
      setResult(r);
      setChosen(new Set(r.candidates.filter((c) => c.status !== "unchanged").map((c) => c.cid)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const counts = result
    ? (["unchanged", "changed", "new"] as const).map((s) => [s, result.candidates.filter((c) => c.status === s).length] as const)
    : [];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-4">
        <h2 className="font-semibold">Upload or paste a source document</h2>
        <p className="mt-1 text-sm text-ink-muted">Verity splits it into candidate units and compares each with the last version of its source and with the approved units. Nothing is published from here.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(state?.samples ?? []).map((s) => (
            <Button key={s.id} variant="outline" size="sm" disabled={busy} onClick={() => run(s.text)} title={s.hint}>
              {s.label}
            </Button>
          ))}
        </div>
        <textarea
          aria-label="Source document text"
          className="mt-3 h-36 w-full rounded-md border border-border p-3 font-mono text-xs"
          value={text}
          placeholder="Paste a script or article here, or pick a sample above."
          onChange={(e) => setText(e.target.value)}
        />
        <Button className="mt-2" disabled={busy || !text.trim()} onClick={() => run(text)}>
          {busy ? "Extracting…" : "Extract units"}
        </Button>
        {error && <p className="mt-2 text-sm text-destructive">Extraction unavailable: {error}</p>}
      </div>

      {result && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-mono text-xs text-ink-muted">{result.doc_id}</span>
            <span className="font-semibold">{result.title}</span>
            <span className="text-ink-muted">· {result.owner} · effective {result.effective_date}</span>
            <span className="rounded border border-border px-1.5 py-0.5 text-xs text-ink-muted" title="Rules baseline; the model extraction agent plugs in behind the same step">extractor {result.extractor}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {counts.map(([s, n]) => {
              const S = STATUS[s];
              return (
                <span key={s} className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold ${S.cls}`}>
                  <S.Icon className="h-3 w-3" /> {n} {S.label.toLowerCase()}
                </span>
              );
            })}
          </div>
          <ul className="space-y-2">
            {result.candidates.map((c) => (
              <CandidateCard
                key={c.cid}
                c={c}
                checked={chosen.has(c.cid)}
                onToggle={() => {
                  const next = new Set(chosen);
                  if (next.has(c.cid)) next.delete(c.cid);
                  else next.add(c.cid);
                  setChosen(next);
                }}
              />
            ))}
          </ul>
          {(result.skipped.length > 0 || result.notes.length > 0) && (
            <div className="rounded-md bg-surface-alt p-3 text-sm">
              <p className="font-semibold">Not extracted as units</p>
              <ul className="mt-1 list-disc pl-5 text-ink-muted">
                {result.skipped.map((s) => (
                  <li key={s.text}><span className="text-ink">{s.reason}:</span> {s.text}</li>
                ))}
              </ul>
            </div>
          )}
          <Button
            disabled={busy || chosen.size === 0}
            onClick={async () => onQueued(await proposeFn({ data: { text, cids: [...chosen] } }))}
          >
            <Inbox className="h-4 w-4" /> Send {chosen.size} to the review queue
          </Button>
        </div>
      )}
    </div>
  );
}

function CandidateCard({ c, checked, onToggle }: { c: CandidateView; checked: boolean; onToggle: () => void }) {
  const S = STATUS[c.status];
  const selectable = c.status !== "unchanged";
  return (
    <li className={`rounded-md border p-3 ${c.status === "changed" ? "border-outcome-insufficient" : "border-border"}`}>
      <div className="flex items-start gap-3">
        {selectable ? (
          <input type="checkbox" className="mt-1 h-4 w-4" checked={checked} onChange={onToggle} aria-label={`Send ${c.title} to review`} />
        ) : (
          <span className="mt-1 h-4 w-4" />
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-semibold ${S.cls}`}>
              <S.Icon className="h-3 w-3" />{S.label}
            </span>
            <span className="font-semibold">{c.title}</span>
            <span className="text-xs text-ink-muted">{c.type} · {c.knowledge_base}</span>
            {c.verbatim && <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-green-dark"><Lock className="h-3 w-3" />VERBATIM</span>}
          </div>
          <p className="text-sm">{c.body}</p>
          {c.unit_id && (
            <p className="text-xs text-ink-muted">
              {c.status === "unchanged" ? "Same as" : "Compared with"} <span className="whitespace-nowrap font-mono">{c.unit_id}</span> {c.unit_title}
              {c.status === "changed" ? ` · ${Math.round(c.similarity * 100)}% similar` : ""}
            </p>
          )}
          {c.status === "changed" && (
            <div className="space-y-1.5">
              <Diff diff={c.diff} />
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {c.impact && <span className="font-semibold text-outcome-insufficient">Impact: {c.impact.replace(/_/g, " ")}</span>}
                <RouteChip to={c.route_to} />
              </div>
            </div>
          )}
          {c.status === "new" && <RouteChip to={c.route_to} />}
        </div>
      </div>
    </li>
  );
}

function QueuePanel({ state, person, onResult }: { state: AuthoringState | null; person: { name: string; role: ApproverRole; label: string }; onResult: (r: ActionResult) => void }) {
  const queue = state?.queue ?? [];
  const pending = queue.filter((d) => d.status === "pending");
  const done = queue.filter((d) => d.status !== "pending");
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Acting as <span className="font-semibold text-ink">{person.label}</span>. Verbatim and legal units need Legal; agents can propose but never approve.
      </p>
      {pending.length === 0 && <p className="rounded-md bg-surface-alt p-4 text-sm text-ink-muted">Nothing waiting. Ingest a source or propose a gap answer to fill the queue.</p>}
      <ul className="space-y-3">
        {pending.map((d) => (
          <DraftCard key={d.draft_id} d={d} person={person} onResult={onResult} />
        ))}
      </ul>
      {done.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink-muted">Decided</h3>
          <ul className="space-y-2">
            {done.map((d) => (
              <li key={d.draft_id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2 text-sm">
                {d.status === "approved" ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-brand-green-dark"><CheckCircle2 className="h-4 w-4" />Approved</span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-destructive"><XCircle className="h-4 w-4" />Rejected</span>
                )}
                <span className="whitespace-nowrap font-mono text-xs">{d.unit_id}</span>
                <span>{d.title}</span>
                <span className="text-ink-muted">by {d.decided_by}{d.published_version ? ` · published v${d.published_version}` : ""}{d.comment ? ` · ${d.comment}` : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DraftCard({ d, person, onResult }: { d: DraftView; person: { name: string; role: ApproverRole }; onResult: (r: ActionResult) => void }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(d.body);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const kind = d.kind === "revision" ? `Revision of ${d.unit_id}` : d.kind === "gap_proposal" ? `New unit from a gap (${d.unit_id})` : `New unit (${d.unit_id})`;

  async function decide(action: "approve" | "reject") {
    setBusy(true);
    try {
      onResult(await decideFn({
        data: {
          draft_id: d.draft_id,
          action,
          approver: { name: person.name, role: person.role },
          body: action === "approve" && editing ? body : null,
          reason: action === "reject" ? reason : null,
        },
      }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-ink-muted">{d.draft_id}</span>
        <span className="font-semibold">{kind}</span>
        <span className="text-sm">{d.title}</span>
        {d.verbatim && <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-green-dark"><Lock className="h-3 w-3" />VERBATIM</span>}
        <RouteChip to={d.route_to} />
      </div>
      <p className="text-sm text-ink-muted">{d.reason}</p>
      {d.previous_body !== null && (
        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-md bg-surface-alt p-3">
            <p className="text-xs font-semibold text-ink-muted">Approved now</p>
            <p className="text-sm">{d.previous_body}</p>
          </div>
          <div className="rounded-md border border-outcome-insufficient p-3">
            <p className="text-xs font-semibold text-outcome-insufficient">Proposed</p>
            <p className="text-sm">{d.body}</p>
          </div>
        </div>
      )}
      {d.previous_body === null && !editing && <p className="rounded-md border border-border p-3 text-sm">{d.body}</p>}
      <Diff diff={d.diff} />
      {editing && (
        <textarea aria-label="Edit before approving" className="h-24 w-full rounded-md border border-border p-2 text-sm" value={body} onChange={(e) => setBody(e.target.value)} />
      )}
      <p className="text-xs text-ink-muted">Proposed by {d.proposed_by} · owner {d.owner} · {d.knowledge_base}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={busy} onClick={() => decide("approve")}>
          <CheckCircle2 className="h-4 w-4" /> {editing ? "Approve with edits" : "Approve and publish"}
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(!editing)}>
          {editing ? "Cancel edit" : "Edit"}
        </Button>
        <input
          aria-label="Reason for rejecting"
          className="min-w-48 flex-1 rounded-md border border-border px-2 py-1.5 text-sm"
          placeholder="Reason, to reject"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("reject")}>
          <XCircle className="h-4 w-4" /> Reject
        </Button>
      </div>
    </li>
  );
}

function GapsPanel({ state, onResult }: { state: AuthoringState | null; onResult: (r: ActionResult) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        The gap analyst groups unanswered questions from the search log. It never writes the answer: an author drafts it here, and it goes through the same approval gate.
      </p>
      <ul className="space-y-3">
        {(state?.gaps ?? []).map((g) => (
          <GapCard key={g.cluster_id} g={g} onResult={onResult} />
        ))}
      </ul>
    </div>
  );
}

function GapCard({ g, onResult }: { g: GapCluster; onResult: (r: ActionResult) => void }) {
  const [title, setTitle] = useState(g.suggested_title);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <li className="space-y-2 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-ink-muted">{g.cluster_id}</span>
        <span className="rounded border border-outcome-insufficient px-1.5 py-0.5 text-xs font-semibold text-outcome-insufficient">
          {g.demand} unanswered question{g.demand === 1 ? "" : "s"}
        </span>
        <span className="text-xs text-ink-muted">{g.gap_type}</span>
      </div>
      <ul className="list-disc pl-5 text-sm">
        {g.questions.map((q) => (
          <li key={q.id}>&ldquo;{q.text}&rdquo; <span className="text-xs text-ink-muted">{q.id}</span></li>
        ))}
      </ul>
      {g.nearest && (
        <p className="text-xs text-ink-muted">
          Nearest unit: <span className="whitespace-nowrap font-mono">{g.nearest.unit_id}</span> {g.nearest.title} ({g.nearest.owner}), not a match
        </p>
      )}
      {g.proposed_draft ? (
        <p className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green-dark">
          <Inbox className="h-4 w-4" /> Draft {g.proposed_draft} is in the review queue
        </p>
      ) : (
        <div className="space-y-2">
          <input aria-label="Unit title" className="w-full rounded-md border border-border px-2 py-1.5 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            aria-label="Draft answer"
            className="h-20 w-full rounded-md border border-border p-2 text-sm"
            placeholder="Draft the approved answer (the owner or author writes this, not the model)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button
            size="sm"
            disabled={busy || !body.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                onResult(await proposeGapFn({ data: { cluster_id: g.cluster_id, title, body } }));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Inbox className="h-4 w-4" /> Send to review
          </Button>
        </div>
      )}
    </li>
  );
}

function AuditPanel({ state }: { state: AuthoringState | null }) {
  const rows = state?.audit ?? [];
  if (!rows.length) return <p className="rounded-md bg-surface-alt p-4 text-sm text-ink-muted">No authoring activity yet in this session.</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs text-ink-muted">
        <tr><th className="py-1 pr-3">Date</th><th className="pr-3">Who</th><th className="pr-3">Action</th><th className="pr-3">Unit</th><th>Detail</th></tr>
      </thead>
      <tbody>
        {rows.map((a, i) => (
          <tr key={`${a.draft_id}-${a.action}-${i}`} className="border-t border-border">
            <td className="py-1.5 pr-3 whitespace-nowrap">{a.at}</td>
            <td className="pr-3">{a.actor}</td>
            <td className="pr-3 font-semibold">{a.action}</td>
            <td className="pr-3 whitespace-nowrap font-mono text-xs">{a.unit_id}</td>
            <td>{a.detail}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
