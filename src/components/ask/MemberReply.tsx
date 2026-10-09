import { Phone, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Part } from "@/services/contracts";
import { CHANNELS } from "@/lib/session";
import { ClarifyChips } from "./OutcomeCard";

/**
 * Member-audience reply. Shows approved text unchanged and citations as title and
 * date only. Never renders unit ids, versions, owners, trace or internal next steps.
 */
const KIND: Partial<Record<Part["outcome"], string>> = {
  insufficient_evidence: "I don't have an approved answer for that yet. A person can help you with it.",
  not_authorized: "I can't help with that question here. An advocate can help you with it.",
  conflict: "I want to be sure you get the right answer, so a person should help with this one.",
  stale: "I'm checking that this information is still current. A person can confirm it for you.",
};

export function MemberReply({
  part, channel, onChooseState, onTalk, speaking = false, speechSupported = true, onRead, onStop,
}: {
  part: Part;
  channel: string;
  onChooseState: (state: string) => void;
  onTalk: () => void;
  speaking?: boolean;
  speechSupported?: boolean;
  onRead?: () => void;
  onStop?: () => void;
}) {
  const answered = part.outcome === "answer" || part.outcome === "safety_escalation";
  return (
    <article
      data-testid="member-reply"
      className={`rounded-lg bg-surface p-4 ${part.outcome === "safety_escalation" ? "border-2 border-outcome-safety" : "border border-border"}`}
    >
      <span className="mb-2 inline-block rounded-full border border-border bg-surface-alt px-2 py-0.5 text-xs text-ink-muted">
        {CHANNELS.find((c) => c.id === channel)?.label ?? channel}
      </span>
      {answered && <p className="leading-relaxed">{part.text}</p>}
      {part.outcome === "needs_clarification" && (
        <ClarifyChips question="Which state is your plan in?" onChoose={onChooseState} />
      )}
      {KIND[part.outcome] && (
        <>
          <p className="leading-relaxed">{KIND[part.outcome]}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={onTalk}>Talk to an advocate</Button>
            <Button variant="outline" onClick={onTalk}>Request a call-back</Button>
          </div>
        </>
      )}
      {part.outcome === "safety_escalation" && (
        <Button variant="destructive" size="lg" className="mt-3" onClick={onTalk}>
          <Phone /> Talk to a person now
        </Button>
      )}
      {part.outcome === "answer" && part.citations.length > 0 && (
        <ul className="mt-3 space-y-1 text-[0.85em] text-ink-muted" aria-label="Sources">
          {part.citations.map((c) => (
            <li key={`${c.title}:${c.effectiveDate}`}>
              Source: {c.title} · {c.effectiveDate}
            </li>
          ))}
        </ul>
      )}
      {answered && onRead && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={speaking ? onStop : onRead} disabled={!speechSupported}>
          {speaking ? <Square /> : <Volume2 />} {speaking ? "Stop reading" : "Read aloud"}
        </Button>
      )}
    </article>
  );
}
