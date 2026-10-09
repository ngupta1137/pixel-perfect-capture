import { useState } from "react";
import {
  Check,
  Copy,
  Flag,
  Lock,
  ThumbsDown,
  ThumbsUp,
  MapPin,
  CalendarDays,
  BriefcaseBusiness,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CHANNELS } from "@/lib/session";
import { flagAnswer, getUnit, giveFeedback, UNIT_META, type Citation } from "@/services/verity";

export function ContextBar({
  lob,
  setLob,
  state,
  setState,
  planYear,
  setPlanYear,
  highlight,
}: {
  lob: string;
  setLob: (v: string) => void;
  state: string;
  setState: (v: string) => void;
  planYear: string;
  setPlanYear: (v: string) => void;
  highlight: boolean;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
      {/* Line of Business Pill */}
      <div className="relative flex items-center rounded-lg border border-border bg-[#F9FAFB]/80 hover:bg-[#F3F4F6] px-3 py-1.5 transition-colors focus-within:ring-2 focus-within:ring-ring">
        <span className="mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-ink-muted/60 text-[10px] font-bold text-ink-muted">
          A
        </span>
        <span className="mr-2 text-ink-muted text-xs">Line of business</span>
        <span className="font-semibold text-ink text-xs">{lob}</span>
        <select
          aria-label="Line of business"
          value={lob}
          onChange={(e) => setLob(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        >
          <option value="MAPD">MAPD</option>
          <option value="PDP">PDP</option>
        </select>
        <svg
          className="ml-2 h-3.5 w-3.5 shrink-0 text-ink-muted pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* State Pill */}
      <div
        className={`relative flex items-center rounded-lg border border-border bg-[#F9FAFB]/80 hover:bg-[#F3F4F6] px-3 py-1.5 transition-colors focus-within:ring-2 focus-within:ring-ring ${
          highlight ? "ring-2 ring-outcome-clarify border-outcome-clarify" : ""
        }`}
      >
        <MapPin className="mr-2 h-3.5 w-3.5 shrink-0 text-ink-muted" />
        <span className="mr-2 text-ink-muted text-xs">State</span>
        <span className="font-semibold text-ink text-xs">{state || "Unknown"}</span>
        <select
          aria-label="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        >
          <option value="">Unknown</option>
          <option value="KY">KY</option>
          <option value="FL">FL</option>
          <option value="OH">OH</option>
        </select>
        <svg
          className="ml-2 h-3.5 w-3.5 shrink-0 text-ink-muted pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Plan Year Pill */}
      <div className="relative flex items-center rounded-lg border border-border bg-[#F9FAFB]/80 hover:bg-[#F3F4F6] px-3 py-1.5 transition-colors focus-within:ring-2 focus-within:ring-ring">
        <CalendarDays className="mr-2 h-3.5 w-3.5 shrink-0 text-ink-muted" />
        <span className="mr-2 text-ink-muted text-xs">Plan year</span>
        <span className="font-semibold text-ink text-xs">{planYear || "2026"}</span>
        <select
          aria-label="Plan year"
          value={planYear}
          onChange={(e) => setPlanYear(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        >
          <option value="2026">2026</option>
          <option value="2027">2027</option>
        </select>
        <svg
          className="ml-2 h-3.5 w-3.5 shrink-0 text-ink-muted pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <span className="sr-only">AEP opens Oct 15. Answers apply to this context</span>
    </div>
  );
}

export function DisclosureStep({
  title,
  text,
  done,
  onDone,
}: {
  title: string;
  text: string;
  done: boolean;
  onDone: () => void;
}) {
  return (
    <section className="disclosure-step mb-4 rounded-md border-l-[3px] border-brand-green-dark bg-primary/4 px-5 py-4">
      <p className="text-sm font-bold text-brand-green-dark">
        Step 1 · Read before discussing benefits
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xs font-bold tracking-wide text-ink-muted">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" /> READ EXACTLY AS WRITTEN · {title}
      </p>
      <p className="mt-2 select-all text-base leading-relaxed">{text}</p>
      <label className="mt-3 flex items-center gap-2 font-semibold">
        <Checkbox
          checked={done}
          disabled={done}
          onCheckedChange={(v) => v && onDone()}
          aria-label="I read this"
        />
        I read this
      </label>
      <p className="mt-2 text-xs text-ink-muted">
        Recorded attestation. Speech analytics on recordings is the production control.
      </p>
    </section>
  );
}

export function RequestIdChip({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      title="Copy request id"
      onClick={async () => {
        await navigator.clipboard?.writeText(id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex h-auto max-w-full items-center gap-1 px-2 py-1 font-mono text-[10px] text-ink-muted hover:text-ink"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{" "}
      <span className="truncate">{id}</span>
    </Button>
  );
}

export function FeedbackRow({
  person,
  requestId,
  unitIds,
}: {
  person: string;
  requestId: string;
  unitIds: string[];
}) {
  const [rated, setRated] = useState<"up" | "down" | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const rate = (r: "up" | "down") => {
    setRated(r);
    giveFeedback(person, requestId, r);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={rated === "up"}
        aria-label="Helpful"
        onClick={() => rate("up")}
      >
        <ThumbsUp />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={rated === "down"}
        aria-label="Not helpful"
        onClick={() => rate("down")}
      >
        <ThumbsDown />
      </Button>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={!!sent}>
        <Flag /> Flag this answer
      </Button>
      {sent && (
        <span role="status" className="text-sm text-brand-green-dark">
          Flagged. Review task sent to {sent}.
        </span>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag this answer</DialogTitle>
            <DialogDescription>
              The unit owner gets a review task with this reason.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-label="Reason"
            className="min-h-24 w-full rounded-md border border-border bg-surface p-3 text-sm"
            placeholder="What is wrong with this answer?"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!reason.trim()}
              onClick={() => {
                setSent(flagAnswer(person, requestId, unitIds, reason.trim()).owner);
                setOpen(false);
              }}
            >
              Send flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function UnitDrawer({
  citation,
  onClose,
}: {
  citation: Citation | null;
  onClose: () => void;
}) {
  const unit = citation ? getUnit(citation.unit_id) : null;
  const meta = citation ? UNIT_META[citation.unit_id] : undefined;
  const rows: [string, string][] = citation
    ? [
        ["Unit", citation.unit_id],
        ["Version", `v${citation.version}`],
        ["Effective", citation.effective_date],
        [
          "Approved",
          (() => {
            const v = unit?.versions.find((x) => x.version === citation.version);
            return v
              ? `v${v.version} · approved by ${v.approver} · effective ${v.effective_date}`
              : "Not recorded";
          })(),
        ],
        ["Owner", citation.owner],
        ["Verifier", meta?.verifier ?? "Not recorded"],
        ["Review date", meta?.review_date ?? "Not recorded"],
        ["Applies to", meta?.applies_to ?? "Not recorded"],
        [
          "Channels",
          meta
            ? meta.channels.map((c) => CHANNELS.find((x) => x.id === c)?.label ?? c).join(", ")
            : "Not recorded",
        ],
        ["Status", unit?.status ?? "unknown"],
      ]
    : [];
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
              <dt className="text-ink-muted">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </SheetContent>
    </Sheet>
  );
}
