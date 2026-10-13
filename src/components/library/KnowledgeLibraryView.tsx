import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  List as ListIcon,
  LayoutGrid,
  MoreHorizontal,
  FileText,
  ClipboardList,
  Shield,
  Lightbulb,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  BookOpen,
  Copy,
  ExternalLink,
  Flag,
  Pencil,
  ArrowUpDown,
  RotateCcw,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSession } from "@/lib/session";
import {
  scopedLibrary,
  type EnrichedKnowledgeUnit,
  type ContentType,
  type KnowledgeStatus,
  type LineOfBusiness,
} from "@/lib/library";
import { useDemoStore } from "@/services/demoStore";
import { listUnits, fetchPublishedLibraryUnits, markUnitStale, reverifyUnit } from "@/services/verity";
import { AddKnowledgeMenu } from "./AddKnowledgeMenu";
import { KnowledgeDetailPanel } from "./KnowledgeDetailPanel";
import { ViewSourceModal } from "./ViewSourceModal";
import { FlagReviewModal } from "./FlagReviewModal";
import { toast } from "sonner";

type SortField = "last_updated" | "title" | "effective_date" | "status";

const CONTENT_TYPE_ICONS: Record<ContentType, typeof FileText> = {
  Policy: FileText,
  Procedure: ClipboardList,
  Legal: Shield,
  Guidance: Lightbulb,
};

export function KnowledgeLibraryView({ initialUnitId }: { initialUnitId?: string } = {}) {
  const { person, can } = useSession();
  const rawUnits = useDemoStore((s) => s.units);

  useEffect(() => {
    void fetchPublishedLibraryUnits();
  }, []);

  // Scoped units based on persona entitlements
  const allUnits = useMemo(() => {
    return scopedLibrary(listUnits(), person);
  }, [rawUnits, person]);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");

  const [lobFilter, setLobFilter] = useState<string>("MAPD");
  const [stateFilter, setStateFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("All");
  const [kbFilter, setKbFilter] = useState<string>("All");

  // View state & Sorting
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortField, setSortField] = useState<SortField>("last_updated");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selection & Detail Panel
  const defaultSelected = initialUnitId || "U-PH-010";
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(defaultSelected);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set([defaultSelected]));

  useEffect(() => {
    if (initialUnitId) {
      setSelectedUnitId(initialUnitId);
      setSelectedRowIds(new Set([initialUnitId]));
    }
  }, [initialUnitId]);

  // Modals
  const [sourceModalUnit, setSourceModalUnit] = useState<EnrichedKnowledgeUnit | null>(null);
  const [flagModalUnit, setFlagModalUnit] = useState<EnrichedKnowledgeUnit | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter logic
  const filteredUnits = useMemo(() => {
    return allUnits.filter((u) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = u.title.toLowerCase().includes(q);
        const matchId = u.unit_id.toLowerCase().includes(q);
        const matchSummary = u.summary.toLowerCase().includes(q);
        const matchOwner = u.owner.toLowerCase().includes(q);
        const matchKeyPoints = u.key_points.some((pt) => pt.toLowerCase().includes(q));
        if (!matchTitle && !matchId && !matchSummary && !matchOwner && !matchKeyPoints) {
          return false;
        }
      }

      // LOB filter
      if (lobFilter !== "All" && u.lob !== lobFilter && u.lob !== "All") {
        return false;
      }

      // State filter
      if (stateFilter !== "All") {
        if (stateFilter === "All states" && u.state !== "All states") return false;
        if (stateFilter !== "All states" && u.state !== stateFilter && u.state !== "All states") return false;
      }

      // Status filter
      if (statusFilter !== "All") {
        if (statusFilter === "Stale") {
          const isStale = u.status === "Stale" || u.next_review_status === "Overdue";
          if (!isStale) return false;
        } else if (u.status !== statusFilter) {
          return false;
        }
      } else {
        // By default, "All" displays active repository units; Retired units are categorized in the Retired tab
        if (u.status === "Retired" && !searchQuery.trim()) {
          return false;
        }
      }

      // Content type filter
      if (contentTypeFilter !== "All" && u.content_type !== contentTypeFilter) {
        return false;
      }

      // KB filter
      if (kbFilter !== "All" && u.kb !== kbFilter) {
        return false;
      }

      return true;
    });
  }, [allUnits, searchQuery, lobFilter, stateFilter, statusFilter, contentTypeFilter, kbFilter]);

  // Sort logic
  const sortedUnits = useMemo(() => {
    return [...filteredUnits].sort((a, b) => {
      let comp = 0;
      if (sortField === "last_updated") {
        comp = a.last_updated.localeCompare(b.last_updated);
      } else if (sortField === "effective_date") {
        comp = a.effective_date.localeCompare(b.effective_date);
      } else if (sortField === "title") {
        comp = a.title.localeCompare(b.title);
      } else if (sortField === "status") {
        comp = a.status.localeCompare(b.status);
      }
      return sortOrder === "desc" ? -comp : comp;
    });
  }, [filteredUnits, sortField, sortOrder]);

  // Pagination calculation
  const totalCount = sortedUnits.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedUnits.slice(start, start + pageSize);
  }, [sortedUnits, currentPage, pageSize]);

  // Selected unit object
  const selectedUnit = useMemo(() => {
    if (!selectedUnitId) return null;
    return allUnits.find((u) => u.unit_id === selectedUnitId) ?? null;
  }, [allUnits, selectedUnitId]);

  // Handle select all on current page
  const allCurrentPageSelected =
    paginatedUnits.length > 0 && paginatedUnits.every((u) => selectedRowIds.has(u.unit_id));

  const handleToggleSelectAll = () => {
    const next = new Set(selectedRowIds);
    if (allCurrentPageSelected) {
      paginatedUnits.forEach((u) => next.delete(u.unit_id));
    } else {
      paginatedUnits.forEach((u) => next.add(u.unit_id));
    }
    setSelectedRowIds(next);
  };

  const handleRowClick = (unit: EnrichedKnowledgeUnit) => {
    setSelectedUnitId(unit.unit_id);
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(unit.unit_id)) {
        // keep selected
      } else {
        next.add(unit.unit_id);
      }
      return next;
    });
  };

  const handleCheckboxToggle = (unitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
    setSelectedUnitId(unitId);
  };

  const handleCopyId = (unitId: string) => {
    navigator.clipboard.writeText(unitId);
    toast.success(`Copied Unit ID: ${unitId}`);
  };

  const startRecord = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex h-full flex-col space-y-5">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Knowledge library
          </h1>
          <p className="mt-1 text-xs text-ink-muted sm:text-sm">
            Browse and search approved knowledge units. All content is reviewed, permission-aware and governed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <AddKnowledgeMenu />
        </div>
      </div>

      {/* Overdue / Stale Banner for Owner attention */}
      {(() => {
        // Only Knowledge Owners and Approvers who can reverify units or manage review queues should see this banner.
        // Advocates and consumers cannot confirm validity or manage review cycles.
        const canManageReviews =
          can("reverify_unit") ||
          can("resolve_owner_item") ||
          can("view_owner_queue") ||
          can("approve_standard") ||
          can("approve_legal");
        if (!canManageReviews) return null;

        const overdueUnits = allUnits.filter((u) => u.status === "Stale" || u.next_review_status === "Overdue");
        if (overdueUnits.length === 0) return null;
        const target = overdueUnits[0]!;
        const isSelected = selectedUnitId === target.unit_id;
        return (
          <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-950 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white font-bold">
                <Clock className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold text-amber-950">
                  {overdueUnits.length} knowledge unit past review date: {target.unit_id} ({target.title})
                </p>
                <p className="text-amber-800 text-[11px]">
                  Annual review expired ({target.next_review || "2025-06-30"}). Click to confirm still valid (+12 mo) or revise version & dates.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedUnitId(target.unit_id);
                setSelectedRowIds(new Set([target.unit_id]));
              }}
              className={`h-8 text-xs font-semibold ${
                isSelected
                  ? "bg-amber-200 border-amber-400 text-amber-950"
                  : "bg-white border-amber-300 text-amber-900 hover:bg-amber-100"
              }`}
            >
              {isSelected ? "Selected in details →" : `Select ${target.unit_id}`}
            </Button>
          </div>
        );
      })()}

      {/* Quick Status Section Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {[
          { label: "All", value: "All" },
          { label: "Approved", value: "Approved" },
          { label: "Stale", value: "Stale" },
          { label: "Under review", value: "Under review" },
          { label: "Conflict", value: "Conflict" },
          { label: "Retired", value: "Retired" },
        ].map((tab) => {
          const isActive = statusFilter === tab.value;
          const count =
            tab.value === "All"
              ? allUnits.filter((u) => u.status !== "Retired").length
              : tab.value === "Stale"
              ? allUnits.filter((u) => u.status === "Stale" || u.next_review_status === "Overdue").length
              : tab.value === "Retired"
              ? allUnits.filter((u) => u.status === "Retired").length
              : allUnits.filter((u) => u.status === tab.value).length;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatusFilter(tab.value);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-[#1E5E2E] text-white shadow-sm"
                  : "bg-surface text-ink-muted hover:bg-muted hover:text-ink border border-border"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : (tab.value === "Stale" || tab.value === "Retired") && count > 0
                    ? "bg-[#FEE2E2] text-[#DC2626]"
                    : "bg-muted text-ink-muted"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            aria-label="Search knowledge by keyword, topic or document"
            className="h-10 w-full rounded-lg border-border bg-surface pl-10 pr-9 text-xs text-ink placeholder:text-ink-muted shadow-none focus-visible:ring-2 focus-visible:ring-[#1E5E2E]"
            placeholder="Search knowledge by keyword, topic or document..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter: Line of business */}
        <div className="relative">
          <select
            aria-label="Filter by line of business"
            className="field-select h-10 min-w-[130px] rounded-lg border border-border bg-surface px-3 pr-8 text-xs font-normal text-ink shadow-none focus-visible:ring-2 focus-visible:ring-[#1E5E2E] cursor-pointer"
            value={lobFilter}
            onChange={(e) => {
              setLobFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All">Line of business: All</option>
            <option value="MAPD">MAPD</option>
            <option value="Commercial">Commercial</option>
            <option value="Medicaid">Medicaid</option>
            <option value="Exchange">Exchange</option>
          </select>
        </div>

        {/* Filter: State */}
        <div className="relative">
          <select
            aria-label="Filter by state"
            className="field-select h-10 min-w-[100px] rounded-lg border border-border bg-surface px-3 pr-8 text-xs font-normal text-ink shadow-none focus-visible:ring-2 focus-visible:ring-[#1E5E2E] cursor-pointer"
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All">State: All</option>
            <option value="All states">All states</option>
            <option value="KY">Kentucky (KY)</option>
            <option value="FL">Florida (FL)</option>
            <option value="CA">California (CA)</option>
            <option value="OH">Ohio (OH)</option>
            <option value="TX">Texas (TX)</option>
            <option value="NY">New York (NY)</option>
          </select>
        </div>

        {/* Filter: Status */}
        <div className="relative">
          <select
            aria-label="Filter by status"
            className="field-select h-10 min-w-[100px] rounded-lg border border-border bg-surface px-3 pr-8 text-xs font-normal text-ink shadow-none focus-visible:ring-2 focus-visible:ring-[#1E5E2E] cursor-pointer"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All">Status: All</option>
            <option value="Approved">Approved</option>
            <option value="Under review">Under review</option>
            <option value="Draft">Draft</option>
            <option value="Stale">Stale</option>
            <option value="Conflict">Conflict</option>
          </select>
        </div>

        {/* Filter: Content type */}
        <div className="relative">
          <select
            aria-label="Filter by content type"
            className="field-select h-10 min-w-[120px] rounded-lg border border-border bg-surface px-3 pr-8 text-xs font-normal text-ink shadow-none focus-visible:ring-2 focus-visible:ring-[#1E5E2E] cursor-pointer"
            value={contentTypeFilter}
            onChange={(e) => {
              setContentTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All">Content type: All</option>
            <option value="Policy">Policy</option>
            <option value="Procedure">Procedure</option>
            <option value="Legal">Legal</option>
            <option value="Guidance">Guidance</option>
          </select>
        </div>

        {/* Popover: More filters */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-10 gap-1.5 rounded-lg border-border bg-surface px-3.5 text-xs font-medium text-ink hover:bg-muted"
            >
              <Filter className="h-3.5 w-3.5 text-ink-muted" />
              <span>More filters</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-3 p-4 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-semibold text-ink">Additional Filters</span>
              <button
                type="button"
                onClick={() => {
                  setLobFilter("All");
                  setStateFilter("All");
                  setStatusFilter("All");
                  setContentTypeFilter("All");
                  setKbFilter("All");
                  setSearchQuery("");
                }}
                className="text-[11px] text-[#1E5E2E] hover:underline"
              >
                Reset all
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-ink-muted">Knowledge base</span>
              <select
                className="field-select w-full h-8 text-xs"
                value={kbFilter}
                onChange={(e) => setKbFilter(e.target.value)}
              >
                <option value="All">All knowledge bases</option>
                {person.kbs.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Count, Sorting & View Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="text-xs font-semibold text-ink">
          {totalCount} knowledge {totalCount === 1 ? "unit" : "units"}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-ink-muted">Sort by</span>
            <select
              aria-label="Sort knowledge units"
              className="field-select h-8 min-w-[130px] rounded-md border border-border bg-surface px-2.5 text-xs text-ink cursor-pointer"
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
            >
              <option value="last_updated">Last updated</option>
              <option value="title">Title</option>
              <option value="effective_date">Effective date</option>
              <option value="status">Status</option>
            </select>
          </div>

          {/* List / Grid toggle */}
          <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
            <button
              type="button"
              aria-label="List view"
              onClick={() => setViewMode("list")}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-[#EAF7EE] text-[#1E5E2E] border border-[#1E5E2E]"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <ListIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Grid view"
              onClick={() => setViewMode("grid")}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-[#EAF7EE] text-[#1E5E2E] border border-[#1E5E2E]"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Area: Table/Grid + Right Detail Panel */}
      <div className="flex min-h-[480px] flex-1 items-start gap-0 overflow-hidden rounded-xl border border-border bg-surface">
        {/* Left Side: Table or Grid */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {viewMode === "list" ? (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-alt/70 text-ink-muted">
                    <th className="w-10 px-4 py-3 text-center">
                      <Checkbox
                        checked={allCurrentPageSelected}
                        onCheckedChange={handleToggleSelectAll}
                        aria-label="Select all units on this page"
                        className="data-[state=checked]:bg-[#1E5E2E] data-[state=checked]:border-[#1E5E2E]"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold text-ink-muted">Title</th>
                    <th className="px-4 py-3 font-semibold text-ink-muted">Content type</th>
                    <th className="px-4 py-3 font-semibold text-ink-muted">Status</th>
                    <th className="px-4 py-3 font-semibold text-ink-muted">Effective date</th>
                    <th className="px-4 py-3 font-semibold text-ink-muted">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortField === "last_updated") {
                            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                          } else {
                            setSortField("last_updated");
                            setSortOrder("desc");
                          }
                        }}
                        className="flex items-center gap-1 hover:text-ink"
                      >
                        <span>Last updated</span>
                        <span>{sortField === "last_updated" && sortOrder === "desc" ? "↓" : "↑"}</span>
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-ink-muted">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedUnits.map((u) => {
                    const isSelected = selectedUnitId === u.unit_id;
                    const isChecked = selectedRowIds.has(u.unit_id);
                    const ContentIcon = CONTENT_TYPE_ICONS[u.content_type] || FileText;

                    return (
                      <tr
                        key={u.unit_id}
                        onClick={() => handleRowClick(u)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#EAF7EE]/90 hover:bg-[#EAF7EE]"
                            : "bg-surface hover:bg-[#F9FAFB]"
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center" onClick={(e) => handleCheckboxToggle(u.unit_id, e)}>
                          <Checkbox
                            checked={isChecked}
                            aria-label={`Select ${u.title}`}
                            className="data-[state=checked]:bg-[#1E5E2E] data-[state=checked]:border-[#1E5E2E]"
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`font-medium ${isSelected ? "text-[#1E5E2E] font-semibold" : "text-ink"}`}>
                            {u.title}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-ink-muted">
                          <div className="flex items-center gap-1.5">
                            <ContentIcon className="h-3.5 w-3.5 text-ink-muted" />
                            <span>{u.content_type}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              u.status === "Approved"
                                ? "bg-[#EAF7EE] text-[#1E5E2E]"
                                : u.status === "Under review"
                                  ? "bg-[#FEF3C7] text-[#D97706]"
                                  : u.status === "Stale"
                                    ? "bg-[#F3F4F6] text-[#6B7280]"
                                    : u.status === "Conflict"
                                      ? "bg-[#F3E8FF] text-[#7E22CE]"
                                      : u.status === "Retired"
                                        ? "bg-[#FEE2E2] text-[#DC2626]"
                                        : "bg-[#EFF6FF] text-[#1D4ED8]"
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-ink-muted whitespace-nowrap">
                          {u.effective_date_formatted}
                        </td>
                        <td className="px-4 py-3.5 text-ink-muted whitespace-nowrap">
                          {u.last_updated_formatted}
                        </td>
                        <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label="Row actions"
                                className="h-7 w-7 p-0 text-ink-muted hover:text-ink"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              <DropdownMenuItem
                                onClick={() => handleRowClick(u)}
                                className="gap-2 cursor-pointer"
                              >
                                <BookOpen className="h-3.5 w-3.5 text-ink-muted" />
                                <span>View details</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => setSourceModalUnit(u)}
                                className="gap-2 cursor-pointer"
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-ink-muted" />
                                <span>View source document</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleCopyId(u.unit_id)}
                                className="gap-2 cursor-pointer"
                              >
                                <Copy className="h-3.5 w-3.5 text-ink-muted" />
                                <span>Copy unit ID</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => setFlagModalUnit(u)}
                                className="gap-2 cursor-pointer text-[#C25E00]"
                              >
                                <Flag className="h-3.5 w-3.5" />
                                <span>Flag for review</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => {
                                  if (u.status === "Stale" || u.next_review_status === "Overdue") {
                                    reverifyUnit(person.name, u.unit_id);
                                    toast.success(`Unit ${u.unit_id} re-verified.`);
                                  } else {
                                    markUnitStale(u.unit_id, person.name);
                                    toast.warning(`Unit ${u.unit_id} marked as Stale.`);
                                  }
                                }}
                                className="gap-2 cursor-pointer text-[#B45309]"
                              >
                                <Clock className="h-3.5 w-3.5" />
                                <span>{u.status === "Stale" || u.next_review_status === "Overdue" ? "Re-verify unit (Mark current)" : "Mark as Stale (Review due)"}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedUnits.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-xs text-ink-muted">
                        No knowledge units match your current search and filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 overflow-y-auto">
              {paginatedUnits.map((u) => {
                const isSelected = selectedUnitId === u.unit_id;
                const ContentIcon = CONTENT_TYPE_ICONS[u.content_type] || FileText;

                return (
                  <div
                    key={u.unit_id}
                    onClick={() => handleRowClick(u)}
                    className={`cursor-pointer rounded-xl border p-4 text-xs transition-all ${
                      isSelected
                        ? "border-[#1E5E2E] bg-[#EAF7EE]/40 shadow-sm"
                        : "border-border bg-surface hover:border-[#1E5E2E]/50 hover:bg-[#F9FAFB]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          u.status === "Approved"
                            ? "bg-[#EAF7EE] text-[#1E5E2E]"
                            : u.status === "Under review"
                              ? "bg-[#FEF3C7] text-[#D97706]"
                              : u.status === "Stale"
                                ? "bg-[#F3F4F6] text-[#6B7280]"
                                : u.status === "Conflict"
                                  ? "bg-[#F3E8FF] text-[#7E22CE]"
                                  : u.status === "Retired"
                                    ? "bg-[#FEE2E2] text-[#DC2626]"
                                    : "bg-[#EFF6FF] text-[#1D4ED8]"
                        }`}
                      >
                        {u.status}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-ink-muted">
                        <ContentIcon className="h-3 w-3" />
                        {u.content_type}
                      </span>
                    </div>

                    <h3 className="mt-2.5 font-semibold text-ink line-clamp-2">
                      {u.title}
                    </h3>

                    <p className="mt-1 text-[11px] text-ink-muted line-clamp-2">
                      {u.summary}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-border/80 pt-2.5 text-[11px] text-ink-muted">
                      <span>Updated {u.last_updated_formatted}</span>
                      <span className="font-mono text-[10px]">{u.unit_id}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Pagination Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-5 py-3 text-xs">
            <div className="text-ink-muted">
              {startRecord}–{endRecord} of {totalCount}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                aria-label="Previous page"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8 p-0 text-ink border-border hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <Button
                  key={pageNum}
                  variant="outline"
                  size="sm"
                  aria-label={`Page ${pageNum}`}
                  aria-current={currentPage === pageNum ? "page" : undefined}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-8 w-8 p-0 text-xs font-medium transition-colors ${
                    currentPage === pageNum
                      ? "border-[#1E5E2E] bg-white text-[#1E5E2E] font-semibold ring-1 ring-[#1E5E2E]"
                      : "border-border text-ink-muted hover:bg-muted hover:text-ink"
                  }`}
                >
                  {pageNum}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                aria-label="Next page"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 w-8 p-0 text-ink border-border hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side: Detail Panel */}
        {selectedUnit && (
          <div className="hidden lg:block h-full">
            <KnowledgeDetailPanel
              unit={selectedUnit}
              onClose={() => setSelectedUnitId(null)}
              onSelectUnit={(id) => {
                setSelectedUnitId(id);
                setSelectedRowIds((prev) => new Set([...prev, id]));
              }}
              onViewSource={(u) => setSourceModalUnit(u)}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <ViewSourceModal
        unit={sourceModalUnit}
        open={!!sourceModalUnit}
        onOpenChange={(open) => !open && setSourceModalUnit(null)}
      />

      <FlagReviewModal
        unit={flagModalUnit}
        open={!!flagModalUnit}
        onOpenChange={(open) => !open && setFlagModalUnit(null)}
      />
    </div>
  );
}
