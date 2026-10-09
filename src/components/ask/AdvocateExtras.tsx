import { useState } from "react";
import { Check, Copy, Flag, Lock, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CHANNELS } from "@/lib/session";
import { flagAnswer, getUnit, giveFeedback, UNIT_META, type Citation } from "@/services/verity";

export function ContextBar({ lob, setLob, state, setState, planYear, setPlanYear, highlight }: {
  lob: string; setLob: (v: string) => void; state: string; setState: (v: string) => void;
  planYear: string; setPlanYear: (v: string) => void; highlight: boolean;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-2 mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-surface-alt px-2 py-3 text-sm">
      <label className="flex items-center gap-2 text-ink-muted">
        Line of business
        <select className="field-select" value={lob} onChange={(e) => setLob(e.target.value)}>
          <option value="MAPD">MAPD</option>
          <option value="PDP">PDP</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-ink-muted">
        State
        <select className={`field-select ${highlight ? "border-outcome-clarify ring-2 ring-outcome-clarify" : ""}`} value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">Unknown</option>
          <option value="KY">KY</option>
          <option value="FL">FL</option>
          <option value="OH">OH</option>
        </select>
      </label>
      <div className="flex items-center gap-2 text-ink-muted" role="group" aria-label="Plan year">
        Plan year
        <div className="inline-flex overflow-hidden rounded-md border border-border">
          {["2026", "2027"].map((y) => (
            <Button variant="ghost" size="sm" key={y} type="button" aria-pressed={planYear === y}
              onClick={() => setPlanYear(planYear === y ? "" : y)}
              className={`px-3 py-1 font-semibold ${planYear === y ? "bg-primary text-primary-foreground" : "bg-surface text-ink"}`}>
              {y}
            </Button>
          ))}
        </div>
        {!planYear && <span className="text-xs text-outcome-clarify">Unknown</span>}
      </div>
      <span className="rounded-full border border-border bg-surface-alt px-2 py-0.5 text-xs font-semibold text-ink">AEP opens Oct 15</span>
      <span className="text-xs text-ink-muted">Answers apply to this context</span>
    </div>
  );
}

export function DisclosureStep({ title, text, done, onDone }: { title: string; text: string; done: boolean; onDone: () => void }) {
  return (
    <section className="mb-4 border-l-[3px] border-brand-green-dark bg-surface px-5 py-4">
      <p className="text-sm font-bold text-brand-green-dark">Step 1 · Read before discussing benefits</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs font-bold tracking-wide text-ink-muted">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" /> READ EXACTLY AS WRITTEN · {title}
      </p>
      <p className="mt-2 select-all text-base leading-relaxed">{text}</p>
      <label className="mt-3 flex items-center gap-2 font-semibold">
        <Checkbox checked={done} disabled={done} onCheckedChange={(v) => v && onDone()} aria-label="I read this" />
        I read this
      </label>
      <p className="mt-2 text-xs text-ink-muted">Recorded attestation. Speech analytics on recordings is the production control.</p>
    </section>
  );
}

export function RequestIdChip({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" title="Copy request id"
      onClick={async () => { await navigator.clipboard?.writeText(id); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-alt px-2 py-0.5 font-mono text-xs text-ink-muted hover:text-ink">
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {id}
    </button>
  );
}

export function FeedbackRow({ person, requestId, unitIds }: { person: string; requestId: string; unitIds: string[] }) {
  const [rated, setRated] = useState<"up" | "down" | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const rate = (r: "up" | "down") => { setRated(r); giveFeedback(person, requestId, r); };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" size="sm" aria-pressed={rated === "up"} aria-label="Helpful" onClick={() => rate("up")}><ThumbsUp /></Button>
      <Button variant="ghost" size="sm" aria-pressed={rated === "down"} aria-label="Not helpful" onClick={() => rate("down")}><ThumbsDown /></Button>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={!!sent}><Flag /> Flag this answer</Button>
      {sent && <span role="status" className="text-sm text-brand-green-dark">Flagged. Review task sent to {sent}.</span>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag this answer</DialogTitle>
            <DialogDescription>The unit owner gets a review task with this reason.</DialogDescription>
          </DialogHeader>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason"
            className="min-h-24 w-full rounded-md border border-border bg-surface p-3 text-sm" placeholder="What is wrong with this answer?" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!reason.trim()} onClick={() => { setSent(flagAnswer(person, requestId, unitIds, reason.trim()).owner); setOpen(false); }}>Send flag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function UnitDrawer({ citation, onClose }: { citation: Citation | null; onClose: () => void }) {
  const unit = citation ? getUnit(citation.unit_id) : null;
  const meta = citation ? UNIT_META[citation.unit_id] : undefined;
  const rows: [string, string][] = citation ? [
    ["Unit", citation.unit_id],
    ["Version", `v${citation.version}`],
    ["Effective", citation.effective_date],
    ["Approved", (() => { const v = unit?.versions.find((x) => x.version === citation.version); return v ? `v${v.version} · approved by ${v.approver} · effective ${v.effective_date}` : "Not recorded"; })()],
    ["Owner", citation.owner],
    ["Verifier", meta?.verifier ?? "Not recorded"],
    ["Review date", meta?.review_date ?? "Not recorded"],
    ["Applies to", meta?.applies_to ?? "Not recorded"],
    ["Channels", meta ? meta.channels.map((c) => CHANNELS.find((x) => x.id === c)?.label ?? c).join(", ") : "Not recorded"],
    ["Status", unit?.status ?? "unknown"],
  ] : [];
  return (
    <Sheet open={!!citation} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{citation?.title}</SheetTitle>
          <SheetDescription>Approved unit details</SheetDescription>
        </SheetHeader>
        <dl className="mt-4 space-y-2 px-4 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[7rem_1fr] gap-2">
              <dt className="text-ink-muted">{k}</dt><dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </SheetContent>
    </Sheet>
  );
}
