import { useState } from "react";
import {
  X,
  FileText,
  ClipboardList,
  Shield,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Clock,
  GitCompare,
  Globe,
  MapPin,
  Calendar,
  ShieldAlert,
  CalendarDays,
  ExternalLink,
  Pencil,
  BookOpen,
  ArrowRight,
  FileCheck,
  Building,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EnrichedKnowledgeUnit } from "@/lib/library";
import { useSession } from "@/lib/session";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

interface KnowledgeDetailPanelProps {
  unit: EnrichedKnowledgeUnit;
  onClose: () => void;
  onSelectUnit?: (unitId: string) => void;
  onViewSource?: (unit: EnrichedKnowledgeUnit) => void;
  onEditUnit?: (unit: EnrichedKnowledgeUnit) => void;
}

export function KnowledgeDetailPanel({
  unit,
  onClose,
  onSelectUnit,
  onViewSource,
  onEditUnit,
}: KnowledgeDetailPanelProps) {
  const { person, can } = useSession();
  const [activeTab, setActiveTab] = useState<"overview" | "source" | "history" | "related">("overview");

  const canEdit = can("propose_unit") || can("approve_standard") || can("approve_legal");

  const handleEditClick = () => {
    if (canEdit) {
      if (onEditUnit) {
        onEditUnit(unit);
      } else {
        toast.success(`Opening editor for ${unit.unit_id}`);
      }
    } else {
      toast.error(
        `${person.name} (${person.label}) has Consumer read-only rights. Authoring or revision requires Knowledge Author, Approver, or Owner rights.`,
      );
    }
  };

  const ContentIcon =
    unit.content_type === "Policy"
      ? FileText
      : unit.content_type === "Procedure"
        ? ClipboardList
        : unit.content_type === "Legal"
          ? Shield
          : Lightbulb;

  return (
    <aside
      aria-label="Knowledge unit details"
      className="flex h-full w-full flex-col border-l border-border bg-surface shadow-sm lg:w-[420px] xl:w-[460px]"
    >
      {/* Panel Header */}
      <div className="relative border-b border-border p-5 pb-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="absolute right-4 top-4 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-muted hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pr-8">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-bold leading-tight text-ink sm:text-xl">
              {unit.title}
            </h2>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                unit.status === "Approved"
                  ? "bg-[#EAF7EE] text-[#1E5E2E]"
                  : unit.status === "Under review"
                    ? "bg-[#FEF3C7] text-[#D97706]"
                    : unit.status === "Stale"
                      ? "bg-[#F3F4F6] text-[#6B7280]"
                      : unit.status === "Conflict"
                        ? "bg-[#F3E8FF] text-[#7E22CE]"
                        : "bg-[#EFF6FF] text-[#1D4ED8]"
              }`}
            >
              {unit.status}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span className="flex items-center gap-1 font-medium text-ink">
              <ContentIcon className="h-3.5 w-3.5 text-ink-muted" />
              {unit.content_type}
            </span>
            <span>•</span>
            <span>v{unit.version}</span>
            <span>•</span>
            <span>{unit.section}</span>
            <span>•</span>
            <span>{unit.last_updated_formatted}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-5 flex border-b border-border -mb-4">
          {(["overview", "source", "history", "related"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative pb-2.5 px-3 text-xs font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-[#1E5E2E] font-semibold"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E5E2E]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {activeTab === "overview" && (
          <>
            {/* Status Alert Banner */}
            {unit.status === "Approved" ? (
              <div className="flex items-start gap-3 rounded-lg border border-[#C6E7D0] bg-[#EAF7EE] p-3.5 text-[#1E5E2E]">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1E5E2E] text-white">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-[#1E5E2E]">Approved content</p>
                  <p className="mt-0.5 text-[#1E5E2E]/90 leading-relaxed">
                    This knowledge unit is approved and can be used in answers.
                  </p>
                </div>
              </div>
            ) : unit.status === "Under review" ? (
              <div className="flex items-start gap-3 rounded-lg border border-[#FDE68A] bg-[#FEF3C7] p-3.5 text-[#92400E]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
                <div className="text-xs">
                  <p className="font-semibold text-[#92400E]">Under active review</p>
                  <p className="mt-0.5 text-[#92400E]/90 leading-relaxed">
                    This unit has pending changes in the review queue and cannot be quoted as final policy.
                  </p>
                </div>
              </div>
            ) : unit.status === "Stale" ? (
              <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-alt p-3.5 text-ink-muted">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                <div className="text-xs">
                  <p className="font-semibold text-ink">Review date expired</p>
                  <p className="mt-0.5 text-ink-muted leading-relaxed">
                    This unit exceeded its annual review date and requires owner re-verification.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-[#E9D5FF] bg-[#F3E8FF] p-3.5 text-[#6B21A8]">
                <GitCompare className="mt-0.5 h-4 w-4 shrink-0 text-[#7E22CE]" />
                <div className="text-xs">
                  <p className="font-semibold text-[#6B21A8]">Conflict flagged</p>
                  <p className="mt-0.5 text-[#6B21A8]/90 leading-relaxed">
                    Disagrees with another source. Routed to knowledge owners for resolution.
                  </p>
                </div>
              </div>
            )}

            {/* Content Summary */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-ink">Content summary</h3>
              <p className="text-xs leading-relaxed text-ink/80">
                {unit.summary}
              </p>
            </div>

            {/* Key Points */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-ink">Key points</h3>
              <ul className="space-y-1.5 text-xs text-ink/80">
                {unit.key_points.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E5E2E]" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Metadata Attributes List */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="grid grid-cols-[140px_1fr] items-center gap-2 text-xs">
                <span className="flex items-center gap-2 text-ink-muted">
                  <Globe className="h-3.5 w-3.5" />
                  Line of business
                </span>
                <span className="font-medium text-ink">{unit.lob}</span>
              </div>

              <div className="grid grid-cols-[140px_1fr] items-center gap-2 text-xs">
                <span className="flex items-center gap-2 text-ink-muted">
                  <MapPin className="h-3.5 w-3.5" />
                  State
                </span>
                <span className="font-medium text-ink">{unit.state}</span>
              </div>

              <div className="grid grid-cols-[140px_1fr] items-center gap-2 text-xs">
                <span className="flex items-center gap-2 text-ink-muted">
                  <Calendar className="h-3.5 w-3.5" />
                  Effective date
                </span>
                <span className="font-medium text-ink">{unit.effective_date_formatted}</span>
              </div>

              <div className="grid grid-cols-[140px_1fr] items-center gap-2 text-xs">
                <span className="flex items-center gap-2 text-ink-muted">
                  <Clock className="h-3.5 w-3.5" />
                  Next review
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{unit.next_review}</span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${
                      unit.next_review_status === "Current"
                        ? "bg-[#EAF7EE] text-[#1E5E2E]"
                        : unit.next_review_status === "Upcoming"
                          ? "bg-[#FEF3C7] text-[#D97706]"
                          : "bg-[#FEE2E2] text-[#DC2626]"
                    }`}
                  >
                    {unit.next_review_status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-[140px_1fr] items-center gap-2 text-xs">
                <span className="flex items-center gap-2 text-ink-muted">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Approved by
                </span>
                <span className="font-medium text-ink">{unit.approved_by}</span>
              </div>

              <div className="grid grid-cols-[140px_1fr] items-center gap-2 text-xs">
                <span className="flex items-center gap-2 text-ink-muted">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Approved on
                </span>
                <span className="font-medium text-ink">{unit.approved_on_formatted}</span>
              </div>

              <div className="grid grid-cols-[140px_1fr] items-center gap-2 text-xs">
                <span className="flex items-center gap-2 text-ink-muted">
                  <FileText className="h-3.5 w-3.5" />
                  Content type
                </span>
                <span className="font-medium text-ink">{unit.content_type}</span>
              </div>
            </div>
          </>
        )}

        {activeTab === "source" && (
          <div className="space-y-4 text-xs">
            <div className="rounded-lg border border-border bg-surface-alt p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">Source Document</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {unit.source_doc.doc_id}
                </Badge>
              </div>
              <p className="font-medium text-ink">{unit.source_doc.title}</p>
              <div className="space-y-1 text-ink-muted">
                <p>Section: <span className="text-ink">{unit.source_doc.section}</span></p>
                <p>Ingested: <span className="text-ink">{unit.source_doc.ingested_at} by {unit.source_doc.ingested_by}</span></p>
                <p>Knowledge base: <span className="font-mono text-ink">{unit.kb}</span></p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-semibold text-ink">Ingested Excerpt</span>
              <div className="rounded border border-border bg-surface p-3 font-mono text-[11px] leading-relaxed text-ink/90">
                {unit.source_doc.snippet || unit.latest_text || "Full document text indexed and verified against policy."}
              </div>
            </div>

            {can("ingest_source") && (
              <Button variant="outline" size="sm" asChild className="w-full text-xs">
                <Link to="/work">
                  View in Ingest workflow <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {unit.versions.map((ver, idx) => (
                <div key={ver.version} className="relative space-y-1.5">
                  <span
                    className={`absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                      idx === 0
                        ? "bg-[#1E5E2E] text-white ring-2 ring-white"
                        : "bg-muted text-ink-muted"
                    }`}
                  >
                    {ver.version}
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink">
                      Version {ver.version}
                      {idx === 0 && <span className="ml-1.5 text-[10px] font-normal text-[#1E5E2E]">(Current)</span>}
                    </span>
                    <span className="text-[11px] text-ink-muted">{ver.effective_date_formatted}</span>
                  </div>
                  <p className="text-[11px] text-ink-muted">Approved by {ver.approver}</p>
                  {ver.change_note && (
                    <p className="text-xs text-ink/80 italic">{ver.change_note}</p>
                  )}
                  <div className="rounded border border-border bg-surface-alt p-2 text-xs text-ink/90">
                    {ver.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "related" && (
          <div className="space-y-3">
            <p className="text-xs text-ink-muted">
              Related policies, procedures and guidelines within {unit.kb}:
            </p>
            {unit.related_unit_ids.length > 0 ? (
              <div className="space-y-2">
                {unit.related_unit_ids.map((relId) => (
                  <button
                    key={relId}
                    type="button"
                    onClick={() => onSelectUnit && onSelectUnit(relId)}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-[#1E5E2E] hover:bg-[#EAF7EE]/30"
                  >
                    <div>
                      <p className="text-xs font-semibold text-ink">{relId}</p>
                      <p className="text-[11px] text-ink-muted">Connected policy in {unit.lob}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-ink-muted" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-surface-alt p-4 text-center text-xs text-ink-muted">
                No explicitly linked knowledge units.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Panel Bottom Actions */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewSource ? onViewSource(unit) : setActiveTab("source")}
            className="flex-1 text-xs font-medium text-ink border-border hover:bg-muted"
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5 text-ink-muted" />
            View source document
          </Button>

          <Button
            size="sm"
            onClick={handleEditClick}
            className={`flex-1 text-xs font-medium text-white ${
              canEdit
                ? "bg-[#1E5E2E] hover:bg-[#174A24]"
                : "bg-[#1E5E2E]/70 hover:bg-[#1E5E2E]/80"
            }`}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit (if permitted)
          </Button>
        </div>
      </div>
    </aside>
  );
}
