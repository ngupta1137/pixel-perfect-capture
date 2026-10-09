import { CalendarClock, FileText, PanelRightOpen, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUnit, UNIT_META, type Citation, type SearchResponse } from "@/services/verity";

/** Freshness from the unit's recorded review date; "Not recorded" when absent. */
export function freshness(reviewDate: string | undefined, today = new Date()) {
  if (!reviewDate) return { label: "Review date not recorded", tone: "text-ink-muted" };
  const due = new Date(reviewDate);
  if (Number.isNaN(due.getTime()))
    return { label: `Review by ${reviewDate}`, tone: "text-ink-muted" };
  return due < today
    ? { label: `Review overdue since ${reviewDate}`, tone: "text-outcome-stale" }
    : { label: `Current · review by ${reviewDate}`, tone: "text-brand-green-dark" };
}

/** Summary of the approved sources behind an answer. Reads only stored unit records. */
export function AnswerDetails({
  res,
  onCite,
}: {
  res: SearchResponse;
  onCite: (c: Citation) => void;
}) {
  const cites = res.parts
    .filter((p) => p.outcome === "answer")
    .flatMap((p) => p.citations)
    .filter((c, i, all) => all.findIndex((x) => x.unit_id === c.unit_id) === i);
  if (!cites.length) return null;
  return (
    <details aria-label="Answer details" className="group border-y border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between px-2 py-4 text-sm font-semibold">
        Source approval & freshness <PanelRightOpen className="h-4 w-4 text-ink-muted" />
      </summary>
      <ul className="divide-y divide-border">
        {cites.map((c) => {
          const v = getUnit(c.unit_id)?.versions.find((x) => x.version === c.version);
          const f = freshness(UNIT_META[c.unit_id]?.review_date);
          return (
            <li
              key={c.unit_id}
              className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div className="min-w-0 space-y-1.5 text-[13px]">
                <p className="flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{c.title}</span>
                  <span className="shrink-0 rounded bg-muted px-1.5 text-[11px] text-ink-muted">
                    v{c.version}
                  </span>
                </p>
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                  <span className="flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" />
                    {v ? `Approved by ${v.approver}` : "Approver not recorded"}
                  </span>
                  <span>Effective {c.effective_date}</span>
                  <span className={`flex items-center gap-1 ${f.tone}`}>
                    <CalendarClock className="h-3.5 w-3.5" />
                    {f.label}
                  </span>
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onCite(c)}>
                <PanelRightOpen /> Source details
              </Button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
