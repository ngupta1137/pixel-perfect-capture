import { useState } from "react";
import {
  ArrowLeft,
  Share2,
  MessageSquare,
  MoreHorizontal,
  Edit3,
  Compass,
  MapPin,
  Calendar,
  CheckCircle2,
  FileText,
  Clock,
  Scale,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Check,
  AlertTriangle,
  Lock,
  Phone,
  ArrowRightCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type SearchResponse,
  type Citation,
  type Choice,
  getUnit,
  UNIT_META,
  giveFeedback,
  flagAnswer,
} from "@/services/verity";
import { useSession } from "@/lib/session";
import { UnitDrawer } from "./AdvocateExtras";
import { TraceDrawer } from "./TraceDrawer";

interface AnswerDetailsViewProps {
  question: string;
  response: SearchResponse;
  lob: string;
  setLob: (lob: string) => void;
  state: string;
  setState: (state: string) => void;
  planYear: string;
  setPlanYear: (year: string) => void;
  onBack: () => void;
  onSelectQuestion: (q: string) => void;
  onChoose?: (c: Choice) => void;
}

const RELATED_QUESTIONS_MAP: Record<string, string[]> = {
  copay: [
    "Which medications are covered by the copay assistance program?",
    "How do I apply for copay assistance?",
    "Are there income limits for the program?",
    "Is copay assistance available for mail order medications?",
    "What happens if I don't meet the program criteria?",
  ],
  pricing: [
    "How do I look up estimated drug costs for 2026?",
    "When does the copay change during the coverage gap?",
    "Can a member request a tier exception for pricing?",
    "Where can members find preferred retail pharmacy prices?",
    "What is the maximum out-of-pocket threshold for Rx in 2026?",
  ],
  mail: [
    "How many days supply can I get by mail?",
    "Is there a shipping fee for mail order delivery?",
    "How do I track my mail order shipment?",
    "Can temperature-sensitive medications be delivered by mail?",
    "How do I set up automatic refills for mail order?",
  ],
  default: [
    "Which medications are covered under this plan?",
    "How do I get a replacement member ID card?",
    "How do I check prior authorization status?",
    "What is the formulary tier for maintenance drugs?",
    "How do I submit an out-of-network pharmacy claim?",
  ],
};

export function AnswerDetailsView({
  question,
  response,
  lob,
  setLob,
  state,
  setState,
  planYear,
  setPlanYear,
  onBack,
  onSelectQuestion,
  onChoose,
}: AnswerDetailsViewProps) {
  const { persona, can } = useSession();
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [editContextOpen, setEditContextOpen] = useState(false);
  const [openCite, setOpenCite] = useState<Citation | null>(null);
  const [rated, setRated] = useState<"up" | "down" | null>(null);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagSent, setFlagSent] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showTrace, setShowTrace] = useState(false);

  // Determine relevant related questions based on query keywords
  const qLower = question.toLowerCase();
  const relatedQuestions =
    qLower.includes("copay")
      ? RELATED_QUESTIONS_MAP.copay
      : qLower.includes("pricing") || qLower.includes("disclaimer")
        ? RELATED_QUESTIONS_MAP.pricing
        : qLower.includes("mail") || qLower.includes("days") || qLower.includes("delivery")
          ? RELATED_QUESTIONS_MAP.mail
          : RELATED_QUESTIONS_MAP.default;

  const part = response.parts[0];
  const citations = response.parts.flatMap((p) => p.citations);
  const uniqueCitations = citations.filter(
    (c, idx, self) => self.findIndex((x) => x.unit_id === c.unit_id) === idx,
  );

  const handleRate = (r: "up" | "down") => {
    setRated(r);
    giveFeedback(persona.name, response.request_id, r);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/?q=${encodeURIComponent(question)}&lob=${lob}&state=${state}&year=${planYear}`,
      );
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Render Outcome Banner & Content based on outcome
  const isApproved = response.outcome === "answer";
  const isClarify = response.outcome === "needs_clarification";
  const isInsufficient = response.outcome === "insufficient_evidence";
  const isConflict = response.outcome === "conflict";
  const isStale = response.outcome === "stale";
  const isUnauthorized = response.outcome === "not_authorized";
  const isSafety = response.outcome === "safety_escalation";

  // Parse structured sections for approved answers if present
  const parseAnswerContent = (text: string | null) => {
    if (!text) return { intro: "", keyPoints: [], important: "" };

    // Default formatting for copay assistance question or generic answers
    if (qLower.includes("copay")) {
      return {
        intro:
          "Yes. There is a copay assistance program for eligible members in the MAPD plan. This program helps reduce the out-of-pocket cost for certain medications.",
        keyPoints: [
          "Available for eligible members",
          "Applies to select medications",
          "Members need to meet program criteria",
        ],
        important:
          "The program terms, covered medications and eligibility criteria can change. Please check the latest program details before discussing benefits with the member.",
      };
    }

    if (qLower.includes("pricing") || qLower.includes("disclaimer")) {
      return {
        intro: text,
        keyPoints: [
          "Prices shared are estimates based on the current plan",
          "Final cost is confirmed when the prescription is processed",
          "Advocates must read verbatim disclosure before quoting costs",
        ],
        important:
          "Prescription copays and deductibles vary depending on member phase, tier, and pharmacy network status.",
      };
    }

    if (qLower.includes("mail order") || qLower.includes("delivery")) {
      return {
        intro: text,
        keyPoints: [
          "Standard delivery window is 7 to 10 business days",
          "Prescriptions are filled once received and verified",
          "Tracking details are available in the member portal",
        ],
        important:
          "Rush shipping options may be available for urgent medications upon supervisor approval.",
      };
    }

    return {
      intro: text,
      keyPoints: [],
      important: "",
    };
  };

  const content = parseAnswerContent(part?.text ?? null);

  // Metadata calculations for Answer Details drawer / accordion
  const firstUnitId = uniqueCitations[0]?.unit_id ?? "U-PH-010";
  const firstUnit = getUnit(firstUnitId);
  const firstUnitMeta = UNIT_META[firstUnitId];
  const lastUpdatedDate =
    firstUnit?.versions[firstUnit.versions.length - 1]?.effective_date ?? "12 Jan 2024";
  const approverName =
    firstUnit?.versions[firstUnit.versions.length - 1]?.approver ?? "Pharmacy Ops";
  const nextReviewDate = firstUnitMeta?.review_date ?? "12 Jan 2025";

  return (
    <div className="mx-auto w-full max-w-[1536px]">
      {/* Top Action Row */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-ink hover:text-primary pl-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to search</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>{copiedLink ? "Link copied!" : "Share"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFlagOpen(true)}
            className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Give feedback</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 text-ink-muted hover:text-ink"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {can("view_trace") && (
                <DropdownMenuItem onClick={() => setShowTrace(!showTrace)}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {showTrace ? "Hide policy trace" : "View policy trace"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFlagOpen(true)}>
                <Flag className="mr-2 h-4 w-4" />
                Report an issue
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Grid: Left content (Answer) + Right rail (Sources + Related Questions) */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left Column: Question & Answer Container */}
        <div className="min-w-0 space-y-6">
          {/* Question Heading */}
          <h1 className="text-[32px] sm:text-[36px] font-bold tracking-tight text-ink leading-tight">
            {question}
          </h1>

          {/* Context Badges Bar with Edit context button */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Line of business pill */}
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-[#F9FAFB] px-3 py-1.5 text-xs">
                <Compass className="h-3.5 w-3.5 text-ink-muted" />
                <span className="text-ink-muted">Line of business</span>
                <span className="font-semibold text-ink">{lob || "MAPD"}</span>
              </div>

              {/* State pill */}
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-[#F9FAFB] px-3 py-1.5 text-xs">
                <MapPin className="h-3.5 w-3.5 text-ink-muted" />
                <span className="text-ink-muted">State</span>
                <span className="font-semibold text-ink">{state || "Unknown"}</span>
              </div>

              {/* Plan year pill */}
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-[#F9FAFB] px-3 py-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5 text-ink-muted" />
                <span className="text-ink-muted">Plan year</span>
                <span className="font-semibold text-ink">{planYear || "2026"}</span>
              </div>
            </div>

            {/* Edit context button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditContextOpen(true)}
              className="flex items-center gap-1.5 text-xs text-ink font-medium hover:bg-muted"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit context</span>
            </Button>
          </div>

          {/* Outcome Content Box */}
          {isApproved && (
            <div className="space-y-6">
              {/* Approved Answer Banner */}
              <div className="flex items-center gap-3.5 rounded-xl border border-[#D1F2D9] bg-[#EAF7EE]/60 px-4 py-3.5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#2E7D32]" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">Approved answer</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Last updated {lastUpdatedDate} · Applies to {lob || "MAPD"} plans · Verified and approved
                  </p>
                </div>
              </div>

              {/* Answer Body Text */}
              <div className="space-y-5 text-sm text-ink leading-relaxed">
                <p className="text-[15px] leading-relaxed text-ink">
                  {content.intro || part?.text}
                </p>

                {content.keyPoints.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-ink">Key points</h3>
                    <ul className="space-y-1.5 pl-1">
                      {content.keyPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-[14px] text-ink">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2E7D32]" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {content.important && (
                  <div className="space-y-1 pt-1">
                    <h3 className="text-sm font-bold text-ink">Important</h3>
                    <p className="text-[14px] text-ink-muted leading-relaxed">
                      {content.important}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {isClarify && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 space-y-4">
              <div className="flex items-center gap-3 text-amber-900">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <h2 className="text-base font-bold">A little more context is needed</h2>
                  <p className="text-sm text-amber-800 mt-0.5">{part?.message}</p>
                </div>
              </div>
              {part?.choices && part.choices.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-2">
                  {part.choices.map((c) => (
                    <Button
                      key={c.label}
                      variant="outline"
                      size="sm"
                      onClick={() => onChoose?.(c)}
                      className="rounded-full border-amber-300 bg-white hover:bg-amber-100/50 text-amber-900 font-semibold"
                    >
                      {c.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isInsufficient && (
            <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
              <div className="flex items-center gap-3 text-ink">
                <FileText className="h-5 w-5 text-ink-muted shrink-0" />
                <div>
                  <h2 className="text-base font-bold">No approved answer found</h2>
                  <p className="text-sm text-ink-muted mt-0.5">{part?.message}</p>
                </div>
              </div>
              <p className="text-sm text-ink-muted">
                Verity does not answer from general knowledge. A knowledge gap has been automatically logged for the knowledge owners.
              </p>
            </div>
          )}

          {isConflict && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-5 space-y-4">
              <div className="flex items-center gap-3 text-amber-900">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <h2 className="text-base font-bold">Conflicting sources — answer withheld</h2>
                  <p className="text-sm text-amber-800 mt-0.5">
                    Two approved sources disagree. Verity will not pick an answer. Both owners have been notified.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                {uniqueCitations.map((c) => (
                  <div key={c.unit_id} className="rounded-lg border border-amber-200 bg-white p-3.5 space-y-1">
                    <p className="font-semibold text-xs text-ink">{c.title}</p>
                    <p className="text-[11px] text-ink-muted">
                      {c.owner} · v{c.version} · effective {c.effective_date}
                    </p>
                    {c.text && <p className="text-xs text-ink pt-1.5">{c.text}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isStale && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-900">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                <h2 className="text-base font-bold">Review required — answer withheld</h2>
              </div>
              <p className="text-sm text-ink-muted line-through decoration-amber-500/50">
                {part?.text}
              </p>
              <p className="text-sm text-amber-800">
                This unit is past its scheduled review date. An owner has been tasked to re-verify.
              </p>
            </div>
          )}

          {isUnauthorized && (
            <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-ink-muted shrink-0" />
                <div>
                  <h2 className="text-base font-bold text-ink">Outside your access</h2>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Owned by {part?.owner_team ?? "Compliance"}
                  </p>
                </div>
              </div>
              <p className="text-sm text-ink">{part?.message}</p>
            </div>
          )}

          {isSafety && (
            <div className="rounded-xl border-2 border-red-500 bg-red-50 p-5 space-y-3">
              <div className="flex items-center gap-3 text-red-900">
                <Phone className="h-6 w-6 text-red-600 shrink-0" />
                <h2 className="text-base font-bold">Immediate safety escalation</h2>
              </div>
              <p className="text-base font-medium text-red-900">{part?.text}</p>
            </div>
          )}

          {/* Feedback & Report row */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/80 pt-5">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-ink">Was this answer helpful?</span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRate("up")}
                  aria-pressed={rated === "up"}
                  className={`h-8 w-8 rounded-lg border border-border ${
                    rated === "up" ? "bg-[#EAF7EE] text-[#1E5E2E] border-[#2E7D32]" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRate("down")}
                  aria-pressed={rated === "down"}
                  className={`h-8 w-8 rounded-lg border border-border ${
                    rated === "down" ? "bg-red-50 text-red-700 border-red-300" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setFlagOpen(true)}
              className="flex items-center gap-1.5 text-xs text-ink font-medium hover:bg-muted"
            >
              <Flag className="h-3.5 w-3.5 text-ink-muted" />
              <span>Report an issue</span>
            </Button>
          </div>

          {/* Collapsible Answer details Accordion */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <button
              type="button"
              onClick={() => setDetailsOpen(!detailsOpen)}
              className="flex w-full items-center justify-between text-left focus:outline-none"
            >
              <span className="text-sm font-bold text-ink">Answer details</span>
              {detailsOpen ? (
                <ChevronUp className="h-4 w-4 text-ink-muted" />
              ) : (
                <ChevronDown className="h-4 w-4 text-ink-muted" />
              )}
            </button>

            {detailsOpen && (
              <div className="mt-5 space-y-3.5 border-t border-border/60 pt-4 text-xs">
                {/* Applies to row */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <div className="flex items-center gap-2 w-32 shrink-0 text-ink-muted">
                    <FileText className="h-3.5 w-3.5 text-ink-muted" />
                    <span>Applies to</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[#F3F4F6] px-2 py-0.5 font-medium text-ink">
                      {lob || "MAPD"}
                    </span>
                    <span className="rounded bg-[#F3F4F6] px-2 py-0.5 font-medium text-ink">
                      State: {state || "Unknown"}
                    </span>
                    <span className="rounded bg-[#F3F4F6] px-2 py-0.5 font-medium text-ink">
                      Plan year: {planYear || "2026"}
                    </span>
                    <span className="rounded bg-[#F3F4F6] px-2 py-0.5 font-medium text-ink">
                      AEP opens Oct 15
                    </span>
                  </div>
                </div>

                {/* Answer type row */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <div className="flex items-center gap-2 w-32 shrink-0 text-ink-muted">
                    <FileText className="h-3.5 w-3.5 text-ink-muted" />
                    <span>Answer type</span>
                  </div>
                  <span className="font-medium text-ink">Approved knowledge</span>
                </div>

                {/* Last updated row */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <div className="flex items-center gap-2 w-32 shrink-0 text-ink-muted">
                    <Clock className="h-3.5 w-3.5 text-ink-muted" />
                    <span>Last updated</span>
                  </div>
                  <span className="font-medium text-ink">{lastUpdatedDate}</span>
                </div>

                {/* Approval status row */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <div className="flex items-center gap-2 w-32 shrink-0 text-ink-muted">
                    <Scale className="h-3.5 w-3.5 text-ink-muted" />
                    <span>Approval status</span>
                  </div>
                  <span className="font-medium text-ink">
                    Approved by {approverName} · {lastUpdatedDate}
                  </span>
                </div>

                {/* Next review row */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <div className="flex items-center gap-2 w-32 shrink-0 text-ink-muted">
                    <CalendarClock className="h-3.5 w-3.5 text-ink-muted" />
                    <span>Next review</span>
                  </div>
                  <span className="font-medium text-ink">{nextReviewDate}</span>
                </div>
              </div>
            )}
          </div>

          {/* Optional Policy Trace Drawer */}
          {showTrace && <TraceDrawer res={response} compact={false} />}
        </div>

        {/* Right Column: Sources Card & Related Questions Card */}
        <aside className="space-y-6">
          {/* Sources Card */}
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">
                Sources ({uniqueCitations.length || 2})
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (uniqueCitations[0]) setOpenCite(uniqueCitations[0]);
                }}
                className="text-xs font-semibold text-[#2E7D32] hover:underline"
              >
                View all →
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {uniqueCitations.length > 0 ? (
                uniqueCitations.map((c) => {
                  const u = getUnit(c.unit_id);
                  const meta = UNIT_META[c.unit_id];
                  const v = u?.versions.find((x) => x.version === c.version);
                  return (
                    <div
                      key={c.unit_id}
                      onClick={() => setOpenCite(c)}
                      className="group flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-border/80 bg-[#FAFAFA] p-3.5 transition-colors hover:border-[#2E7D32]/50 hover:bg-white"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#2E7D32]" />
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-xs font-bold text-ink group-hover:text-primary">
                              {c.title}
                            </span>
                            <span className="shrink-0 rounded-full bg-[#EAF7EE] px-2 py-0.5 text-[10px] font-semibold text-[#1E5E2E]">
                              Current
                            </span>
                          </div>
                          <p className="text-[11px] text-ink-muted">
                            Section 4.2 · Pages 12–14
                          </p>
                          <p className="text-[11px] text-ink-muted">
                            Approved by {v?.approver ?? c.owner ?? "Pharmacy Ops"}
                          </p>
                          <p className="text-[11px] text-ink-muted">
                            v{c.version} · {c.effective_date}
                          </p>
                          <p className="text-[11px] text-ink-muted">
                            Next review: {meta?.review_date ?? "12 Jan 2025"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-muted group-hover:text-ink" />
                    </div>
                  );
                })
              ) : (
                <>
                  {/* Fallback sources for screenshot demonstration */}
                  <div
                    onClick={() =>
                      setOpenCite({
                        unit_id: "U-PH-010",
                        version: 3,
                        title: "Member Services Guide v3",
                        owner: "Pharmacy Ops",
                        effective_date: "12 Jan 2024",
                        verbatim: false,
                      })
                    }
                    className="group flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-border/80 bg-[#FAFAFA] p-3.5 transition-colors hover:border-[#2E7D32]/50 hover:bg-white"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#2E7D32]" />
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-bold text-ink group-hover:text-primary">
                            Member Services Guide v3
                          </span>
                          <span className="shrink-0 rounded-full bg-[#EAF7EE] px-2 py-0.5 text-[10px] font-semibold text-[#1E5E2E]">
                            Current
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-muted">Section 4.2 · Pages 12–14</p>
                        <p className="text-[11px] text-ink-muted">Approved by Pharmacy Ops</p>
                        <p className="text-[11px] text-ink-muted">v3 · 12 Jan 2024</p>
                        <p className="text-[11px] text-ink-muted">Next review: 12 Jan 2025</p>
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-muted group-hover:text-ink" />
                  </div>

                  <div
                    onClick={() =>
                      setOpenCite({
                        unit_id: "U-PH-003",
                        version: 1,
                        title: "Pharmacy Benefits Policy",
                        owner: "Compliance",
                        effective_date: "02 Feb 2024",
                        verbatim: false,
                      })
                    }
                    className="group flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-border/80 bg-[#FAFAFA] p-3.5 transition-colors hover:border-[#2E7D32]/50 hover:bg-white"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#2E7D32]" />
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-bold text-ink group-hover:text-primary">
                            Pharmacy Benefits Policy
                          </span>
                          <span className="shrink-0 rounded-full bg-[#EAF7EE] px-2 py-0.5 text-[10px] font-semibold text-[#1E5E2E]">
                            Current
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-muted">Section 3.1 · Page 8</p>
                        <p className="text-[11px] text-ink-muted">Approved by Compliance</p>
                        <p className="text-[11px] text-ink-muted">v1 · 02 Feb 2024</p>
                        <p className="text-[11px] text-ink-muted">Next review: 02 Feb 2025</p>
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-muted group-hover:text-ink" />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Related Questions Card */}
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <h2 className="text-sm font-bold text-ink mb-3">Related questions</h2>
            <div className="divide-y divide-border/60">
              {relatedQuestions.map((rq, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectQuestion(rq)}
                  className="group flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-muted/50 rounded-lg px-1.5 -mx-1.5 focus:outline-none"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Search className="h-4 w-4 shrink-0 text-ink-muted" />
                    <span className="text-xs font-normal text-ink group-hover:text-primary leading-snug">
                      {rq}
                    </span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-muted group-hover:text-ink" />
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* Edit Context Dialog */}
      <Dialog open={editContextOpen} onOpenChange={setEditContextOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Search Context</DialogTitle>
            <DialogDescription>
              Adjust line of business, state, or plan year for this question.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-xs font-bold text-ink">Line of Business</label>
              <select
                value={lob}
                onChange={(e) => setLob(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="MAPD">MAPD</option>
                <option value="PDP">PDP</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-ink">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Unknown</option>
                <option value="KY">Kentucky (KY)</option>
                <option value="FL">Florida (FL)</option>
                <option value="OH">Ohio (OH)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-ink">Plan Year</label>
              <select
                value={planYear}
                onChange={(e) => setPlanYear(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setEditContextOpen(false);
                onSelectQuestion(question);
              }}
            >
              Update and search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag / Report Issue Dialog */}
      <Dialog open={flagOpen} onOpenChange={setFlagOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an issue with this answer</DialogTitle>
            <DialogDescription>
              Your note will be sent directly to the knowledge owner and recorded in the audit log.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            className="min-h-24 w-full rounded-md border border-border bg-surface p-3 text-sm"
            placeholder="Explain why this answer is inaccurate, outdated, or incomplete..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!flagReason.trim()}
              onClick={() => {
                const res = flagAnswer(
                  persona.name,
                  response.request_id,
                  uniqueCitations.map((c) => c.unit_id),
                  flagReason.trim(),
                );
                setFlagSent(res.owner);
                setFlagOpen(false);
              }}
            >
              Submit issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit Drawer when a citation is clicked */}
      <UnitDrawer citation={openCite} onClose={() => setOpenCite(null)} />
    </div>
  );
}
