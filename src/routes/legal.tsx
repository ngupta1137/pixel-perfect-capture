import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequirePage } from "@/components/shell/Denied";
import { Chip, Lifecycle, WordDiff } from "@/components/authoring/Chain";
import { useSession } from "@/lib/session";
import { useDemoStore, type ChainDraft } from "@/services/demoStore";
import { decideBlocker, decideChainDraft, editDraftWording, startReview } from "@/services/verity";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Legal queue — Verity" },
      { name: "description", content: "Decide proposed wording with a side-by-side diff and the publication gate result." },
      { property: "og:title", content: "Legal queue — Verity" },
      { property: "og:description", content: "Decide proposed wording with a side-by-side diff and the publication gate result." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequirePage to="/legal">
      <LegalPage />
    </RequirePage>
  ),
});

function LegalPage() {
  const drafts = useDemoStore((s) => s.chainDrafts);
  const units = useDemoStore((s) => s.units);
  const open = drafts.filter((d) => d.status === "proposed" || d.status === "in_review");
  const decided = drafts.filter((d) => d.status === "approved" || d.status === "rejected");
  return (
    <section>
      <h1 className="text-2xl font-semibold">Approval workspace</h1><p className="mt-2 text-sm text-ink-muted">Compare proposed wording, check impact, and record a human decision.</p>
      <Tabs defaultValue="decide" className="mt-4">
        <TabsList>
          <TabsTrigger value="decide">To decide ({open.length})</TabsTrigger>
          <TabsTrigger value="vault">Verbatim vault</TabsTrigger>
          <TabsTrigger value="decided">Decided ({decided.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="decide" className="space-y-4">
          {open.length === 0 && <p className="mt-4 text-sm text-ink-muted">Nothing to decide. Drafts appear here when an author proposes them.</p>}
          {open.map((d) => <DraftCard key={d.id} d={d} />)}
        </TabsContent>
        <TabsContent value="vault">
          <ul className="mt-4 space-y-3">
            {units.filter((u) => u.verbatim).map((u) => {
              const v = u.versions.at(-1);
              if (!v) return null;
              return (
                <li key={u.unit_id} className="rounded-lg border border-border bg-background p-4 text-sm">
                  <p className="flex items-center gap-1.5 font-semibold"><Lock className="h-3.5 w-3.5" aria-hidden /> {u.title} <span className="font-mono text-xs text-ink-muted">{u.unit_id} v{v.version}</span></p>
                  <p className="mt-1">{v.text}</p>
                  <p className="mt-1 text-xs text-ink-muted">Approved by {v.approver} · effective {v.effective_date}</p>
                </li>
              );
            })}
          </ul>
        </TabsContent>
        <TabsContent value="decided" className="space-y-3">
          {decided.length === 0 && <p className="mt-4 text-sm text-ink-muted">No decisions yet.</p>}
          {decided.map((d) => (
            <div key={d.id} className="rounded-lg border border-border bg-background p-4">
              <p className="font-semibold">{d.title} <span className="font-mono text-xs text-ink-muted">{d.unit_id}</span></p>
              <div className="mt-2"><Lifecycle d={d} /></div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </section>
  );
}

function DraftCard({ d }: { d: ChainDraft }) {
  const { person, can } = useSession();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(d.proposed_text);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const blocker = decideBlocker(person, d);
  const gateBlocked = !!d.gate?.blocking.length;
  const reviewed = d.status === "in_review";
  const approveReason = blocker ?? (!reviewed ? "Open the impact check first" : gateBlocked ? d.gate?.blocked_reason ?? "Blocked by the publication gate" : null);
  return (
    <article className="mt-4 rounded-lg border border-border bg-background p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{d.title}</h2>
        <span className="font-mono text-xs text-ink-muted">{d.unit_id}</span>
        <Chip tone={d.route === "legal" ? "bad" : "warn"}>{d.route === "legal" ? "Needs Legal" : `Needs owner (${d.owner_team})`}</Chip>
        {d.verbatim && <Chip tone="bad">Verbatim</Chip>}
        {d.tags.map((t) => <Chip key={t} tone="info">{t}</Chip>)}
        <span className="text-xs text-ink-muted">Proposed by {d.proposed_by} · effective {d.effective_date}</span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="border-l-2 border-border bg-surface-alt p-4 text-sm">
          <p className="mb-1 text-xs font-bold uppercase text-ink-muted">Current approved</p>
          <p>{d.current_text ?? "None (new unit)"}</p>
        </div>
        <div className="border-l-2 border-border bg-surface-alt p-4 text-sm">
          <p className="mb-1 text-xs font-bold uppercase text-ink-muted">Proposed</p>
          {editing ? (
            <>
              <Textarea aria-label="Edit wording" value={text} onChange={(e) => setText(e.target.value)} rows={4} />
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => { editDraftWording(person.name, d.id, text); setEditing(false); }}>Save wording</Button>
                <Button size="sm" variant="ghost" onClick={() => { setText(d.proposed_text); setEditing(false); }}>Cancel</Button>
              </div>
            </>
          ) : <WordDiff from={d.current_text ?? ""} to={d.proposed_text} />}
        </div>
      </div>

      <div className="mt-4">
        {!reviewed ? (
          <Button variant="outline" onClick={() => startReview(person.name, d.id)}>Run impact check</Button>
        ) : gateBlocked ? (
          <div className="rounded-md border-2 border-destructive bg-destructive/5 p-3 text-sm">
            <p className="flex items-center gap-1.5 font-semibold text-destructive"><ShieldAlert className="h-4 w-4" aria-hidden /> {d.gate?.blocked_reason} · checked {d.gate?.checked} cases, {d.gate?.blocking.length} blocking</p>
            {d.gate?.blocking.map((b) => (
              <div key={b.case} className="mt-2">
                <p className="font-mono text-xs">{b.case}</p>
                <p><span className="font-semibold">Was:</span> {b.was}</p>
                <p><span className="font-semibold">Now:</span> {b.now}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="flex items-center gap-1.5 rounded-md border border-brand-green-dark p-3 text-sm font-semibold text-brand-green-dark"><ShieldCheck className="h-4 w-4" aria-hidden /> Impact: checked {d.gate?.checked} cases, 0 blocking</p>
        )}
      </div>

      <div className="mt-4"><Lifecycle d={d} /></div>

      <div className="mt-4 flex flex-wrap items-start gap-3">
        <Reasoned reason={approveReason}>
          <Button disabled={!!approveReason} onClick={() => setMsg(decideChainDraft(person, d.id, "approve").message)}>Approve and publish</Button>
        </Reasoned>
        <Reasoned reason={blocker}>
          <Button variant="outline" disabled={!!blocker} onClick={() => setRejecting(true)}>Reject</Button>
        </Reasoned>
        <Reasoned reason={can("approve_legal") ? null : "Edit wording: Legal only"}>
          <Button variant="ghost" disabled={!can("approve_legal") || editing} onClick={() => setEditing(true)}>Edit wording</Button>
        </Reasoned>
      </div>
      {rejecting && (
        <div className="mt-3 space-y-2">
          <Textarea aria-label="Reason for rejecting" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" rows={2} />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={!reason.trim()} onClick={() => setMsg(decideChainDraft(person, d.id, "reject", reason).message)}>Confirm reject</Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
          </div>
          {!reason.trim() && <p className="text-xs text-ink-muted">A reason is required to reject.</p>}
        </div>
      )}
      {msg && <p className="mt-2 text-sm font-semibold" role="status">{msg}</p>}
    </article>
  );
}

function Reasoned({ reason, children }: { reason: string | null; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {children}
      {reason && <span className="max-w-56 text-xs text-ink-muted">{reason}</span>}
    </div>
  );
}
