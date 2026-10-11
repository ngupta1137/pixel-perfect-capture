import { useState, useMemo, useEffect } from "react";
import {
  Search,
  SlidersHorizontal,
  FileText,
  Check,
  X,
  MessageSquare,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Calendar,
  Sparkles,
  AlertTriangle,
  History,
  Info,
  Clock,
  ExternalLink,
  RotateCcw,
  FlaskConical,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INITIAL_REVIEW_QUEUE, type ReviewQueueItem, type ReviewStatus } from "@/types/review";
import { useSession } from "@/lib/session";
import { useDemoStore } from "@/services/demoStore";
import {
  aepReadiness,
  reverifyUnit,
  decideBlocker,
  fetchReviewQueue,
  submitReviewDecision,
  type ChainDraft,
} from "@/services/verity";

export function ReviewQueueView() {
  const { person, can } = useSession();
  const demoStore = useDemoStore((s) => s);
  
  const [items, setItems] = useState<ReviewQueueItem[]>(INITIAL_REVIEW_QUEUE);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeciding, setIsDeciding] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("REV-001");
  const [activeTab, setActiveTab] = useState<"all" | "my_reviews" | "requested_changes" | "approved" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Table selection & pagination
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set(["REV-001"]));
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter states
  const [filterLob, setFilterLob] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStaleOnly, setFilterStaleOnly] = useState(false);
  const [showAepSummary, setShowAepSummary] = useState(false);

  // Right details panel tab
  const [detailTab, setDetailTab] = useState<"content" | "context" | "source" | "history">("content");
  
  // Reviewer actions state (Reason modal / inputs)
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      // Tab filter
      if (activeTab === "my_reviews") {
        const isAssigned =
          it.assigned_reviewer &&
          it.assigned_reviewer.toLowerCase().includes(person.name.toLowerCase());
        if (it.status !== "Pending review" && !isAssigned) return false;
      } else if (activeTab === "requested_changes") {
        if (it.status !== "Requested changes") return false;
      } else if (activeTab === "approved") {
        if (it.status !== "Approved") return false;
      } else if (activeTab === "rejected") {
        if (it.status !== "Rejected") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          it.title.toLowerCase().includes(q) ||
          it.content.toLowerCase().includes(q) ||
          it.source_doc.toLowerCase().includes(q) ||
          (it.unit_id && it.unit_id.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Dropdown filters
      if (filterLob !== "all" && it.lob.toLowerCase() !== filterLob.toLowerCase()) return false;
      if (filterType !== "all" && it.type.toLowerCase() !== filterType.toLowerCase()) return false;
      if (filterStaleOnly && !it.due_date) return false;

      return true;
    });
  }, [items, activeTab, searchQuery, filterLob, filterType, filterStaleOnly, person.name]);

  const activeItem = useMemo(() => {
    if (!filteredItems.length) return null;
    return filteredItems.find((it) => it.id === selectedId) || filteredItems[0] || null;
  }, [filteredItems, selectedId]);

  useEffect(() => {
    if (activeItem && activeItem.id !== selectedId) {
      setSelectedId(activeItem.id);
    }
  }, [activeItem, selectedId]);

  // Role-based review capability checks
  const canApproveLegal = can("approve_legal");
  const canApproveStd = can("approve_standard") || canApproveLegal;
  const isLegalDraft = Boolean(
    activeItem && (
      activeItem.verbatim === 1 ||
      activeItem.type === "Legal" ||
      activeItem.assigned_reviewer?.toLowerCase().includes("legal")
    )
  );

  const proposerName = activeItem?.proposer || (activeItem as any)?.proposed_by || activeItem?.history?.[0]?.by || "";
  const proposerFirst = proposerName.trim().toLowerCase().split(/[\s(]/)[0];
  const reviewerFirst = person.name.trim().toLowerCase().split(/[\s(]/)[0];
  const isProposer = Boolean(
    activeItem &&
    proposerFirst &&
    reviewerFirst &&
    proposerFirst === reviewerFirst
  );

  let approveDisabledReason: string | null = null;
  if (!activeItem) {
    approveDisabledReason = "No unit selected.";
  } else if (activeItem.status === "Approved") {
    approveDisabledReason = "This knowledge unit has already been approved and published.";
  } else if (activeItem.status === "Rejected") {
    approveDisabledReason = "This draft has already been rejected.";
  } else if (!canApproveStd) {
    approveDisabledReason = `Your role (${person.label}) does not have approval authority. Approvals must be made by Knowledge Owner (Owen) or Legal Approver (Rita).`;
  } else if (isProposer) {
    approveDisabledReason = "Maker-checker restriction: You proposed this draft and cannot approve your own work.";
  } else if (isLegalDraft && !canApproveLegal) {
    approveDisabledReason = "This verbatim unit requires Legal Approver authorization (Rita).";
  }

  let reviewDisabledReason: string | null = null;
  if (!activeItem) {
    reviewDisabledReason = "No unit selected.";
  } else if (activeItem.status === "Approved") {
    reviewDisabledReason = "This knowledge unit has already been approved.";
  } else if (activeItem.status === "Rejected") {
    reviewDisabledReason = "This draft has already been rejected.";
  } else if (!canApproveStd) {
    reviewDisabledReason = `Your role (${person.label}) does not have review decision authority.`;
  }

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: items.length,
      my_reviews: items.filter(
        (it) => it.status === "Pending review" || (it.assigned_reviewer && it.assigned_reviewer.toLowerCase().includes(person.name.toLowerCase()))
      ).length,
      requested_changes: items.filter((it) => it.status === "Requested changes").length,
      approved: items.filter((it) => it.status === "Approved").length,
      rejected: items.filter((it) => it.status === "Rejected").length,
    };
  }, [items, person.name]);

  // Paginated items
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Selection handlers
  const handleToggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleCheckAll = () => {
    if (checkedIds.size === paginatedItems.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(paginatedItems.map((it) => it.id)));
    }
  };

  const handleSelectRow = (item: ReviewQueueItem) => {
    setSelectedId(item.id);
    setReviewerNotes(item.reviewer_notes || "");
    setActionError("");
    setActionSuccess("");
  };

  // Load persistent drafts from repository
  const loadQueue = async () => {
    try {
      const serverItems = await fetchReviewQueue();
      if (serverItems && serverItems.length > 0) {
        setItems(serverItems);
        setSelectedId((prev) => {
          if (serverItems.some((it) => it.id === prev)) {
            return prev;
          }
          return serverItems[0]!.id;
        });
      }
    } catch (err) {
      console.error("Failed to fetch review queue from server:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, []);

  // Approval / Decision Actions (Server-side with maker-checker & regression gate)
  const handleApprove = async () => {
    if (!activeItem || isDeciding) return;
    setActionError("");
    setActionSuccess("");

    // Check RBAC separation of duties
    const isApprover = can("approve_standard") || can("approve_legal");
    if (!isApprover) {
      setActionError("Your current role does not have authorization to approve knowledge units.");
      return;
    }

    setIsDeciding(true);
    try {
      const res = await submitReviewDecision({
        draftId: activeItem.id,
        action: "approve",
        notes: reviewerNotes,
      });

      if (!res.ok) {
        setActionError(res.error || "Failed to approve draft.");
        return;
      }

      setActionSuccess(res.message || `Successfully approved "${activeItem.title}"! Published as official governed knowledge.`);
      await loadQueue();
    } catch (err: any) {
      setActionError(err.message || "An unexpected error occurred during approval.");
    } finally {
      setIsDeciding(false);
    }
  };

  const handleReject = async () => {
    if (!activeItem || isDeciding) return;
    setActionError("");
    setActionSuccess("");

    if (reviewDisabledReason) {
      setActionError(reviewDisabledReason);
      return;
    }

    if (!reviewerNotes.trim()) {
      setActionError("A rejection reason or note is required to reject a knowledge unit.");
      return;
    }

    setIsDeciding(true);
    try {
      const res = await submitReviewDecision({
        draftId: activeItem.id,
        action: "reject",
        notes: reviewerNotes,
      });

      if (!res.ok) {
        setActionError(res.error || "Failed to reject draft.");
        return;
      }

      setActionSuccess(res.message || `Unit "${activeItem.title}" rejected and archived.`);
      await loadQueue();
    } catch (err: any) {
      setActionError(err.message || "An unexpected error occurred during rejection.");
    } finally {
      setIsDeciding(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!activeItem || isDeciding) return;
    setActionError("");
    setActionSuccess("");

    if (reviewDisabledReason) {
      setActionError(reviewDisabledReason);
      return;
    }

    if (!reviewerNotes.trim()) {
      setActionError("Please provide reviewer notes explaining the requested changes.");
      return;
    }

    setIsDeciding(true);
    try {
      const res = await submitReviewDecision({
        draftId: activeItem.id,
        action: "request_changes",
        notes: reviewerNotes,
      });

      if (!res.ok) {
        setActionError(res.error || "Failed to request changes.");
        return;
      }

      setActionSuccess(res.message || `Changes requested for "${activeItem.title}". Routed back to author queue.`);
      await loadQueue();
    } catch (err: any) {
      setActionError(err.message || "An unexpected error occurred while requesting changes.");
    } finally {
      setIsDeciding(false);
    }
  };

  const ready = aepReadiness(demoStore);
  const aepPct = Math.round((ready.done / ready.total) * 100);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Review queue</h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-muted">
            Review extracted knowledge units and approve, reject or request changes.
          </p>
        </div>

        {/* Top Right: Search & Filters */}
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-muted" />
            <Input
              placeholder="Search units..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9 bg-surface"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9 font-medium">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-4 text-xs space-y-3">
              <h4 className="font-semibold text-xs text-ink">Filter review items</h4>
              
              <div>
                <label className="text-[11px] text-ink-muted block mb-1">Line of business</label>
                <Select value={filterLob} onValueChange={setFilterLob}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="All lines of business" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="all">All lines of business</SelectItem>
                    <SelectItem value="mapd">MAPD</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="medicaid">Medicaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] text-ink-muted block mb-1">Content type</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="procedure">Procedure</SelectItem>
                    <SelectItem value="guidance">Guidance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setFilterLob("all");
                    setFilterType("all");
                    setFilterStaleOnly(false);
                  }}
                  className="text-xs text-ink-muted hover:text-ink cursor-pointer"
                >
                  Reset filters
                </button>
                <span className="text-[11px] text-ink-muted">
                  {filteredItems.length} matching
                </span>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAepSummary(!showAepSummary)}
            className="text-xs h-9 gap-1.5 border-[#C6E7D0] bg-[#EAF7EE]/40 text-[#1E5E2E] hover:bg-[#EAF7EE]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AEP 2027 ({ready.done}/{ready.total})
          </Button>
        </div>
      </div>

      {/* Optional AEP 2027 Readiness Banner */}
      {showAepSummary && (
        <div className="rounded-xl border border-[#C6E7D0] bg-[#EAF7EE]/50 p-4 text-xs space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#1E5E2E]" />
              <h3 className="font-bold text-ink">
                AEP 2027 Annual Election Period Readiness: {ready.done} of {ready.total} ({aepPct}%)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAepSummary(false)}
              className="text-ink-muted hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-ink">
            {ready.items.map((i) => (
              <div key={i.label} className="flex items-center gap-2">
                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  i.done ? "bg-[#1E5E2E] text-white" : "border border-border bg-white text-ink-muted"
                }`}>
                  {i.done ? "✓" : ""}
                </span>
                <span className={i.done ? "font-medium" : "text-ink-muted"}>{i.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex border-b border-border text-xs font-medium space-x-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab("all");
            setCurrentPage(1);
          }}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === "all"
              ? "border-[#1E5E2E] text-[#1E5E2E] font-bold"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          All ({counts.all})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("my_reviews");
            setCurrentPage(1);
          }}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === "my_reviews"
              ? "border-[#1E5E2E] text-[#1E5E2E] font-bold"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          My reviews ({counts.my_reviews})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("requested_changes");
            setCurrentPage(1);
          }}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === "requested_changes"
              ? "border-[#1E5E2E] text-[#1E5E2E] font-bold"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Requested changes ({counts.requested_changes})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("approved");
            setCurrentPage(1);
          }}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === "approved"
              ? "border-[#1E5E2E] text-[#1E5E2E] font-bold"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Approved ({counts.approved})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("rejected");
            setCurrentPage(1);
          }}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === "rejected"
              ? "border-[#1E5E2E] text-[#1E5E2E] font-bold"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Rejected ({counts.rejected})
        </button>
      </div>

      {/* Main 2-Pane Split: Left Table (7/12) & Right Details Panel (5/12) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Table Section */}
        <div className="xl:col-span-7 space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-[#F9FAFB] text-ink-muted">
                  <tr>
                    <th className="w-10 px-3 py-3 text-center">
                      <Checkbox
                        checked={checkedIds.size === paginatedItems.length && paginatedItems.length > 0}
                        onCheckedChange={handleToggleCheckAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="px-3 py-3 font-medium">Title / content preview</th>
                    <th className="px-3 py-3 font-medium">Source document</th>
                    <th className="px-3 py-3 font-medium">Type</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Extracted on</th>
                    <th className="px-3 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedItems.map((item) => {
                    const isSelected = item.id === selectedId;
                    const isChecked = checkedIds.has(item.id);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleSelectRow(item)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? "bg-[#EAF7EE]/35" : "hover:bg-[#F9FAFB]/70"
                        }`}
                      >
                        <td className="px-3 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleCheck(item.id)}
                            aria-label={`Select ${item.title}`}
                          />
                        </td>
                        <td className="px-3 py-3.5 space-y-1 max-w-[220px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-ink text-xs line-clamp-1">
                              {item.title}
                            </span>
                            {item.unit_id && (
                              <span className="font-mono text-[10px] text-ink-muted shrink-0">
                                ({item.unit_id})
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-ink-muted line-clamp-1">
                            {item.preview || item.content}
                          </p>
                        </td>
                        <td className="px-3 py-3.5 text-[11px] text-ink space-y-0.5 max-w-[140px]">
                          <span className="truncate block font-medium">{item.source_doc}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-ink-muted block text-[10px] truncate">{item.section}</span>
                            {item.is_demo ? (
                              <span className="inline-flex rounded px-1 py-0.2 text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                Demo
                              </span>
                            ) : (
                              <span className="inline-flex rounded px-1 py-0.2 text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                Live
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="inline-flex rounded bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-medium text-ink">
                            {item.type}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          {item.status === "Pending review" && (
                            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[10.5px] font-medium text-amber-700 border border-amber-200 whitespace-nowrap">
                              Pending review
                            </span>
                          )}
                          {item.status === "Requested changes" && (
                            <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-[10.5px] font-medium text-sky-700 border border-sky-200 whitespace-nowrap">
                              Requested changes
                            </span>
                          )}
                          {item.status === "Approved" && (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-medium text-emerald-700 border border-emerald-200 whitespace-nowrap">
                              Approved
                            </span>
                          )}
                          {item.status === "Rejected" && (
                            <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-[10.5px] font-medium text-rose-700 border border-rose-200 whitespace-nowrap">
                              Rejected
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3.5 text-[11px] text-ink-muted whitespace-nowrap">
                          {item.extracted_on}
                        </td>
                        <td className="px-3 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-ink-muted">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Row actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              <DropdownMenuItem onClick={() => handleSelectRow(item)}>
                                View details
                              </DropdownMenuItem>
                              {canApproveStd && (
                                <DropdownMenuItem onClick={() => handleSelectRow(item)}>
                                  Review item
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-ink-muted text-xs">
                        No review items match your selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination */}
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-ink-muted">
              <span>
                {filteredItems.length > 0
                  ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredItems.length)} of ${filteredItems.length}`
                  : "0 items"}
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <Button
                    key={idx}
                    variant={currentPage === idx + 1 ? "default" : "outline"}
                    size="icon"
                    className={`h-7 w-7 text-xs ${
                      currentPage === idx + 1 ? "bg-[#1E5E2E] text-white" : ""
                    }`}
                    onClick={() => setCurrentPage(idx + 1)}
                  >
                    {idx + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Details Panel Section */}
        <div className="xl:col-span-5 rounded-xl border border-border bg-surface p-5 shadow-2xs space-y-4">
          {activeItem ? (
            <>
              {/* Panel Header */}
              <div className="space-y-2 border-b border-border pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-ink leading-snug">
                        {activeItem.title}
                      </h2>
                      {activeItem.is_demo ? (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          Demo fixture
                        </span>
                      ) : (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Live record
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                      <FileText className="h-3.5 w-3.5 text-ink-muted" />
                      <span>{activeItem.source_doc}</span>
                      <span>•</span>
                      <span>{activeItem.section}</span>
                    </div>
                    <p className="text-[10px] text-ink-muted font-mono">
                      Draft: {activeItem.id} {activeItem.unit_id ? `• Unit: ${activeItem.unit_id}` : ""} • Extracted on {activeItem.extracted_on}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {activeItem.status === "Pending review" && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10.5px] font-medium text-amber-700 border border-amber-200">
                        Pending review
                      </span>
                    )}
                    {activeItem.status === "Requested changes" && (
                      <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[10.5px] font-medium text-sky-700 border border-sky-200">
                        Requested changes
                      </span>
                    )}
                    {activeItem.status === "Approved" && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-medium text-emerald-700 border border-emerald-200">
                        Approved
                      </span>
                    )}
                    {activeItem.status === "Rejected" && (
                      <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10.5px] font-medium text-rose-700 border border-rose-200">
                        Rejected
                      </span>
                    )}
                  </div>
                </div>

                {activeItem.is_demo ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 text-xs">
                    <FlaskConical className="h-4 w-4 text-amber-700 shrink-0" />
                    <div>
                      <span className="font-semibold">Demo Fixture</span>: Synthetic demonstration reference. Not an operational document.
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs">
                    <FileCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                    <div>
                      <span className="font-semibold">Live Operational Record</span>: Extracted from <span className="font-medium">{activeItem.source_doc}</span> (Doc ID: {activeItem.source_id || "N/A"}).
                      {activeItem.version ? ` • v${activeItem.version}` : ""}
                      {activeItem.supersedes ? ` • Supersedes ${activeItem.supersedes}` : ""}
                    </div>
                  </div>
                )}

                {/* Sub-tabs: Content, Context, Source, History */}
                <div className="flex border-b border-border text-xs font-medium pt-2">
                  <button
                    type="button"
                    onClick={() => setDetailTab("content")}
                    className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
                      detailTab === "content"
                        ? "border-[#1E5E2E] text-[#1E5E2E] font-semibold"
                        : "border-transparent text-ink-muted hover:text-ink"
                    }`}
                  >
                    Content
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab("context")}
                    className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
                      detailTab === "context"
                        ? "border-[#1E5E2E] text-[#1E5E2E] font-semibold"
                        : "border-transparent text-ink-muted hover:text-ink"
                    }`}
                  >
                    Context
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab("source")}
                    className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
                      detailTab === "source"
                        ? "border-[#1E5E2E] text-[#1E5E2E] font-semibold"
                        : "border-transparent text-ink-muted hover:text-ink"
                    }`}
                  >
                    Source
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab("history")}
                    className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
                      detailTab === "history"
                        ? "border-[#1E5E2E] text-[#1E5E2E] font-semibold"
                        : "border-transparent text-ink-muted hover:text-ink"
                    }`}
                  >
                    History
                  </button>
                </div>
              </div>

              {/* Tab 1: Content */}
              {detailTab === "content" && (
                <div className="space-y-4 text-xs">
                  {/* Extracted content */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="font-bold text-ink text-xs">Extracted content</h3>
                      <span className="text-[10px] font-mono text-ink-muted">
                        {activeItem.content.length} / 2000
                      </span>
                    </div>
                    <div className="rounded-lg border border-border bg-[#F9FAFB] p-3 text-ink leading-relaxed text-xs">
                      {activeItem.content}
                    </div>
                  </div>

                  {/* Unit details */}
                  <div className="space-y-2 border-t border-border pt-3">
                    <h3 className="font-bold text-ink text-xs">Unit details</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-ink-muted">Type</div>
                      <div>
                        <span className="inline-flex rounded bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-medium text-ink">
                          {activeItem.type}
                        </span>
                      </div>
                      <div className="text-ink-muted">Line of business</div>
                      <div className="font-medium text-ink">{activeItem.lob}</div>
                      <div className="text-ink-muted">State</div>
                      <div className="font-medium text-ink">{activeItem.state}</div>
                      <div className="text-ink-muted">Suggested effective date</div>
                      <div className="font-medium text-ink flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-ink-muted" />
                        {activeItem.suggested_effective_date}
                      </div>
                    </div>
                  </div>

                  {/* Key points */}
                  {activeItem.key_points && activeItem.key_points.length > 0 && (
                    <div className="space-y-1.5 border-t border-border pt-3">
                      <h3 className="font-bold text-ink text-xs">Key points (optional)</h3>
                      <ul className="list-disc pl-4 space-y-1 text-ink/90 text-[11px]">
                        {activeItem.key_points.map((pt, idx) => (
                          <li key={idx}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Reviewer notes */}
                  <div className="space-y-1.5 border-t border-border pt-3">
                    <label htmlFor="rev-notes" className="font-bold text-ink text-xs block">
                      Reviewer notes (optional)
                    </label>
                    <Textarea
                      id="rev-notes"
                      rows={3}
                      value={reviewerNotes}
                      onChange={(e) => setReviewerNotes(e.target.value)}
                      placeholder="Add notes, questions or suggested changes..."
                      className="text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Context */}
              {detailTab === "context" && (
                <div className="space-y-3 text-xs">
                  <h3 className="font-bold text-ink text-xs">Governance Context</h3>
                  <div className="rounded-lg border border-border bg-[#F9FAFB] p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Assigned reviewer:</span>
                      <span className="font-medium text-ink">{activeItem.assigned_reviewer || "Owen (Knowledge owner)"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Demand score:</span>
                      <span className="font-mono font-medium text-ink">{activeItem.demand ?? 45} requests</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Due date:</span>
                      <span className="font-medium text-ink">{activeItem.due_date || "2024-01-20"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Target audience:</span>
                      <span className="font-medium text-ink">Advocates, Member self-service</span>
                    </div>
                  </div>

                  {can("reverify_unit") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (activeItem.unit_id) reverifyUnit(person.name, activeItem.unit_id);
                        setActionSuccess(`Re-verified unit ${activeItem.unit_id || activeItem.title} for the current period.`);
                      }}
                      className="w-full text-xs h-8 gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Re-verify unit
                    </Button>
                  )}
                </div>
              )}

              {/* Tab 3: Source */}
              {detailTab === "source" && (
                <div className="space-y-3 text-xs">
                  <h3 className="font-bold text-ink text-xs">Source Document Information</h3>
                  <div className="rounded-lg border border-border bg-[#F9FAFB] p-3 space-y-2">
                    <p className="font-semibold text-ink">{activeItem.source_doc}</p>
                    {activeItem.source_id && (
                      <p className="font-mono text-[11px] text-ink-muted">Source ID: {activeItem.source_id}</p>
                    )}
                    <p className="text-ink-muted text-[11px]">Section: {activeItem.section}</p>
                    <p className="text-ink-muted text-[10px]">Extracted on {activeItem.extracted_on}</p>
                  </div>
                  <div className="p-3 bg-muted/40 rounded border border-border text-[11px] text-ink leading-relaxed">
                    Source text fragment verified against original document repository file.
                  </div>
                </div>
              )}

              {/* Tab 4: History */}
              {detailTab === "history" && (
                <div className="space-y-3 text-xs">
                  <h3 className="font-bold text-ink text-xs">Audit & Decision History</h3>
                  <ul className="space-y-2.5">
                    {activeItem.history?.map((h, idx) => (
                      <li key={idx} className="rounded border border-border p-2.5 bg-[#F9FAFB] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink">{h.action}</span>
                          <span className="text-[10px] text-ink-muted">{h.at}</span>
                        </div>
                        <p className="text-[11px] text-ink-muted">By {h.by}</p>
                        {h.note && (
                          <p className="text-[11px] text-ink bg-white p-1.5 rounded border border-border/70">
                            {h.note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Feedback messages */}
              {actionError && (
                <div className="flex items-start gap-1.5 text-xs text-destructive bg-destructive/5 p-2.5 rounded-md border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}

              {actionSuccess && (
                <div className="flex items-start gap-1.5 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-md border border-emerald-200">
                  <Check className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* Governance notice banner if actions are disabled */}
              {(approveDisabledReason || reviewDisabledReason) && (
                <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50/80 border border-amber-200 text-amber-900 text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Review Actions Restricted</span>:{" "}
                    {approveDisabledReason || reviewDisabledReason}
                  </div>
                </div>
              )}

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isDeciding || Boolean(reviewDisabledReason)}
                  title={reviewDisabledReason || undefined}
                  onClick={handleReject}
                  className="text-xs h-9 px-3 gap-1.5 text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isDeciding || Boolean(reviewDisabledReason)}
                  title={reviewDisabledReason || undefined}
                  onClick={handleRequestChanges}
                  className="text-xs h-9 px-3 gap-1.5 text-sky-700 border-sky-200 hover:bg-sky-50 hover:text-sky-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Request changes
                </Button>
                <Button
                  size="sm"
                  disabled={isDeciding || Boolean(approveDisabledReason)}
                  title={approveDisabledReason || undefined}
                  onClick={handleApprove}
                  className="text-xs h-9 px-4 gap-1.5 bg-[#1E5E2E] hover:bg-[#184d25] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="h-3.5 w-3.5" /> {isDeciding ? "Processing..." : "Approve"}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-center text-xs text-ink-muted py-12">
              Select a knowledge unit from the table to view details and review.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
