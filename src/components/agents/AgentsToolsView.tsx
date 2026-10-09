import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  X,
  Bot,
  Plug,
  CheckCircle2,
  AlertCircle,
  Play,
  RefreshCw,
  Sliders,
  ShieldCheck,
  History,
  Link as LinkIcon,
  Database,
  Globe,
  FileCode,
  Layers,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { callToolFn, getCallLog } from "@/services/agents.functions";
import { callTool } from "@/verity-engine/agents";
import { useDemoStore } from "@/services/demoStore";
import type { AgentTool, CallLogRow, ToolCallResult } from "@/services/agents";

export interface AgentOrToolItem {
  id: string;
  name: string;
  subId: string;
  type: "Agent" | "Tool";
  category: "agent" | "llm_tool" | "integration";
  description: string;
  status: "Active" | "Disabled";
  lastUpdated: string;
  icon: typeof Bot;
  capabilities?: string[];
  modelSettings?: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  connectedTools?: {
    name: string;
    status: "Connected" | "Disconnected";
  }[];
}

export const AGENT_ITEMS: AgentOrToolItem[] = [
  {
    id: "agent-1",
    name: "Q&A Agent",
    subId: "answer-agent",
    type: "Agent",
    category: "agent",
    description: "Answers member questions using approved knowledge and applies guardrails.",
    status: "Active",
    lastUpdated: "12 Jan 2024",
    icon: Bot,
    capabilities: [
      "Search approved knowledge units",
      "Retrieve relevant content with citations",
      "Detect low-confidence or out-of-scope questions",
      "Escalate to human when needed",
      "Support voice and text input",
    ],
    modelSettings: {
      provider: "Azure OpenAI",
      model: "GPT-4o",
      temperature: 0.2,
      maxTokens: 1024,
    },
    connectedTools: [
      { name: "Knowledge search", status: "Connected" },
      { name: "Member profile (read-only)", status: "Connected" },
      { name: "Formulary API", status: "Connected" },
    ],
  },
  {
    id: "agent-2",
    name: "Ingestion Agent",
    subId: "ingest-agent",
    type: "Agent",
    category: "agent",
    description: "Extracts and suggests knowledge units from uploaded documents.",
    status: "Active",
    lastUpdated: "10 Jan 2024",
    icon: Layers,
    capabilities: [
      "Parse PDF, DOCX and formatted document hierarchies",
      "Extract discrete candidate statements with citations",
      "Identify duplicates against existing knowledge base",
      "Format verbatim fragments for legal routing",
    ],
    modelSettings: {
      provider: "Azure OpenAI",
      model: "GPT-4o",
      temperature: 0.1,
      maxTokens: 2048,
    },
    connectedTools: [
      { name: "Document parser", status: "Connected" },
      { name: "Knowledge base index", status: "Connected" },
    ],
  },
  {
    id: "agent-3",
    name: "Review Assistant",
    subId: "review-agent",
    type: "Agent",
    category: "agent",
    description: "Helps reviewers by highlighting key changes and potential issues.",
    status: "Active",
    lastUpdated: "09 Jan 2024",
    icon: CheckCircle2,
    capabilities: [
      "Run golden set release gate regression tests",
      "Flag conflicting or stale phrasing",
      "Compare proposed vs current version diffs",
    ],
    modelSettings: {
      provider: "Azure OpenAI",
      model: "GPT-4o",
      temperature: 0.0,
      maxTokens: 1024,
    },
    connectedTools: [
      { name: "Release gate validator", status: "Connected" },
      { name: "Review queue API", status: "Connected" },
    ],
  },
  {
    id: "agent-4",
    name: "Analytics Agent",
    subId: "analytics-agent",
    type: "Agent",
    category: "agent",
    description: "Generates insights on usage, accuracy and knowledge gaps.",
    status: "Active",
    lastUpdated: "08 Jan 2024",
    icon: Bot,
    capabilities: [
      "Cluster unanswered search questions into gap topics",
      "Monitor demand trends across lines of business",
      "Identify review bottlenecks",
    ],
    modelSettings: {
      provider: "Azure OpenAI",
      model: "GPT-4o-mini",
      temperature: 0.2,
      maxTokens: 1024,
    },
    connectedTools: [{ name: "Telemetry warehouse", status: "Connected" }],
  },
  {
    id: "tool-1",
    name: "EMR Integration",
    subId: "emr-connector",
    type: "Tool",
    category: "integration",
    description: "Connects to member and clinical data from EMR systems.",
    status: "Active",
    lastUpdated: "05 Jan 2024",
    icon: Plug,
    capabilities: [
      "Read-only FHIR demographic lookup",
      "Prescription history verification",
    ],
    connectedTools: [{ name: "FHIR API gateway", status: "Connected" }],
  },
  {
    id: "tool-2",
    name: "Formulary API",
    subId: "formulary-api",
    type: "Tool",
    category: "llm_tool",
    description: "Fetches formulary and medication data from external sources.",
    status: "Active",
    lastUpdated: "03 Jan 2024",
    icon: Database,
    capabilities: [
      "Real-time formulary tier querying",
      "Drug pricing estimate endpoint",
    ],
    connectedTools: [{ name: "Pharmacy benefit manager", status: "Connected" }],
  },
  {
    id: "tool-3",
    name: "Web Search",
    subId: "web-search",
    type: "Tool",
    category: "llm_tool",
    description: "Searches external references (used only when allowed).",
    status: "Disabled",
    lastUpdated: "01 Jan 2024",
    icon: Globe,
    capabilities: ["Public health guidance citation fallback"],
    connectedTools: [{ name: "Approved external web crawler", status: "Disconnected" }],
  },
];

const PRESETS: {
  label: string;
  tool: AgentTool;
  query?: string;
  unit_id?: string;
  since?: string;
}[] = [
  {
    label: "Disclaimer, word for word",
    tool: "search_knowledge",
    query: "Rx pricing disclaimer I have to read on this call",
  },
  { label: "Unit outside my role", tool: "get_unit", unit_id: "U-IN-002" },
  {
    label: "Two sources disagree",
    tool: "search_knowledge",
    query: "how many days supply can a member get by mail",
  },
  { label: "What changed lately", tool: "list_changes", since: "2026-02-01" },
  {
    label: "Report a gap",
    tool: "report_gap",
    query: "does the member's plan cover a shingles vaccine at the pharmacy",
  },
];

const OUTCOME_CLS: Record<string, string> = {
  answer: "text-[#15803D]",
  ok: "text-[#15803D]",
  conflict: "text-[#C25E00]",
  not_authorized: "text-[#D32F2F]",
  insufficient_evidence: "text-[#D32F2F]",
  needs_clarification: "text-[#854D0E]",
  stale: "text-[#854D0E]",
  safety_escalation: "text-[#D32F2F]",
  error: "text-[#D32F2F]",
};

export function AgentsToolsView() {
  const [activeTab, setActiveTab] = useState<"all" | "llm_tool" | "integration">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<AgentOrToolItem | null>(AGENT_ITEMS[0] ?? null);
  const [detailTab, setDetailTab] = useState<"Overview" | "Configuration" | "Guardrails" | "History">("Overview");

  // Live MCP Tool Runner State
  const [role, setRole] = useState("pharmacy_advocate");
  const [tool, setTool] = useState<AgentTool>("search_knowledge");
  const [query, setQuery] = useState(PRESETS[0]?.query ?? "");
  const [unitId, setUnitId] = useState("U-IN-002");
  const [since, setSince] = useState("2026-02-01");
  const [result, setResult] = useState<ToolCallResult | null>(null);
  const [log, setLog] = useState<CallLogRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const searches = useDemoStore((st) => st.requests);

  const rows: CallLogRow[] = [
    ...log,
    ...searches.map(
      (q) =>
        ({
          at: q.at,
          iface: "REST",
          principal: q.person,
          role: q.context.role,
          tool: "search_knowledge",
          outcome: String(q.outcome),
        }) as CallLogRow,
    ),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at)));

  const refreshLog = () =>
    getCallLog()
      .then(setLog)
      .catch(() => {});

  useEffect(() => {
    void refreshLog();
  }, []);

  async function runTool(t: AgentTool, args: { query?: string; unit_id?: string; since?: string }) {
    setBusy(true);
    setError("");
    try {
      const r = callTool({
        role,
        tool: t,
        query: args.query ?? null,
        unit_id: args.unit_id ?? null,
        since: args.since ?? null,
      });
      setResult(r);
      setLog(r.log);
    } catch {
      setError("The tool service is unavailable. No result was returned.");
    } finally {
      setBusy(false);
    }
  }

  const filteredItems = AGENT_ITEMS.filter((item) => {
    if (activeTab === "llm_tool" && item.category !== "llm_tool") return false;
    if (activeTab === "integration" && item.category !== "integration") return false;
    if (typeFilter !== "all" && item.type.toLowerCase() !== typeFilter.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.subId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Agents & tools</h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-muted">
            Manage AI agents and connected tools used by Verity.
          </p>
        </div>
        <Button className="h-9 bg-[#1E5E2E] text-xs font-medium text-white hover:bg-[#184d25] cursor-pointer">
          <Plus className="mr-1.5 h-4 w-4" /> Add agent
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            activeTab === "all"
              ? "border-[#1E5E2E] text-[#1E5E2E] font-semibold"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          All agents <span className="rounded-full bg-muted px-1.5 py-0.2 text-[11px] font-semibold text-ink-muted">(5)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("llm_tool")}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            activeTab === "llm_tool"
              ? "border-[#1E5E2E] text-[#1E5E2E] font-semibold"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          LLM tools <span className="rounded-full bg-muted px-1.5 py-0.2 text-[11px] font-semibold text-ink-muted">(3)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("integration")}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            activeTab === "integration"
              ? "border-[#1E5E2E] text-[#1E5E2E] font-semibold"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Integrations <span className="rounded-full bg-muted px-1.5 py-0.2 text-[11px] font-semibold text-ink-muted">(4)</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[280px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            placeholder="Search agents or tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-xs"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-32 text-xs">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="tool">Tool</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Table + Side Panel */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Table */}
        <div className="flex-1 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-[#F9FAFB] text-ink-muted font-medium">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-[#EAF7EE]/60" : "hover:bg-[#F9FAFB]"
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-[#F9FAFB] text-[#1E5E2E]">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-ink text-[13px]">{item.name}</p>
                            <p className="text-xs font-mono text-ink-muted">{item.subId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md bg-[#DCFCE7] px-2 py-0.5 text-xs font-semibold text-[#15803D]">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-sm text-ink-muted leading-relaxed">
                        {item.description}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.status === "Active"
                              ? "bg-[#EAF7EE] text-[#15803D]"
                              : "bg-muted text-ink-muted"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              item.status === "Active" ? "bg-[#15803D]" : "bg-ink-muted"
                            }`}
                          />
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-ink-muted">
                        {item.lastUpdated}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="rounded p-1 text-ink-muted hover:text-ink hover:bg-muted cursor-pointer" aria-label="Action">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedItem(item); setDetailTab("Configuration"); }}>
                              Configure settings
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedItem(item); setDetailTab("Configuration"); }}>
                              Test tool call
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Detail Panel */}
        {selectedItem && (
          <aside className="w-full lg:w-[420px] shrink-0 rounded-xl border border-border bg-surface p-5 shadow-2xs space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-[#EAF7EE] text-[#1E5E2E]">
                  <selectedItem.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-ink">{selectedItem.name}</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF7EE] px-2 py-0.2 text-[10px] font-semibold text-[#15803D]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" /> Active
                    </span>
                  </div>
                  <p className="text-xs font-mono text-ink-muted">{selectedItem.subId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-lg p-1 text-ink-muted hover:bg-muted hover:text-ink cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-border text-xs">
              {(["Overview", "Configuration", "Guardrails", "History"] as const).map((t) => (
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

            {/* Sub-tab 1: Overview */}
            {detailTab === "Overview" && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="font-semibold text-ink mb-1">Description</h3>
                  <p className="text-ink-muted leading-relaxed">
                    {selectedItem.description} Provides grounded answers with citations and shows when it cannot answer.
                  </p>
                </div>

                {selectedItem.capabilities && (
                  <div>
                    <h3 className="font-semibold text-ink mb-2">Capabilities</h3>
                    <ul className="space-y-1.5">
                      {selectedItem.capabilities.map((cap, i) => (
                        <li key={i} className="flex items-start gap-2 text-ink">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#1E5E2E] mt-0.5" />
                          <span>{cap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedItem.modelSettings && (
                  <div>
                    <h3 className="font-semibold text-ink mb-2">Model settings</h3>
                    <div className="rounded-lg border border-border p-3 space-y-2 bg-[#F9FAFB]/50">
                      <div className="flex justify-between">
                        <span className="text-ink-muted">LLM provider</span>
                        <span className="font-medium text-ink">{selectedItem.modelSettings.provider}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Model</span>
                        <span className="font-medium text-ink font-mono">{selectedItem.modelSettings.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Temperature</span>
                        <span className="font-medium text-ink font-mono">{selectedItem.modelSettings.temperature}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Max tokens</span>
                        <span className="font-medium text-ink font-mono">{selectedItem.modelSettings.maxTokens}</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedItem.connectedTools && (
                  <div>
                    <h3 className="font-semibold text-ink mb-2">Connected tools</h3>
                    <div className="space-y-1.5">
                      {selectedItem.connectedTools.map((t, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                          <span className="font-medium text-ink flex items-center gap-2">
                            <FileCode className="h-3.5 w-3.5 text-ink-muted" /> {t.name}
                          </span>
                          <span className="rounded bg-[#EAF7EE] px-1.5 py-0.5 text-[10px] font-semibold text-[#15803D]">
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDetailTab("Configuration")}
                    className="flex-1 h-9 text-xs"
                  >
                    Edit configuration
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setDetailTab("Configuration")}
                    className="flex-1 h-9 bg-[#1E5E2E] text-xs font-medium text-white hover:bg-[#184d25] cursor-pointer"
                  >
                    Test agent
                  </Button>
                </div>
              </div>
            )}

            {/* Sub-tab 2: Configuration & Live Tool Execution */}
            {detailTab === "Configuration" && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="font-semibold text-ink">Live Governed Tool Tester</h3>
                  <p className="mt-1 text-ink-muted">
                    Test MCP tool calls bound to active connection permissions:
                  </p>
                </div>

                <div className="space-y-3 rounded-lg border border-border p-3 bg-[#F9FAFB]">
                  <div>
                    <label className="block text-[11px] font-semibold text-ink mb-1">Bound Connection Role</label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="h-8 text-xs bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pharmacy_advocate">Pharmacy Advocate (KB-PHARM, KB-SHARED)</SelectItem>
                        <SelectItem value="insurance_advocate">Insurance Advocate (KB-INS, KB-SHARED)</SelectItem>
                        <SelectItem value="member_chat">Member Chat (Member-safe)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-ink mb-1">MCP Tool Name</label>
                    <Select value={tool} onValueChange={(v) => setTool(v as AgentTool)}>
                      <SelectTrigger className="h-8 text-xs font-mono bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="search_knowledge">search_knowledge</SelectItem>
                        <SelectItem value="get_unit">get_unit</SelectItem>
                        <SelectItem value="report_gap">report_gap</SelectItem>
                        <SelectItem value="list_changes">list_changes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-ink mb-1">
                      {tool === "get_unit" ? "unit_id" : tool === "list_changes" ? "since" : "Query"}
                    </label>
                    {tool === "get_unit" ? (
                      <Input value={unitId} onChange={(e) => setUnitId(e.target.value)} className="h-8 text-xs font-mono bg-white" />
                    ) : tool === "list_changes" ? (
                      <Input value={since} onChange={(e) => setSince(e.target.value)} className="h-8 text-xs font-mono bg-white" />
                    ) : (
                      <Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 text-xs bg-white" />
                    )}
                  </div>

                  <Button
                    disabled={busy}
                    onClick={() => runTool(tool, { query, unit_id: unitId, since })}
                    className="w-full h-8 bg-[#1E5E2E] text-xs font-medium text-white hover:bg-[#184d25] cursor-pointer"
                  >
                    <Play className="mr-1.5 h-3.5 w-3.5" /> Call tool
                  </Button>
                </div>

                {/* Presets */}
                <div>
                  <span className="text-[11px] font-semibold text-ink-muted block mb-1.5">Quick Presets</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setTool(p.tool);
                          if (p.query) setQuery(p.query);
                          if (p.unit_id) setUnitId(p.unit_id);
                          if (p.since) setSince(p.since);
                          void runTool(p.tool, p);
                        }}
                        className="rounded border border-border bg-white px-2 py-1 text-[11px] text-ink hover:bg-muted cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Result Display */}
                {result && (
                  <div className="rounded-lg border border-border p-3 space-y-2 bg-white">
                    <p className="font-semibold text-ink flex items-center justify-between">
                      <span>Outcome:</span>
                      <span className={`font-mono ${OUTCOME_CLS[result.outcome.split(",")[0]?.trim() ?? ""] ?? "text-ink"}`}>
                        {result.outcome}
                      </span>
                    </p>
                    {result.result_json && (
                      <pre className="max-h-48 overflow-auto rounded bg-muted/60 p-2 font-mono text-[10px] text-ink">
                        {result.result_json}
                      </pre>
                    )}
                  </div>
                )}
                {error && <p className="text-xs text-[#D32F2F]">{error}</p>}
              </div>
            )}

            {/* Sub-tab 3: Guardrails */}
            {detailTab === "Guardrails" && (
              <div className="space-y-4 text-xs">
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-ink">
                    <ShieldCheck className="h-4 w-4 text-[#1E5E2E]" />
                    <span>Active Safety & Entitlement Guardrails</span>
                  </div>
                  <ul className="space-y-1.5 pl-6 list-disc text-ink-muted text-[11px]">
                    <li>Hard partition enforcement per line of business and plan year</li>
                    <li>Automatic PII/PHI redaction prior to telemetry logging</li>
                    <li>Mandatory verbatim citations before drug pricing or legal disclosure</li>
                    <li>Strict maker-checker block: agents cannot approve or publish knowledge</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Sub-tab 4: History / Call Log */}
            {detailTab === "History" && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ink">Recent Agent Calls</h3>
                  <Button size="sm" variant="ghost" onClick={refreshLog} className="h-7 text-[11px]">
                    <RefreshCw className="mr-1 h-3 w-3" /> Refresh
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {rows.slice(0, 10).map((r, i) => (
                    <div key={i} className="rounded border border-border p-2 space-y-1 bg-[#F9FAFB]">
                      <div className="flex justify-between font-mono text-[10px] text-ink-muted">
                        <span>{r.at}</span>
                        <span className="font-semibold text-ink">{r.iface}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="font-medium text-ink">{r.tool}</span>
                        <span className={`font-semibold ${OUTCOME_CLS[r.outcome.split(",")[0]?.trim() ?? ""] ?? "text-ink"}`}>
                          {r.outcome}
                        </span>
                      </div>
                    </div>
                  ))}
                  {rows.length === 0 && <p className="text-ink-muted italic">No recent calls recorded.</p>}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
