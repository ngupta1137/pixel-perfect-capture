import { useState } from "react";
import { ArrowRightCircle, Check, Copy, Lock, Phone, Volume2, Square, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Choice, type Citation, type Part, reportConflictForResolution } from "@/services/verity";
import { TrustBadge } from "./TrustBadge";
import { OutcomePill, OUTCOME_META } from "./outcomeMeta";
import { CHANNELS, useSession } from "@/lib/session";
import { personaDef } from "@/lib/rights";
import { MessageResponse } from "@/components/ai-elements/message";

function CitationLine({
  c,
  onCite,
  minimal = false,
  showOwner = true,
}: {
  c: Citation;
  onCite?: ((c: Citation) => void) | undefined;
  minimal?: boolean;
  showOwner?: boolean;
}) {
  if (minimal)
    return (
      <p className="mt-3 text-sm text-ink-muted">
        {c.title} · {c.effective_date}
      </p>
    );
  if (onCite)
    return (
      <Button
        variant="ghost"
        type="button"
        onClick={() => onCite(c)}
        className="mt-5 inline-flex h-auto max-w-full flex-wrap items-center justify-start gap-1 rounded-md border border-border bg-surface-alt px-3 py-2 text-left text-xs text-ink hover:border-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Open unit ${c.unit_id}: ${c.title}`}
      >
        <span className="font-semibold">{c.title}</span> · v{c.version} · effective{" "}
        {c.effective_date}
      </Button>
    );
  return (
    <p className="mt-3 text-sm text-ink-muted">
      {c.title} {showOwner && `· ${c.owner}`} · v{c.version} · effective {c.effective_date} ·{" "}
      <span className="whitespace-nowrap">{c.unit_id}</span>
    </p>
  );
}

function VerbatimBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="overflow-hidden rounded-md border-l-[3px] border-brand-green-dark bg-primary/4">
      <div className="flex items-center justify-between border-b border-border bg-surface-alt px-4 py-2">
        <span className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-brand-green-dark">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" /> READ EXACTLY AS WRITTEN
        </span>
        <Button variant="ghost" size="sm" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p aria-readonly="true" className="select-all px-5 py-5 text-lg leading-relaxed">
        {text}
      </p>
    </div>
  );
}

function NextStep({ text }: { text: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-surface-alt px-3 py-2.5 text-sm">
      <ArrowRightCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink" aria-hidden="true" />
      <p>
        <span className="font-semibold">Next step: </span>
        {text}
      </p>
    </div>
  );
}

function Choices({
  choices,
  onChoose,
}: {
  choices: Choice[];
  onChoose?: ((c: Choice) => void) | undefined;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Choose one">
      {choices.map((c) => (
        <Button
          key={c.label}
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full border-outcome-clarify"
          onClick={() => onChoose?.(c)}
          disabled={!onChoose}
        >
          {c.label}
        </Button>
      ))}
    </div>
  );
}

type Hooks = {
  onCite?: ((c: Citation) => void) | undefined;
  onChoose?: ((c: Choice) => void) | undefined;
};

function Body({
  part,
  compact,
  onCite,
  onChoose,
  minimal,
  showOwner,
}: { part: Part; compact: boolean; minimal: boolean; showOwner: boolean } & Hooks) {
  const { person } = useSession();
  const [handoff, setHandoff] = useState(false);
  const [reportedConflict, setReportedConflict] = useState<string | null>(null);
  const transfer = (
    <>
      <Button variant="outline" className="mt-4" onClick={() => setHandoff(true)}>
        <Phone />
        {minimal ? "Talk to a person" : "Transfer guidance"}
      </Button>
      {handoff && (
        <p role="status" className="mt-3 text-sm text-ink-muted">
          Live transfer is not connected in this prototype.{" "}
          {minimal
            ? "Contact Member Services using the number on your member ID card."
            : (part.next_step ?? "Follow your contact-center escalation procedure.")}
        </p>
      )}
    </>
  );
  const c0 = part.citations[0];
  switch (part.outcome) {
    case "answer":
      return (
        <>
          {c0?.verbatim && part.text ? (
            <VerbatimBox text={part.text} />
          ) : compact ? (
            <MessageResponse className="text-lg leading-relaxed">{part.text ?? ""}</MessageResponse>
          ) : (
            <p className="text-lg leading-8">{part.text}</p>
          )}
          {c0 && <CitationLine c={c0} onCite={onCite} minimal={minimal} showOwner={showOwner} />}
        </>
      );
    case "needs_clarification":
      return (
        <>
          <p className="text-xl font-semibold">{part.message}</p>
          {part.choices && part.choices.length > 0 ? (
            <Choices choices={part.choices} onChoose={onChoose} />
          ) : (
            <p className="mt-2 text-sm text-outcome-clarify">Pick the state and ask again.</p>
          )}
        </>
      );
    case "insufficient_evidence":
      return (
        <>
          <p className="text-lg">{part.message}</p>
          <p className="mt-2 text-sm text-ink-muted">
            Verity does not answer from general knowledge.
          </p>
          {!minimal && (
            <span className="mt-3 inline-block rounded border border-border bg-surface-alt px-2 py-0.5 text-xs font-semibold text-ink-muted">
              Gap logged
            </span>
          )}
        </>
      );
    case "conflict":
      if (minimal)
        return (
          <>
            <p className="text-lg">
              The available plan information disagrees. I cannot choose an answer for you.
            </p>
            {transfer}
          </>
        );
      return (
        <>
          <p className="text-lg">{part.message}</p>
          <p className="mt-4 text-sm font-semibold">
            Verity will not pick. Both owners have been notified.
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {part.citations.map((c) => (
              <div key={c.unit_id} className="rounded-md border border-border p-4">
                {onCite ? (
                  <Button
                    variant="link"
                    type="button"
                    onClick={() => onCite(c)}
                    aria-label={`Open unit ${c.unit_id}: ${c.title}`}
                    className="h-auto justify-start whitespace-normal p-0 text-left font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {c.title}
                  </Button>
                ) : (
                  <p className="font-semibold">{c.title}</p>
                )}
                <p className="text-sm text-ink-muted">
                  {showOwner && `${c.owner} · `}v{c.version} · effective {c.effective_date} ·{" "}
                  <span className="whitespace-nowrap">{c.unit_id}</span>
                </p>
                <p className="mt-3">{c.text}</p>
              </div>
            ))}
          </div>
          {!minimal && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <span className="text-xs text-ink-muted">Both owning teams notified. Need resolution?</span>
              {reportedConflict ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Reported to Knowledge Ops ({reportedConflict})
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const res = reportConflictForResolution(
                      person.name,
                      `req-${Date.now()}`,
                      part.part,
                      part.citations.map((c) => c.unit_id),
                      "Advocate reported conflicting sources on call",
                    );
                    setReportedConflict(res.id);
                  }}
                  className="gap-1.5 text-xs border-amber-300 bg-amber-50/50 hover:bg-amber-100 text-amber-900"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  Report for resolution
                </Button>
              )}
            </div>
          )}
        </>
      );
    case "stale":
      if (minimal)
        return (
          <>
            <p className="text-lg">
              This information needs to be checked before I can give you an answer.
            </p>
            {transfer}
          </>
        );
      return (
        <>
          <div className="mb-3 rounded border border-outcome-stale bg-outcome-stale/10 px-3 py-2 text-sm font-semibold text-outcome-stale">
            Past review date
          </div>
          <p className="text-lg text-ink-muted line-through decoration-outcome-stale/40">
            {part.text}
          </p>
          <p className="mt-2 text-sm">{part.message}</p>
          {c0 && <CitationLine c={c0} onCite={onCite} minimal={minimal} showOwner={showOwner} />}
        </>
      );
    case "not_authorized":
      return (
        <>
          {showOwner && <p className="text-lg font-semibold">Owned by {part.owner_team}</p>}
          <p className="mt-2">
            {minimal
              ? "I cannot answer this question from the plan information available to me."
              : part.message}
          </p>
          {transfer}
        </>
      );
    case "safety_escalation":
      return (
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <Phone className="h-10 w-10 shrink-0 text-outcome-safety" aria-hidden="true" />
          <p className="flex-1 text-xl font-semibold leading-relaxed">{part.text}</p>
          {transfer}
        </div>
      );
  }
}

export function OutcomeCard({
  part,
  channel,
  compact = false,
  speaking = false,
  speechSupported = true,
  onRead,
  onStop,
  onCite,
  onChoose,
  held = false,
}: Hooks & {
  held?: boolean;
  part: Part;
  channel: string;
  compact?: boolean;
  speaking?: boolean;
  speechSupported?: boolean;
  onRead?: () => void;
  onStop?: () => void;
}) {
  const { person } = useSession();
  const minimal = person.memberAudience;
  const showOwner = personaDef(person.persona).sees_internal_owner;
  const safety = part.outcome === "safety_escalation";
  const meta = OUTCOME_META[part.outcome];
  const StatusIcon = meta.icon;
  const headings = {
    answer: "Approved answer",
    needs_clarification: "A little more context is needed",
    insufficient_evidence: "No approved answer found",
    conflict: "Conflicting sources — answer withheld",
    stale: "Review required — answer withheld",
    not_authorized: "Outside your access",
    safety_escalation: "Immediate safety escalation",
  };
  return (
    <article
      className={`bg-surface ${compact ? "border-l-2 border-primary/20 pl-4 py-3 text-lg [&_p.text-xl]:text-lg [&_p.text-2xl]:text-lg" : `answer-focus overflow-hidden rounded-lg border border-border border-t-[3px] ${meta.border} p-5 sm:p-6`} ${safety ? "border-2 border-outcome-safety" : ""}`}
    >
      {!compact && (
        <div className="mb-5 flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${meta.bg} ${meta.text}`}
          >
            <StatusIcon className="h-5 w-5" />
          </span>
          <h2 className="text-base font-semibold">{headings[part.outcome]}</h2>
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-2">
          <OutcomePill outcome={part.outcome} />
          {part.trust && <TrustBadge trust={part.trust} />}
        </span>
        <span className="rounded-full border border-border bg-surface-alt px-2 py-1 text-xs text-ink-muted">
          Channel · {CHANNELS.find((c) => c.id === channel)?.label ?? channel}
        </span>
      </div>
      {held ? (
        <div
          role="status"
          className="rounded-md border-2 border-dashed border-outcome-clarify bg-outcome-clarify/10 px-4 py-3 font-semibold text-outcome-clarify"
        >
          Held until the disclosure is read
        </div>
      ) : (
        <Body
          part={part}
          compact={compact}
          onCite={onCite}
          onChoose={onChoose}
          minimal={minimal}
          showOwner={showOwner}
        />
      )}
      {!minimal && part.next_step && part.outcome !== "answer" && (
        <NextStep text={part.next_step} />
      )}
      {onRead && !held && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={speaking ? onStop : onRead}
            disabled={!speechSupported}
          >
            {speaking ? <Square /> : <Volume2 />} {speaking ? "Stop reading" : "Read aloud"}
          </Button>
          {speaking && (
            <span role="status" className="text-sm text-brand-green-dark">
              {part.citations.some((c) => c.verbatim)
                ? "Reading approved verbatim exactly"
                : "Reading aloud..."}
            </span>
          )}
          {!speechSupported && (
            <span className="text-sm text-ink-muted">
              Read aloud is unavailable in this browser.
            </span>
          )}
        </div>
      )}
    </article>
  );
}
