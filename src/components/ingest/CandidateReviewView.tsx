import { useState } from "react";
import { AlertTriangle, ArrowLeft, Check, Info, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip, WordDiff } from "@/components/authoring/Chain";
import { canPropose, proposeCandidates, type Candidate } from "@/services/verity";
import { useSession } from "@/lib/session";

const STATUS: Record<
  Candidate["status"],
  { label: string; tone: "ok" | "warn" | "bad" | "info" | "muted" }
> = {
  unchanged: { label: "Unchanged", tone: "ok" },
  changed_flagged: { label: "Changed: flagged", tone: "bad" },
  changed: { label: "Changed", tone: "warn" },
  new: { label: "New unit", tone: "info" },
  skipped: { label: "Skipped", tone: "muted" },
};

interface CandidateReviewViewProps {
  candidates: Candidate[];
  sourceTitle: string;
  onBack: () => void;
  onProposed: () => void;
}

export function CandidateReviewView({
  candidates,
  sourceTitle,
  onBack,
  onProposed,
}: CandidateReviewViewProps) {
  const { person } = useSession();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(candidates.filter(canPropose).map((c) => c.cid));
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedCount, setSubmittedCount] = useState<number | null>(null);

  const toggleSelect = (cid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) {
        next.delete(cid);
      } else {
        next.add(cid);
      }
      return next;
    });
  };

  const selectAllEligible = () => {
    const eligible = candidates.filter(canPropose).map((c) => c.cid);
    if (selectedIds.size === eligible.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligible));
    }
  };

  const handlePropose = () => {
    setIsSubmitting(true);
    const toPropose = candidates.filter((c) => selectedIds.has(c.cid));
    proposeCandidates(person.name, toPropose);
    setSubmittedCount(toPropose.length);
    setIsSubmitting(false);
    onProposed();
  };

  const eligibleCount = candidates.filter(canPropose).length;

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-xs text-ink-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Back to source
          </Button>
          <div className="h-4 w-px bg-border" />
          <div>
            <h2 className="font-semibold text-sm text-ink">
              Extracted units for <span className="text-primary">{sourceTitle}</span>
            </h2>
            <p className="text-xs text-ink-muted">
              {candidates.length} candidate units extracted ({eligibleCount} eligible for proposal)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllEligible}
            className="text-xs h-8"
          >
            {selectedIds.size === eligibleCount ? "Deselect all" : "Select all eligible"}
          </Button>
          <Button
            size="sm"
            onClick={handlePropose}
            disabled={selectedIds.size === 0 || isSubmitting}
            className="text-xs h-8 gap-1.5 bg-[#1E5E2E] hover:bg-[#184d25] text-white"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isSubmitting ? "Submitting..." : `Propose selected (${selectedIds.size})`}
          </Button>
        </div>
      </div>

      {submittedCount !== null && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>
            Successfully proposed {submittedCount} knowledge unit drafts! Routed for peer review.
          </span>
        </div>
      )}

      {/* Candidates Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-[#F9FAFB] text-ink-muted">
              <tr>
                <th className="w-10 px-4 py-3 text-center">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-4 py-3 font-medium">Candidate knowledge unit</th>
                <th className="px-4 py-3 font-medium w-36">Status</th>
                <th className="px-4 py-3 font-medium w-48">Match & duplicates</th>
                <th className="px-4 py-3 font-medium w-48">Routing & governance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {candidates.map((c) => {
                const isEligible = canPropose(c);
                const isSelected = selectedIds.has(c.cid);

                return (
                  <tr
                    key={c.cid}
                    className={`align-top transition-colors ${
                      isSelected ? "bg-[#EAF7EE]/20" : "hover:bg-[#F9FAFB]/50"
                    }`}
                  >
                    <td className="px-4 py-4 text-center">
                      {isEligible ? (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(c.cid)}
                          aria-label={`Select ${c.title}`}
                          className="mt-1"
                        />
                      ) : (
                        <div className="mt-1 text-ink-muted opacity-40" title="Not eligible for direct proposal">
                          —
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-[10px] text-ink-muted uppercase">{c.cid}</span>
                        <h3 className="font-semibold text-sm text-ink">{c.title}</h3>
                      </div>

                      {/* Content / Diff */}
                      <div className="rounded-md border border-border/70 bg-background/50 p-3 text-xs leading-relaxed text-ink">
                        {c.match && !c.match.exact ? (
                          <WordDiff from={c.match.text} to={c.text} />
                        ) : (
                          <p className={c.status === "skipped" ? "text-ink-muted line-through" : ""}>
                            {c.text}
                          </p>
                        )}
                      </div>

                      {/* Guardrail Banners */}
                      {c.banner && (
                        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs font-medium text-destructive">
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Guardrail trigger: </span>
                            {c.banner}
                          </div>
                        </div>
                      )}

                      {/* Notes / Suggestions */}
                      {c.note && (
                        <div className="flex items-start gap-1.5 text-xs text-ink-muted">
                          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>{c.note}</span>
                        </div>
                      )}

                      {c.suggestion && (
                        <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded p-1.5 border border-amber-200">
                          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
                          <span>Suggestion: {c.suggestion}</span>
                        </div>
                      )}

                      {c.skip_reason && (
                        <p className="text-xs text-ink-muted italic">
                          Skipped rationale: {c.skip_reason}
                        </p>
                      )}

                      {c.tags && c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {c.tags.map((t) => (
                            <Chip key={t} tone="info">
                              Tag: {t}
                            </Chip>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <Chip tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Chip>
                    </td>

                    <td className="px-4 py-4 text-xs space-y-1.5">
                      {c.match ? (
                        <div className="rounded border border-border bg-[#F9FAFB] p-2">
                          <span className="font-mono font-medium text-ink">{c.match.unit_id}</span>
                          <span className="text-ink-muted ml-1">v{c.match.version}</span>
                          <div className="mt-0.5">
                            {c.match.exact ? (
                              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                                Exact verbatim match
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-700 font-medium">
                                Modified text
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-ink-muted">No existing unit match</span>
                      )}

                      {c.duplicates?.map((d) => (
                        <div key={d.unit_id} className="text-[11px] text-ink-muted border-l-2 border-amber-400 pl-1.5">
                          Similar: {d.unit_id} ({(d.similarity * 100).toFixed(0)}%)
                        </div>
                      ))}
                    </td>

                    <td className="px-4 py-4 text-xs space-y-2">
                      {c.route ? (
                        <div className="space-y-1">
                          <Chip tone={c.route === "legal" ? "bad" : "warn"}>
                            {c.route === "legal" ? "Route: Needs Legal Review" : `Route: Needs ${c.owner_team ?? "Owner"}`}
                          </Chip>
                          <p className="text-[11px] text-ink-muted">
                            {c.route === "legal"
                              ? "Contains legally binding phrasing changes"
                              : "Domain-owner signoff required"}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-emerald-700 text-[11px]">
                          <Check className="h-3.5 w-3.5" />
                          <span>Standard peer review</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-[#F9FAFB] p-4 text-xs">
        <div className="flex items-center gap-2 text-ink-muted">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <span>
            <strong>Governance rule:</strong> Proposing candidates creates provisional drafts in your queue. Publication requires independent approval from a second reviewer.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handlePropose}
            disabled={selectedIds.size === 0 || isSubmitting}
            className="bg-[#1E5E2E] hover:bg-[#184d25] text-white px-5"
          >
            {isSubmitting ? "Submitting..." : `Propose selected (${selectedIds.size})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
