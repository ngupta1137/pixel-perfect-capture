import { useState } from "react";
import {
  AlertTriangle, ArrowRightCircle, BadgeCheck, Check, ClipboardCheck, Clock, Copy, Lock, Phone,
  Square, Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Citation, Part, Trust } from "@/services/contracts";
import { OutcomePill } from "./outcomeMeta";
import { CHANNELS } from "@/lib/session";

export const CLARIFY_STATES = ["KY", "FL", "OH", "TX"];

const TRUST_META: Record<Trust, { label: string; icon: typeof BadgeCheck; cls: string }> = {
  approved: { label: "Approved", icon: BadgeCheck, cls: "text-outcome-answer border-outcome-answer bg-outcome-answer/10" },
  stale: { label: "Stale", icon: Clock, cls: "text-outcome-stale border-outcome-stale bg-outcome-stale/10" },
  conflict: { label: "Conflict", icon: AlertTriangle, cls: "text-outcome-insufficient border-outcome-insufficient bg-outcome-insufficient/10" },
};

export function TrustBadge({ trust }: { trust: Trust }) {
  const m = TRUST_META[trust];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${m.cls}`}>
      <Icon className="h-4 w-4" aria-hidden="true" /> {m.label}
    </span>
  );
}

function ChannelChip({ channel }: { channel: string }) {
  return (
    <span className="rounded-full border border-border bg-surface-alt px-2 py-1 text-xs text-ink-muted">
      Channel · {CHANNELS.find((c) => c.id === channel)?.label ?? channel}
    </span>
  );
}

function CitationChip({ c, onOpen }: { c: Citation; onOpen?: ((c: Citation) => void) | undefined }) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(c)}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-sm hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Open unit ${c.title}, version ${c.version}, effective ${c.effectiveDate}`}
    >
      <span className="font-semibold">{c.title}</span>
      <span className="text-ink-muted">· v{c.version} · effective {c.effectiveDate}</span>
    </button>
  );
}

function VerbatimBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="rounded-md border-2 border-brand-green-dark">
      <div className="flex items-center justify-between border-b border-border bg-surface-alt px-4 py-2">
        <span className="flex items-center gap-1.5 text-sm font-bold text-brand-green-dark">
          <Lock className="h-4 w-4" aria-hidden="true" /> Read exactly as written
        </span>
        <Button variant="ghost" size="sm" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="select-all px-4 py-4 text-xl leading-relaxed">{text}</p>
    </div>
  );
}

function ReadFirstStep({ text, onConfirm }: { text: string; onConfirm: () => Promise<string> }) {
  const [readAt, setReadAt] = useState<string | null>(null);
  return (
    <div className="rounded-lg border-2 border-outcome-clarify bg-outcome-clarify/5 p-4">
      <p className="mb-3 flex items-center gap-2 text-base font-semibold text-outcome-clarify">
        <ClipboardCheck className="h-5 w-5" aria-hidden="true" /> Step 1 · Read before discussing benefits
      </p>
      <VerbatimBlock text={text} />
      <label className="mt-3 flex items-center gap-2 text-base">
        <Checkbox
          checked={readAt !== null}
          disabled={readAt !== null}
          onCheckedChange={async (v) => {
            if (v) setReadAt(await onConfirm());
          }}
        />
        I read this
      </label>
      {readAt && (
        <p role="status" className="mt-1 text-sm text-ink-muted">
          Read event recorded at {new Date(readAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

function NextStep({ text }: { text: string }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-md border-2 border-ink bg-surface-alt px-4 py-3 text-base">
      <ArrowRightCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p>
        <span className="font-bold">Next step: </span>
        {text}
      </p>
    </div>
  );
}

export function ClarifyChips({ question, onChoose }: { question: string; onChoose: (state: string) => void }) {
  return (
    <>
      <p className="text-xl font-semibold">{question}</p>
      <div role="group" aria-label="Choose a state" className="mt-3 flex flex-wrap gap-2">
        {CLARIFY_STATES.map((s) => (
          <Button key={s} variant="outline" className="min-w-14 rounded-full border-outcome-clarify text-base" onClick={() => onChoose(s)}>
            {s}
          </Button>
        ))}
      </div>
    </>
  );
}

export interface AdvocateCardProps {
  part: Part;
  channel: string;
  /** Approved text of each cited unit, for side-by-side conflict display. */
  sourceTexts?: Record<string, string>;
  onOpenUnit?: (c: Citation) => void;
  onChooseState?: (state: string) => void;
  onConfirmRead?: (c: Citation) => Promise<string>;
  speaking?: boolean;
  speechSupported?: boolean;
  onRead?: () => void;
  onStop?: () => void;
  footer?: React.ReactNode;
}

/** Advocate and supervisor answer card. */
export function OutcomeCard({
  part, channel, sourceTexts = {}, onOpenUnit, onChooseState, onConfirmRead,
  speaking = false, speechSupported = true, onRead, onStop, footer,
}: AdvocateCardProps) {
  const safety = part.outcome === "safety_escalation";
  const c0 = part.citations[0];
  const verbatim = Boolean(c0?.verbatim && part.text);
  const trust = part.outcome === "answer" || part.outcome === "stale" || part.outcome === "conflict" ? c0?.trust : undefined;
  return (
    <article className={`rounded-lg bg-surface p-6 ${safety ? "border-2 border-outcome-safety" : "border border-border"}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <OutcomePill outcome={part.outcome} />
          {trust && <TrustBadge trust={trust} />}
        </div>
        <ChannelChip channel={channel} />
      </div>

      {part.outcome === "answer" && (
        <>
          {verbatim && part.mustReadBeforeBenefits && c0 && onConfirmRead ? (
            <ReadFirstStep text={part.text ?? ""} onConfirm={() => onConfirmRead(c0)} />
          ) : verbatim ? (
            <VerbatimBlock text={part.text ?? ""} />
          ) : (
            <p className="text-xl leading-relaxed">{part.text}</p>
          )}
        </>
      )}
      {part.outcome === "needs_clarification" && (
        <ClarifyChips question={part.message} onChoose={(s) => onChooseState?.(s)} />
      )}
      {part.outcome === "insufficient_evidence" && (
        <>
          <p className="text-lg">{part.message}</p>
          <p className="mt-2 text-base text-ink-muted">Verity does not answer from general knowledge.</p>
        </>
      )}
      {part.outcome === "conflict" && (
        <>
          <p className="text-lg">{part.message}</p>
          <p className="mt-3 text-base font-semibold">Verity will not pick. Both owners have been notified.</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {part.citations.map((c) => (
              <div key={c.unitId} className="rounded-md border border-border p-4">
                <p className="font-semibold">{c.title}</p>
                <p className="text-sm text-ink-muted">
                  {c.owner} · v{c.version} · effective {c.effectiveDate}
                </p>
                <p className="mt-3 text-base">{(c.unitId && sourceTexts[c.unitId]) ?? ""}</p>
              </div>
            ))}
          </div>
        </>
      )}
      {part.outcome === "stale" && (
        <>
          <div className="mb-3 rounded border border-outcome-stale bg-outcome-stale/10 px-3 py-2 text-base font-semibold text-outcome-stale">
            Past review date
          </div>
          <p className="text-lg text-ink-muted line-through decoration-outcome-stale/40">{part.text}</p>
          <p className="mt-2 text-base">{part.message}</p>
        </>
      )}
      {part.outcome === "not_authorized" && (
        <>
          <p className="text-2xl font-semibold">Owned by {part.ownerTeam}</p>
          <p className="mt-2 text-base">{part.message}</p>
        </>
      )}
      {safety && (
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <Phone className="h-10 w-10 shrink-0 text-outcome-safety" aria-hidden="true" />
          <p className="flex-1 text-xl font-semibold leading-relaxed">{part.text}</p>
          <Button size="lg" variant="destructive">Connect to a person now</Button>
        </div>
      )}

      {part.citations.length > 0 && part.outcome !== "conflict" && (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Sources">
          {part.citations.map((c) => (
            <CitationChip key={`${c.unitId}:${c.version}`} c={c} onOpen={onOpenUnit} />
          ))}
        </div>
      )}
      {part.outcome === "conflict" && (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Sources">
          {part.citations.map((c) => (
            <CitationChip key={`${c.unitId}:${c.version}`} c={c} onOpen={onOpenUnit} />
          ))}
        </div>
      )}
      {part.nextStep && <NextStep text={part.nextStep} />}

      {onRead && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={speaking ? onStop : onRead} disabled={!speechSupported}>
            {speaking ? <Square /> : <Volume2 />} {speaking ? "Stop reading" : "Read aloud"}
          </Button>
          {speaking && (
            <span role="status" className="text-sm text-brand-green-dark">
              {verbatim ? "Reading approved verbatim exactly" : "Reading aloud..."}
            </span>
          )}
          {!speechSupported && <span className="text-sm text-ink-muted">Read aloud is unavailable in this browser.</span>}
        </div>
      )}
      {footer}
    </article>
  );
}
