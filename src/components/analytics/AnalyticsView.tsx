import { useState, useMemo } from "react";
import {
  Calendar,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  MoreHorizontal,
  ArrowUpRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDemoStore } from "@/services/demoStore";

export function AnalyticsView() {
  const [selectedLob, setSelectedLob] = useState("all");
  const [dateRange, setDateRange] = useState("jan2024");

  const demoRequests = useDemoStore((s) => s.requests);
  const units = useDemoStore((s) => s.units);

  // Dynamic calculations overlaid on baseline telemetry
  const baseQuestions = 1248 + demoRequests.length;
  const baseEscalations = 38 + demoRequests.filter((r) => r.outcome === "safety_escalation" || r.outcome === "not_authorized").length;
  const activeUnitsCount = units.length > 0 ? units.filter((u) => u.status === "approved").length + 300 : 324;

  const TOP_TOPICS = [
    { name: "Pharmacy benefits", count: 320, pct: 100 },
    { name: "Prior authorization", count: 210, pct: 65 },
    { name: "Mail order", count: 168, pct: 52 },
    { name: "Step therapy", count: 124, pct: 39 },
    { name: "Formulary exceptions", count: 96, pct: 30 },
  ];

  const ESCALATIONS_DATA = [
    {
      question: "Is GLP-1 covered for weight management?",
      topic: "Pharmacy benefits",
      lob: "MAPD",
      severity: "High",
      date: "12 Jan 2024",
      status: "Open",
    },
    {
      question: "Can member get early refill after travel?",
      topic: "Mail order",
      lob: "MAPD",
      severity: "Medium",
      date: "11 Jan 2024",
      status: "In review",
    },
    {
      question: "Is step therapy required for inhalers?",
      topic: "Step therapy",
      lob: "Commercial",
      severity: "Medium",
      date: "09 Jan 2024",
      status: "Open",
    },
    {
      question: "Coverage for continuous glucose monitor",
      topic: "Durable medical equipment",
      lob: "MAPD",
      severity: "High",
      date: "08 Jan 2024",
      status: "Open",
    },
    {
      question: "Formulary exception for specialty medication",
      topic: "Formulary exceptions",
      lob: "Commercial",
      severity: "Low",
      date: "05 Jan 2024",
      status: "Planned",
    },
  ];

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "High":
        return <span className="inline-flex items-center rounded-md bg-[#FDE2E2] px-2 py-0.5 text-xs font-semibold text-[#D32F2F]">High</span>;
      case "Medium":
        return <span className="inline-flex items-center rounded-md bg-[#FEF08A] px-2 py-0.5 text-xs font-semibold text-[#854D0E]">Medium</span>;
      case "Low":
        return <span className="inline-flex items-center rounded-md bg-[#DCFCE7] px-2 py-0.5 text-xs font-semibold text-[#15803D]">Low</span>;
      default:
        return <span>{severity}</span>;
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
        return <span>{status}</span>;
    }
  };

  // Sparkline generator helper
  const renderSparkline = (points: number[], color: string) => {
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 120;
    const height = 32;

    const pathData = points
      .map((p, i) => {
        const x = (i / (points.length - 1)) * width;
        const y = height - ((p - min) / range) * (height - 6) - 3;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    return (
      <svg width={width} height={height} className="overflow-visible shrink-0">
        <path d={pathData} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Analytics</h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-muted">
            Track usage, content performance and knowledge gaps across Verity.
          </p>
        </div>

        {/* Date and LOB Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-ink-muted" />
            <span>01 Jan 2024 – 31 Jan 2024</span>
            <ChevronDown className="h-3.5 w-3.5 text-ink-muted" />
          </div>

          <Select value={selectedLob} onValueChange={setSelectedLob}>
            <SelectTrigger className="h-9 w-44 text-xs">
              <SelectValue placeholder="All lines of business" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lines of business</SelectItem>
              <SelectItem value="MAPD">MAPD</SelectItem>
              <SelectItem value="Commercial">Commercial</SelectItem>
              <SelectItem value="Medicaid">Medicaid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total questions */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF7EE] text-[#1E5E2E]">
              <MessageSquare className="h-4 w-4" />
            </div>
            {renderSparkline([10, 12, 14, 13, 16, 18, 19, 22, 25], "#1E5E2E")}
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-ink-muted">Total questions</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-ink tracking-tight">{baseQuestions.toLocaleString()}</span>
              <span className="inline-flex items-center text-xs font-semibold text-[#15803D]">
                ↑ 12%
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Answer accuracy */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF7EE] text-[#1E5E2E]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            {renderSparkline([88, 89, 90, 89, 91, 91, 92, 92, 92], "#1E5E2E")}
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-ink-muted">Answer accuracy</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-ink tracking-tight">92%</span>
              <span className="inline-flex items-center text-xs font-semibold text-[#15803D]">
                ↑ 4%
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Escalations */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FDE2E2] text-[#D32F2F]">
              <AlertTriangle className="h-4 w-4" />
            </div>
            {renderSparkline([20, 24, 22, 28, 30, 26, 32, 35, 38], "#D32F2F")}
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-ink-muted">Escalations</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-ink tracking-tight">{baseEscalations}</span>
              <span className="inline-flex items-center text-xs font-semibold text-[#D32F2F]">
                ↑ 8%
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Active knowledge units */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF7EE] text-[#1E5E2E]">
              <BookOpen className="h-4 w-4" />
            </div>
            {renderSparkline([300, 305, 310, 312, 316, 318, 320, 322, 324], "#1E5E2E")}
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-ink-muted">Active knowledge units</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-ink tracking-tight">{activeUnitsCount}</span>
              <span className="inline-flex items-center text-xs font-semibold text-[#15803D]">
                ↑ 6%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Questions Over Time & Top Topics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Questions Over Time Stacked Chart */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-2xs lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <h2 className="text-sm font-bold text-ink">Questions over time</h2>
            <div className="flex items-center gap-4 text-xs text-ink-muted">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#1E5E2E]" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#A3E635]" />
                <span>Escalated</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex h-44 items-end gap-2 sm:gap-3">
              {[
                { day: "1 Jan", ans: 35, esc: 4 },
                { day: "5 Jan", ans: 45, esc: 6 },
                { day: "10 Jan", ans: 40, esc: 5 },
                { day: "15 Jan", ans: 55, esc: 7 },
                { day: "20 Jan", ans: 48, esc: 6 },
                { day: "25 Jan", ans: 52, esc: 8 },
                { day: "31 Jan", ans: 58, esc: 9 },
              ].map((bar, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-col justify-end gap-1 h-36">
                    <div
                      className="w-full rounded-t bg-[#A3E635]"
                      style={{ height: `${bar.esc * 3}px` }}
                      title={`Escalated: ${bar.esc}`}
                    />
                    <div
                      className="w-full rounded-t bg-[#1E5E2E]"
                      style={{ height: `${bar.ans * 1.8}px` }}
                      title={`Answered: ${bar.ans}`}
                    />
                  </div>
                  <span className="text-[10px] text-ink-muted mt-1 whitespace-nowrap">{bar.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Topics Bars */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-2xs">
          <div className="border-b border-border pb-3">
            <h2 className="text-sm font-bold text-ink">Top topics</h2>
          </div>

          <div className="mt-4 space-y-4 text-xs">
            {TOP_TOPICS.map((topic) => (
              <div key={topic.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">{topic.name}</span>
                  <span className="font-semibold text-ink-muted font-mono">{topic.count}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#1E5E2E]"
                    style={{ width: `${topic.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row 1: 3 Breakdown Widgets */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Answer Sources Donut / Breakdown */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-ink border-b border-border pb-3">Answer sources</h2>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#1E5E2E" strokeWidth="4" strokeDasharray="78 100" strokeDashoffset="0" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#86EFAC" strokeWidth="4" strokeDasharray="12 100" strokeDashoffset="-78" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" strokeWidth="4" strokeDasharray="6 100" strokeDashoffset="-90" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#EF4444" strokeWidth="4" strokeDasharray="4 100" strokeDashoffset="-96" />
              </svg>
              <div className="absolute text-center">
                <p className="text-xs font-bold text-ink leading-tight">1,248</p>
                <p className="text-[9px] text-ink-muted">questions</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs flex-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-ink">
                  <span className="h-2 w-2 rounded-full bg-[#1E5E2E]" /> Approved knowledge
                </span>
                <span className="font-semibold font-mono">78%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-ink">
                  <span className="h-2 w-2 rounded-full bg-[#86EFAC]" /> Related knowledge
                </span>
                <span className="font-semibold font-mono">12%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-ink">
                  <span className="h-2 w-2 rounded-full bg-[#F59E0B]" /> External reference
                </span>
                <span className="font-semibold font-mono">6%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-ink">
                  <span className="h-2 w-2 rounded-full bg-[#EF4444]" /> No source (escalated)
                </span>
                <span className="font-semibold font-mono">4%</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Feedback */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-ink border-b border-border pb-3">User feedback</h2>
          <div className="mt-4 space-y-3.5 text-xs">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">Helpful</span>
                <span className="font-semibold font-mono">72%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-[#1E5E2E]" style={{ width: "72%" }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">Partially helpful</span>
                <span className="font-semibold font-mono">20%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-[#86EFAC]" style={{ width: "20%" }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">Not helpful</span>
                <span className="font-semibold font-mono">8%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-[#EF4444]" style={{ width: "8%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Knowledge Gaps by Severity */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-ink border-b border-border pb-3">Knowledge gaps by severity</h2>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#EF4444" strokeWidth="4" strokeDasharray="40 100" strokeDashoffset="0" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" strokeWidth="4" strokeDasharray="40 100" strokeDashoffset="-40" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#15803D" strokeWidth="4" strokeDasharray="20 100" strokeDashoffset="-80" />
              </svg>
              <div className="absolute text-center">
                <p className="text-xs font-bold text-ink leading-tight">5</p>
                <p className="text-[9px] text-ink-muted">gaps</p>
              </div>
            </div>

            <div className="space-y-2 text-xs flex-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-ink">
                  <span className="h-2 w-2 rounded-full bg-[#EF4444]" /> High
                </span>
                <span className="font-semibold font-mono">2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-ink">
                  <span className="h-2 w-2 rounded-full bg-[#F59E0B]" /> Medium
                </span>
                <span className="font-semibold font-mono">2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-ink">
                  <span className="h-2 w-2 rounded-full bg-[#15803D]" /> Low
                </span>
                <span className="font-semibold font-mono">1</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row 2: Recent Escalations Table */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-bold text-ink">Recent escalations</h2>
          <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E5E2E] hover:underline cursor-pointer">
            View all <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-[#F9FAFB] text-ink-muted font-medium">
              <tr>
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3">Line of business</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ESCALATIONS_DATA.map((esc, i) => (
                <tr key={i} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-4 py-3 font-medium text-ink">{esc.question}</td>
                  <td className="px-4 py-3 text-ink-muted">{esc.topic}</td>
                  <td className="px-4 py-3 text-ink-muted">{esc.lob}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{getSeverityBadge(esc.severity)}</td>
                  <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{esc.date}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(esc.status)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="rounded p-1 text-ink-muted hover:text-ink hover:bg-muted cursor-pointer" aria-label="Action">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Review escalation</DropdownMenuItem>
                        <DropdownMenuItem>Assign team</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
