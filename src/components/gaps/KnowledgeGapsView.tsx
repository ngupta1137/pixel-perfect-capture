import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  X,
  AlertCircle,
  FileText,
  Clock,
  TrendingUp,
  User,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SEEDED_KNOWLEDGE_GAPS, type KnowledgeGap, type GapType } from "@/types/gaps";
import { useDemoStore } from "@/services/demoStore";
import { classifyGapDomain } from "@/lib/gapClassifier";

interface KnowledgeGapsViewProps {
  onCreateUnit?: (gap?: KnowledgeGap) => void;
}

export function KnowledgeGapsView({ onCreateUnit }: KnowledgeGapsViewProps) {
  const [activeTab, setActiveTab] = useState<"All" | GapType>("All");
  const [selectedDomain, setSelectedDomain] = useState<"all" | "Pharmacy" | "Insurance">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLob, setSelectedLob] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [selectedGapIds, setSelectedGapIds] = useState<string[]>([]);
  const [selectedGap, setSelectedGap] = useState<KnowledgeGap | null>(SEEDED_KNOWLEDGE_GAPS[0] ?? null);
  const [detailTab, setDetailTab] = useState<"Overview" | "Search insights" | "Related content">("Overview");

  const demoRequests = useDemoStore((s) => s.requests);

  // Combine seeded gaps with live session gaps from search requests
  const allGaps = useMemo(() => {
    const liveGaps: KnowledgeGap[] = [];
    demoRequests
      .filter((r) => r.outcome === "insufficient_evidence" || r.outcome === "conflict" || r.outcome === "stale")
      .forEach((r, idx) => {
        // avoid duplicating if query exists
        if (!SEEDED_KNOWLEDGE_GAPS.some((g) => g.topic.toLowerCase() === r.query.toLowerCase())) {
          const classification = classifyGapDomain(r.query);
          liveGaps.push({
            id: `LIVE-GAP-${idx + 1}`,
            topic: r.query,
            description: `Session query logged as ${r.outcome.replace(/_/g, " ")}. Logged in ${classification.domain} knowledge queue (${classification.ownerTeam}).`,
            type: r.outcome === "conflict" ? "Conflicting" : r.outcome === "stale" ? "Outdated" : "Insufficient",
            severity: "High",
            lastIdentified: new Date(r.at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            relatedSearches: 1,
            status: "Open",
            lob: r.context.lob || "MAPD",
            state: r.context.state || "All states",
            domain: classification.domain,
            knowledge_base: classification.kb,
            ownerTeam: classification.ownerTeam,
            assignedOwner: classification.assignedOwner,
            summary: `Identified from live search by ${r.person}. Outcome: ${r.outcome}. Auto-routed to ${classification.domain} knowledge queue (${classification.kb}) for ${classification.assignedOwner}.`,
            reasons: ["Live session query without approved coverage", `Intelligently routed to ${classification.ownerTeam} queue`, "High priority advocate query"],
            activity: [
              {
                user: r.person,
                action: "Logged during search",
                date: new Date(r.at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
              },
              {
                user: "System (Intelligent Router)",
                action: `Classified as ${classification.domain} and routed to ${classification.assignedOwner}`,
                date: new Date(r.at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
              },
            ],
          });
        }
      });
    return [...SEEDED_KNOWLEDGE_GAPS, ...liveGaps];
  }, [demoRequests]);

  const counts = useMemo(() => {
    return {
      all: allGaps.length,
      insufficient: allGaps.filter((g) => g.type === "Insufficient").length,
      conflicting: allGaps.filter((g) => g.type === "Conflicting").length,
      outdated: allGaps.filter((g) => g.type === "Outdated").length,
      pharmacy: allGaps.filter((g) => (g.domain || classifyGapDomain(g.topic).domain) === "Pharmacy").length,
      insurance: allGaps.filter((g) => (g.domain || classifyGapDomain(g.topic).domain) === "Insurance").length,
    };
  }, [allGaps]);

  const filteredGaps = useMemo(() => {
    return allGaps.filter((g) => {
      if (activeTab !== "All" && g.type !== activeTab) return false;
      if (selectedDomain !== "all") {
        const d = g.domain || classifyGapDomain(g.topic).domain;
        if (d !== selectedDomain) return false;
      }
      if (selectedLob !== "all" && g.lob !== selectedLob) return false;
      if (selectedSeverity !== "all" && g.severity.toLowerCase() !== selectedSeverity.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return g.topic.toLowerCase().includes(q) || g.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allGaps, activeTab, selectedDomain, selectedLob, selectedSeverity, searchQuery]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGapIds(filteredGaps.map((g) => g.id));
    } else {
      setSelectedGapIds([]);
    }
  };

  const handleToggleGap = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedGapIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getGapTypeBadge = (type: GapType) => {
    switch (type) {
      case "Insufficient":
        return <span className="inline-flex items-center rounded-md bg-[#FDE2E2] px-2 py-0.5 text-xs font-semibold text-[#D32F2F]">Insufficient</span>;
      case "Conflicting":
        return <span className="inline-flex items-center rounded-md bg-[#FDE8D7] px-2 py-0.5 text-xs font-semibold text-[#C25E00]">Conflicting</span>;
      case "Outdated":
        return <span className="inline-flex items-center rounded-md bg-[#E1EFFE] px-2 py-0.5 text-xs font-semibold text-[#1E429F]">Outdated</span>;
    }
  };

  const getSeverityBadge = (severity: "High" | "Medium" | "Low") => {
    switch (severity) {
      case "High":
        return <span className="inline-flex items-center rounded-md bg-[#FDE2E2] px-2 py-0.5 text-xs font-semibold text-[#D32F2F]">High</span>;
      case "Medium":
        return <span className="inline-flex items-center rounded-md bg-[#FEF08A] px-2 py-0.5 text-xs font-semibold text-[#854D0E]">Medium</span>;
      case "Low":
        return <span className="inline-flex items-center rounded-md bg-[#DCFCE7] px-2 py-0.5 text-xs font-semibold text-[#15803D]">Low</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Open":
        return <span className="inline-flex items-center rounded-md bg-[#FDE2E2] px-2 py-0.5 text-xs font-semibold text-[#D32F2F]">Open</span>;
      case "In review":
        return <span className="inline-flex items-center rounded-md bg-[#FDE8D7] px-2 py-0.5 text-xs font-semibold text-[#C25E00]">In review</span>;
      case "Planned":
        return <span className="inline-flex items-center rounded-md bg-[#F3F4F6] px-2 py-0.5 text-xs font-semibold text-[#4B5563]">Planned</span>;
      default:
        return <span className="inline-flex items-center rounded-md bg-[#DCFCE7] px-2 py-0.5 text-xs font-semibold text-[#15803D]">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Knowledge gaps</h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-muted">
            Find topics with insufficient, outdated or conflicting information and take action.
          </p>
        </div>
        <Button
          onClick={() => onCreateUnit?.(selectedGap ?? undefined)}
          className="h-9 bg-[#1E5E2E] text-xs font-medium text-white hover:bg-[#184d25] cursor-pointer"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Create knowledge unit
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("All")}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            activeTab === "All"
              ? "border-[#1E5E2E] text-[#1E5E2E] font-semibold"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          All gaps <span className="rounded-full bg-muted px-1.5 py-0.2 text-[11px] font-semibold text-ink-muted">({counts.all})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("Insufficient")}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            activeTab === "Insufficient"
              ? "border-[#1E5E2E] text-[#1E5E2E] font-semibold"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Insufficient <span className="rounded-full bg-muted px-1.5 py-0.2 text-[11px] font-semibold text-ink-muted">({counts.insufficient})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("Conflicting")}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            activeTab === "Conflicting"
              ? "border-[#1E5E2E] text-[#1E5E2E] font-semibold"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Conflicting <span className="rounded-full bg-muted px-1.5 py-0.2 text-[11px] font-semibold text-ink-muted">({counts.conflicting})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("Outdated")}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            activeTab === "Outdated"
              ? "border-[#1E5E2E] text-[#1E5E2E] font-semibold"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Outdated <span className="rounded-full bg-muted px-1.5 py-0.2 text-[11px] font-semibold text-ink-muted">({counts.outdated})</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            placeholder="Search gaps by topic, keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted">Domain / Queue</span>
          <Select value={selectedDomain} onValueChange={(val: any) => setSelectedDomain(val)}>
            <SelectTrigger className="h-9 w-40 text-xs font-medium">
              <SelectValue placeholder="All domains" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All domains ({counts.all})</SelectItem>
              <SelectItem value="Pharmacy">Pharmacy · Owen ({counts.pharmacy})</SelectItem>
              <SelectItem value="Insurance">Insurance · Olivia ({counts.insurance})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted">Line of business</span>
          <Select value={selectedLob} onValueChange={setSelectedLob}>
            <SelectTrigger className="h-9 w-28 text-xs">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="MAPD">MAPD</SelectItem>
              <SelectItem value="Commercial">Commercial</SelectItem>
              <SelectItem value="Medicaid">Medicaid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted">State</span>
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="h-9 w-24 text-xs">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="KY">KY</SelectItem>
              <SelectItem value="FL">FL</SelectItem>
              <SelectItem value="OH">OH</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted">Severity</span>
          <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
            <SelectTrigger className="h-9 w-24 text-xs">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm" className="h-9 text-xs font-normal">
          <Filter className="mr-1.5 h-3.5 w-3.5" /> More filters
        </Button>
      </div>

      {/* Main Content Area: Table + Side Panel */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Table Area */}
        <div className="flex-1 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-[#F9FAFB] text-ink-muted font-medium">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={
                        filteredGaps.length > 0 &&
                        filteredGaps.every((g) => selectedGapIds.includes(g.id))
                      }
                      onCheckedChange={(c) => handleSelectAll(Boolean(c))}
                      aria-label="Select all gaps"
                    />
                  </th>
                  <th className="px-4 py-3">Topic / question</th>
                  <th className="px-4 py-3">Domain / Queue</th>
                  <th className="px-4 py-3">Gap type</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Last identified</th>
                  <th className="px-4 py-3">Related searches</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredGaps.map((gap) => {
                  const isSelectedRow = selectedGap?.id === gap.id;
                  const isChecked = selectedGapIds.includes(gap.id);
                  return (
                    <tr
                      key={gap.id}
                      onClick={() => setSelectedGap(gap)}
                      className={`cursor-pointer transition-colors ${
                        isSelectedRow ? "bg-[#EAF7EE]/60" : "hover:bg-[#F9FAFB]"
                      }`}
                    >
                      <td className="px-4 py-3.5" onClick={(e) => handleToggleGap(gap.id, e)}>
                        <Checkbox checked={isChecked} aria-label={`Select ${gap.topic}`} />
                      </td>
                      <td className="px-4 py-3.5 min-w-[220px]">
                        <p className="font-semibold text-ink text-[13px]">{gap.topic}</p>
                        <p className="mt-0.5 text-xs text-ink-muted line-clamp-1">{gap.description}</p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {(gap.domain || classifyGapDomain(gap.topic).domain) === "Insurance" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            Insurance · Olivia
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Pharmacy · Owen
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getGapTypeBadge(gap.type)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getSeverityBadge(gap.severity)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-ink-muted">
                        {gap.lastIdentified}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-medium text-ink">
                        {gap.relatedSearches}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getStatusBadge(gap.status)}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="rounded p-1 hover:bg-muted text-ink-muted hover:text-ink cursor-pointer"
                              aria-label="Actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onCreateUnit?.(gap)}>
                              Create knowledge unit
                            </DropdownMenuItem>
                            <DropdownMenuItem>Assign knowledge team</DropdownMenuItem>
                            <DropdownMenuItem>Mark as resolved</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
                {filteredGaps.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-ink-muted">
                      <AlertCircle className="mx-auto h-8 w-8 text-ink-muted mb-2" />
                      <p className="font-medium text-sm text-ink">No matching knowledge gaps</p>
                      <p className="mt-1 text-xs">Try adjusting your filters or search keywords.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Detail Panel */}
        {selectedGap && (
          <aside className="w-full lg:w-[420px] shrink-0 rounded-xl border border-border bg-surface p-5 shadow-2xs space-y-5">
            {/* Panel Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-ink leading-snug">{selectedGap.topic}</h2>
                  {selectedGap.severity === "High" && (
                    <span className="rounded-md bg-[#FDE2E2] px-2 py-0.5 text-[11px] font-semibold text-[#D32F2F]">
                      High severity
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGap(null)}
                className="rounded-lg p-1 text-ink-muted hover:bg-muted hover:text-ink cursor-pointer"
                aria-label="Close details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Panel Sub-Tabs */}
            <div className="flex gap-4 border-b border-border text-xs">
              {(["Overview", "Search insights", "Related content"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDetailTab(t)}
                  className={`pb-2 font-medium transition-colors cursor-pointer ${
                    detailTab === t
                      ? "border-b-2 border-[#1E5E2E] text-[#1E5E2E] font-semibold"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Sub-Tab 1: Overview */}
            {detailTab === "Overview" && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="font-semibold text-ink">Gap summary</h3>
                  <p className="mt-1.5 text-ink-muted leading-relaxed">
                    {selectedGap.summary}
                  </p>
                </div>

                {/* Why this is a gap */}
                <div className="rounded-lg border border-[#FDE2E2] bg-[#FDF2F2] p-3.5 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-[#991B1B]">
                    <AlertCircle className="h-4 w-4 shrink-0 text-[#DC2626]" />
                    <span>Why this is a gap</span>
                  </div>
                  <ul className="mt-2 space-y-1 pl-6 list-disc text-ink/80 text-[11px]">
                    {selectedGap.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                {/* Details list */}
                <div>
                  <h3 className="font-semibold text-ink mb-2">Details</h3>
                  <dl className="grid grid-cols-2 gap-y-2.5 text-xs">
                    <dt className="text-ink-muted">Knowledge domain</dt>
                    <dd className="font-semibold text-right text-ink">
                      {selectedGap.domain ?? classifyGapDomain(selectedGap.topic).domain} ({selectedGap.knowledge_base ?? classifyGapDomain(selectedGap.topic).kb})
                    </dd>

                    <dt className="text-ink-muted">Assigned owner</dt>
                    <dd className="font-semibold text-right text-[#1E5E2E]">
                      {selectedGap.assignedOwner ?? classifyGapDomain(selectedGap.topic).assignedOwner}
                    </dd>

                    <dt className="text-ink-muted">Gap type</dt>
                    <dd className="font-medium text-right">{getGapTypeBadge(selectedGap.type)}</dd>

                    <dt className="text-ink-muted">Severity</dt>
                    <dd className="font-medium text-right">{getSeverityBadge(selectedGap.severity)}</dd>

                    <dt className="text-ink-muted">Line of business</dt>
                    <dd className="font-medium text-ink text-right">{selectedGap.lob}</dd>

                    <dt className="text-ink-muted">State</dt>
                    <dd className="font-medium text-ink text-right">{selectedGap.state}</dd>

                    <dt className="text-ink-muted">First identified</dt>
                    <dd className="font-medium text-ink text-right">{selectedGap.lastIdentified}</dd>

                    <dt className="text-ink-muted">Related searches</dt>
                    <dd className="font-medium text-ink text-right font-mono">{selectedGap.relatedSearches}</dd>

                    <dt className="text-ink-muted">Status</dt>
                    <dd className="font-medium text-right">{getStatusBadge(selectedGap.status)}</dd>
                  </dl>
                </div>

                {/* Activity Feed */}
                <div>
                  <h3 className="font-semibold text-ink mb-2">Activity</h3>
                  <div className="space-y-2">
                    {selectedGap.activity.map((act, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1E5E2E]/10 text-[#1E5E2E]">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-medium text-ink">{act.action}</p>
                          <p className="text-[11px] text-ink-muted">{act.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sticky Action Button */}
                <Button
                  type="button"
                  onClick={() => onCreateUnit?.(selectedGap)}
                  className="w-full h-9 bg-[#1E5E2E] text-xs font-medium text-white hover:bg-[#184d25] cursor-pointer"
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Create knowledge unit
                </Button>
              </div>
            )}

            {/* Sub-Tab 2: Search Insights */}
            {detailTab === "Search insights" && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="font-semibold text-ink">Member search demand</h3>
                  <p className="mt-1 text-ink-muted">
                    Total queries logged across channels: <strong className="text-ink font-semibold">{selectedGap.searchInsights?.totalQueries ?? selectedGap.relatedSearches}</strong>
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-ink mb-1.5">Sample member search questions</h4>
                  <ul className="space-y-1.5">
                    {selectedGap.searchInsights?.sampleQueries.map((sq, i) => (
                      <li key={i} className="rounded-lg bg-[#F9FAFB] p-2 text-xs text-ink border border-border">
                        "{sq}"
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-ink mb-1.5">Volume by channel</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedGap.searchInsights?.topChannels.map((tc, i) => (
                      <span key={i} className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-ink">
                        {tc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 3: Related Content */}
            {detailTab === "Related content" && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="font-semibold text-ink">Potential nearby units</h3>
                  <p className="mt-1 text-ink-muted">
                    These approved or drafting units share semantic concepts with this gap:
                  </p>
                </div>

                <div className="space-y-2">
                  {selectedGap.relatedContent?.map((rc) => (
                    <div key={rc.id} className="rounded-lg border border-border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] text-ink-muted">{rc.id}</span>
                        <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-semibold text-[#1E5E2E]">
                          {rc.similarity} match
                        </span>
                      </div>
                      <p className="font-medium text-ink text-xs">{rc.title}</p>
                      <p className="text-[11px] text-ink-muted">Type: {rc.type}</p>
                    </div>
                  ))}
                  {!selectedGap.relatedContent?.length && (
                    <p className="text-ink-muted italic">No related content mapped.</p>
                  )}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
