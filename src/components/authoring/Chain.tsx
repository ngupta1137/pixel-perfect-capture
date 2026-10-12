import { Check, Circle, X } from "lucide-react";
import type { ChainDraft } from "@/services/demoStore";
import { waitingOn } from "@/services/verity";

/** Word-level diff (LCS). Removed words struck red, added words green. */
export function WordDiff({ from, to }: { from: string; to: string }) {
  const a = from.split(/\s+/).filter(Boolean);
  const b = to.split(/\s+/).filter(Boolean);
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const out: { t: "same" | "del" | "add"; w: string }[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { out.push({ t: "same", w: a[i]! }); i++; j++; }
    else if (j < b.length && (i >= a.length || dp[i]![j + 1]! >= dp[i + 1]![j]!)) { out.push({ t: "add", w: b[j]! }); j++; }
    else { out.push({ t: "del", w: a[i]! }); i++; }
  }
  return (
    <p className="leading-relaxed" aria-label="Word-level diff">
      {out.map((o, k) => (
        <span key={k}>
          {o.t === "same" && o.w}
          {o.t === "del" && <del className="bg-destructive/10 text-destructive">{o.w}</del>}
          {o.t === "add" && <ins className="bg-brand-green/15 font-semibold text-brand-green-dark no-underline">{o.w}</ins>}{" "}
        </span>
      ))}
    </p>
  );
}

const STAGES = [
  { key: "proposed", label: "Proposed" },
  { key: "in_review", label: "In review" },
  { key: "approved", label: "Approved and published" },
  { key: "rejected", label: "Rejected" },
] as const;

export function Lifecycle({ d }: { d: ChainDraft }) {
  const reached = (k: string) => (d.history || []).find((h) => h.status === k);
  const shown = STAGES.filter((s) => (d.status === "rejected" ? s.key !== "approved" : s.key !== "rejected"));
  const wait = waitingOn(d);
  return (
    <div>
      <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label="Lifecycle">
        {shown.map((s, i) => {
          const h = reached(s.key);
          const Icon = h ? (s.key === "rejected" ? X : Check) : Circle;
          return (
            <li key={s.key} className="flex items-center gap-2">
              {i > 0 && <span className="h-px w-6 bg-border" aria-hidden />}
              <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 ${h ? (s.key === "rejected" ? "border-destructive text-destructive" : "border-brand-green-dark text-brand-green-dark") : "border-border text-ink-muted"}`}>
                <Icon className="h-3.5 w-3.5" aria-hidden /> {s.label}
                {h && <span className="text-xs text-ink-muted">· {h.by}</span>}
              </span>
            </li>
          );
        })}
      </ol>
      {wait && <p className="mt-2 text-sm">Waiting on: <b>{wait}</b> · A second person approves</p>}
      {d.reason && <p className="mt-2 text-sm text-destructive">Reason: {d.reason}</p>}
    </div>
  );
}

export function Chip({ tone, children }: { tone: "ok" | "warn" | "bad" | "info" | "muted"; children: React.ReactNode }) {
  const cls = {
    ok: "border-brand-green-dark text-brand-green-dark",
    warn: "border-outcome-clarify text-outcome-clarify",
    bad: "border-destructive text-destructive",
    info: "border-primary text-primary",
    muted: "border-border text-ink-muted",
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}
