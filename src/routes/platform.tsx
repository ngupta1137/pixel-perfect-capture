import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Cpu,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Activity,
  Terminal,
  Code2,
  Network,
  Radio,
  Clock,
  Play,
  RotateCcw,
  Lock,
  ExternalLink,
  Check,
  Copy,
  Sparkles,
  Database,
  FileText,
  Boxes,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useDemoStore } from "@/services/demoStore";

export const Route = createFileRoute("/platform")({
  head: () => ({
    meta: [
      { title: "Platform Architecture — Verity" },
      { name: "description", content: "Who consumes Verity, the 13-step runtime pipeline, and what is built versus on the roadmap." },
      { property: "og:title", content: "Platform Architecture — Verity" },
      { property: "og:description", content: "Who consumes Verity, the 13-step runtime pipeline, and what is built versus on the roadmap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlatformPage,
});

interface StepDefinition {
  n: number;
  label: string;
  type: "deterministic" | "probabilistic";
  phase: "Ingress & Security" | "Intent & Retrieval" | "Deterministic Policy Gate" | "Synthesis & Audit";
  phaseIndex: number;
  latencyMs: number;
  desc: string;
  input: string;
  output: string;
  guarantee: string;
}

const RUNTIME_STEPS: StepDefinition[] = [
  {
    n: 1,
    label: "Receive request",
    type: "deterministic",
    phase: "Ingress & Security",
    phaseIndex: 1,
    latencyMs: 3,
    desc: "Ingests client request via REST API or MCP tool call with timestamp and caller correlation headers.",
    input: "POST /v1/query { query: 'how long does mail order take', context: { lob: 'MAPD', state: 'KY', planYear: '2026' } }",
    output: "Validated payload with cryptographic Request ID req-9081",
    guarantee: "Strict schema validation and rate-limiting enforcement.",
  },
  {
    n: 2,
    label: "Bind role from connection",
    type: "deterministic",
    phase: "Ingress & Security",
    phaseIndex: 1,
    latencyMs: 4,
    desc: "Resolves persona, channel scope, and authorized knowledge bases via cryptographic session token.",
    input: "Bearer token -> Persona 'Priya' (Role: Advocate, Tenant: Humana)",
    output: "Authorized Scope: ['kb-pharmacy', 'kb-shared'] (Denied: 'kb-underwriting', 'kb-internal')",
    guarantee: "No client can widen entitlement scope beyond centralized policy.",
  },
  {
    n: 3,
    label: "Redact PHI",
    type: "deterministic",
    phase: "Ingress & Security",
    phaseIndex: 1,
    latencyMs: 8,
    desc: "Scrubs HIPAA identifiers, member names, MRNs, and member card numbers prior to internal processing.",
    input: "Raw query text and caller context",
    output: "Tokenized sanitized string; zero sensitive PHI passed downstream",
    guarantee: "HIPAA Safe Harbor de-identification compliant.",
  },
  {
    n: 4,
    label: "Understand question",
    type: "probabilistic",
    phase: "Intent & Retrieval",
    phaseIndex: 2,
    latencyMs: 22,
    desc: "Extracts underlying member intent, temporal horizon, and medical/pharmacy domain concepts using lightweight embeddings.",
    input: "Sanitized query: 'how long does mail order take'",
    output: "Intent: Pharmacy.MailOrderDeliveryWindow; Concepts: ['CenterWell Pharmacy', 'Turnaround Time']",
    guarantee: "Deterministic fallback to literal keyword extraction if confidence is ambiguous.",
  },
  {
    n: 5,
    label: "Split parts",
    type: "probabilistic",
    phase: "Intent & Retrieval",
    phaseIndex: 2,
    latencyMs: 14,
    desc: "Decomposes composite multi-part questions into discrete, atomic factual sub-queries for isolated resolution.",
    input: "Single or compound query expression",
    output: "Sub-query array: ['SubQuery-1: Mail order delivery window']",
    guarantee: "Each sub-part independently resolved and cited against truth units.",
  },
  {
    n: 6,
    label: "Retrieve candidates",
    type: "deterministic",
    phase: "Intent & Retrieval",
    phaseIndex: 2,
    latencyMs: 18,
    desc: "Executes hybrid vector embeddings and BM25 full-text retrieval across candidate knowledge units.",
    input: "Decomposed intent terms + query vector embedding",
    output: "Found 3 candidate units: U-PH-005, U-PH-006, U-PH-007",
    guarantee: "Recall-optimized retrieval without applying trust decisions yet.",
  },
  {
    n: 7,
    label: "Entitlement filter",
    type: "deterministic",
    phase: "Deterministic Policy Gate",
    phaseIndex: 3,
    latencyMs: 5,
    desc: "Filters retrieved candidate units strictly to the caller's permitted knowledge bases. Excludes unentitled units silently.",
    input: "3 Candidate units vs Priya's permitted KBs (kb-pharmacy, kb-shared)",
    output: "Filtered candidates: 3 units retained (0 unentitled units leaked)",
    guarantee: "100% code-enforced RBAC. No LLM decision-making involved.",
  },
  {
    n: 8,
    label: "Applicability and dates",
    type: "deterministic",
    phase: "Deterministic Policy Gate",
    phaseIndex: 3,
    latencyMs: 6,
    desc: "Enforces plan-year partitioning (2026 vs 2027), state geographic scope, and Line of Business (MAPD vs PDP) rules.",
    input: "Candidates vs Target: { lob: 'MAPD', state: 'KY', planYear: '2026' }",
    output: "1 unit fully applicable: U-PH-006 (CenterWell Delivery Timelines 2026)",
    guarantee: "Prevents mixing plan years or serving out-of-state rules.",
  },
  {
    n: 9,
    label: "Conflict, stale, safety rules",
    type: "deterministic",
    phase: "Deterministic Policy Gate",
    phaseIndex: 3,
    latencyMs: 7,
    desc: "Detects contradictory active units, flags expired review dates, and declines unapproved claims before any model generation.",
    input: "Surviving candidate U-PH-006 (Status: approved, Review Date: 2027-01-01)",
    output: "Gate Passed: 0 active conflicts, unit is fresh, safety rules satisfied",
    guarantee: "Zero hallucinations: If stale or conflicting, system abstains or reports conflict deterministically.",
  },
  {
    n: 10,
    label: "Compose answer",
    type: "probabilistic",
    phase: "Synthesis & Audit",
    phaseIndex: 4,
    latencyMs: 28,
    desc: "Synthesizes final answer text strictly constrained to surviving, certified source units without external knowledge leakage.",
    input: "Approved unit U-PH-006 content only: 'Standard delivery takes 7 to 10 business days...'",
    output: "Grounded draft answer citing delivery window verbatim",
    guarantee: "Constrained decoding; answer contains zero facts outside retrieved unit.",
  },
  {
    n: 11,
    label: "Verbatim and citation check",
    type: "deterministic",
    phase: "Synthesis & Audit",
    phaseIndex: 4,
    latencyMs: 6,
    desc: "Verifies mandatory legal verbatim text exactness and validates that all citations exist, match, and carry valid signatures.",
    input: "Composed text vs Unit U-PH-006 verbatim requirement",
    output: "Citation Verified: U-PH-006 v1 (Approved by Owen, Knowledge Owner)",
    guarantee: "Legal disclaimer exactness verified via deterministic character-level diff.",
  },
  {
    n: 12,
    label: "Channel render",
    type: "deterministic",
    phase: "Synthesis & Audit",
    phaseIndex: 4,
    latencyMs: 4,
    desc: "Formats payload according to target channel requirements (compact UI outcome card, SSML voice script, or JSON API response).",
    input: "Channel: 'Agent Assist' (requires compact card with pill citations)",
    output: "Formatted response object with outcome badge, citation chip, and provenance",
    guarantee: "Uniform truth across channels with presentation tailored to client interface.",
  },
  {
    n: 13,
    label: "Log and audit",
    type: "deterministic",
    phase: "Synthesis & Audit",
    phaseIndex: 4,
    latencyMs: 5,
    desc: "Writes immutable audit event with trace ID, input hash, active unit version, and decision rationale for 6-year regulatory replay.",
    input: "Execution trace req-9081 + decision telemetry",
    output: "Audit record committed with SHA-256 integrity hash",
    guarantee: "CMS 6-year historical replayability guaranteed.",
  },
];

const SPOKES = [
  {
    id: "spoke-1",
    label: "Agent Assist",
    phase: "Phase 1: Production",
    phaseBadge: "Active Production",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    volume: "High Throughput",
    sla: "< 140ms",
    useCase: "Contact center advocates handling member calls during Annual Election Period (AEP).",
    governance: "Verbatim legal compliance & instant citation display.",
  },
  {
    id: "spoke-2",
    label: "Member Web & Mobile",
    phase: "Phase 1: Production",
    phaseBadge: "Active Production",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    volume: "High Concurrency",
    sla: "< 180ms",
    useCase: "Member-facing self-service chatbots and portal search experiences.",
    governance: "Plan-year strictly scoped; zero hallucination guarantee.",
  },
  {
    id: "spoke-3",
    label: "Prior Authorization",
    phase: "Phase 2: Expansion",
    phaseBadge: "In Flight",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    volume: "Critical Accuracy",
    sla: "< 250ms",
    useCase: "Clinical reviewers and automated intake agents evaluating medical necessity criteria.",
    governance: "Deterministic applicability gates against state & plan criteria.",
  },
  {
    id: "spoke-4",
    label: "Payment Integrity",
    phase: "Phase 2: Expansion",
    phaseBadge: "In Flight",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    volume: "Batch & Real-time",
    sla: "< 200ms",
    useCase: "Post-adjudication claims auditing and policy consistency validation.",
    governance: "Historical version replay matching the claim's date of service.",
  },
  {
    id: "spoke-5",
    label: "HEDIS Quality Measures",
    phase: "Phase 3: Scale",
    phaseBadge: "Enterprise Roadmap",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    volume: "Enterprise Scale",
    sla: "< 350ms",
    useCase: "Quality measurement reporting and regulatory documentation validation.",
    governance: "NCQA specification compliance with maker-checker approval chains.",
  },
  {
    id: "spoke-6",
    label: "Risk Adjustment & Clinical",
    phase: "Phase 3: Scale",
    phaseBadge: "Enterprise Roadmap",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    volume: "High Concurrency",
    sla: "< 300ms",
    useCase: "Clinical outreach and proactive gap-in-care guidance for care managers.",
    governance: "Strict entitlement scoping between clinical and administrative records.",
  },
];

const BUILT_CAPABILITIES = [
  { name: "13-Step Serving Engine", desc: "Full deterministic-before-generative runtime kernel.", status: "Certified" },
  { name: "REST API v1", desc: "OpenAPI compliant query, search, and audit telemetry endpoints.", status: "Certified" },
  { name: "Model Context Protocol (MCP)", desc: "Standardized tools for Claude, OpenAI, and agentic workflows.", status: "Certified" },
  { name: "Role-Based Persona RBAC", desc: "Centralized policy driving permissions, scoping, and UI views.", status: "Certified" },
  { name: "Knowledge Drift Detection", desc: "Automated flagging for stale dates, conflicts, and gap tickets.", status: "Certified" },
  { name: "Golden Benchmark Evals (S11)", desc: "100-scenario regression evaluation gate with automated scoring.", status: "Certified" },
];

const ROADMAP_CAPABILITIES = [
  { name: "Write-Once WORM Audit Storage", desc: "Hardware-enforced tamper-proof audit trails for legal discovery.", phase: "H1 2027" },
  { name: "Multi-Region Active-Active Availability", desc: "Zero-downtime geo-replicated truth cache with cross-region sync.", phase: "H1 2027" },
  { name: "Edge PHI Tokenization Hardware", desc: "Zero-trust enclave for tokenizing HIPAA records at gateway boundary.", phase: "H2 2027" },
  { name: "Token Exchange for Agent Feedback", desc: "Automated RLHF telemetry loop based on resolved contact center calls.", phase: "H2 2027" },
  { name: "Separate Admin Control Plane Listener", desc: "Network-isolated administrative listener for governance updates.", phase: "H2 2027" },
  { name: "Emergency Publication Fast-Track Exception", desc: "Break-glass protocol for real-time critical health warnings.", phase: "H2 2027" },
];

function SubscriberChangePanel() {
  const publishSignals = useDemoStore((s) => s.publishSignals) || [];

  const displaySignals =
    publishSignals.length > 0
      ? publishSignals
      : [
          {
            unit_id: "U-PH-003",
            version: 1,
            from_version: 0,
            title: "Pricing disclaimer (Rx)",
            at: "2026-01-15T09:00:00Z",
            by: "Rita (Legal)",
            channels: ["Agent Assist", "Member Chat", "IVR Voice Bot", "Advocate Portal"],
          },
        ];

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-600 animate-pulse" />
            <h3 className="font-semibold text-lg text-ink">Real-time Change Propagation & Invalidation Mesh</h3>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            When Legal or Knowledge Owners publish an approved unit, cache invalidation signals notify all subscriber channels in real-time.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold self-start sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          Active Invalidation Stream
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {["Agent Assist", "Member Chat", "IVR Voice Bot", "Advocate Portal"].map((ch) => (
          <div key={ch} className="rounded-lg border border-border bg-surface-alt/60 p-3.5 space-y-1.5 transition-all hover:border-ink/20">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-ink">{ch}</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[11px] text-ink-muted">Direct subscriber • Response cache auto-invalidated</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-surface-alt text-ink-muted font-medium border-b border-border">
            <tr>
              <th className="p-3">Timestamp</th>
              <th className="p-3">Unit ID & Version</th>
              <th className="p-3">Title</th>
              <th className="p-3">Approver</th>
              <th className="p-3">Notified Channels</th>
              <th className="p-3">Cache State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono text-[11px]">
            {displaySignals.map((sig, idx) => (
              <tr key={idx} className="hover:bg-surface-alt/40 transition-colors">
                <td className="p-3 text-ink-muted font-sans">{new Date(sig.at).toLocaleTimeString()}</td>
                <td className="p-3 font-bold text-ink">
                  {sig.unit_id} (v{sig.from_version ?? 0} → v{sig.version})
                </td>
                <td className="p-3 font-sans font-medium text-ink">{sig.title}</td>
                <td className="p-3 font-sans text-ink-muted">{sig.by}</td>
                <td className="p-3 font-sans text-emerald-800 font-medium">{sig.channels.join(", ")}</td>
                <td className="p-3 font-sans text-emerald-700 font-semibold flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" /> Invalidated & Refreshed
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlatformPage() {
  const [activeStep, setActiveStep] = useState<number>(8); // Default highlight on step 8
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulatedStep, setSimulatedStep] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const selectedStepData = RUNTIME_STEPS.find((s) => s.n === (simulatedStep ?? activeStep)) || RUNTIME_STEPS[7]!;

  const handleCopy = (key: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSimulateTrace = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulatedStep(1);

    let current = 1;
    const interval = setInterval(() => {
      current += 1;
      if (current > 13) {
        clearInterval(interval);
        setIsSimulating(false);
        setSimulatedStep(null);
      } else {
        setSimulatedStep(current);
      }
    }, 120);
  };

  const currentDisplayStep = simulatedStep ?? activeStep;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Cpu className="h-3.5 w-3.5" /> Platform Architecture
            </span>
            <span className="rounded bg-surface-alt px-2.5 py-0.5 text-xs font-medium text-ink-muted border border-border">
              Enterprise Runtime
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Single Governed Kernel, Multi-Product Runtime
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted max-w-3xl">
            Verity enforces a 13-stage deterministic governance pipeline before any generation occurs. Downstream products
            consume approved truth through identical REST, MCP, and event contracts.
          </p>
        </div>

        {/* Quick Simulation Trigger */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleSimulateTrace}
            disabled={isSimulating}
            className="gap-2 font-semibold shadow-sm"
          >
            {isSimulating ? (
              <>
                <RotateCcw className="h-4 w-4 animate-spin" />
                <span>Tracing Step {simulatedStep}/13...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Simulate 13-Step Trace</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* KPI / Guarantees Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs font-semibold text-ink-muted">Deterministic Policy Gate</p>
          <p className="mt-1 text-xl font-bold text-ink">Steps 7 to 9</p>
          <p className="mt-0.5 text-[11px] text-emerald-700 font-medium">100% Code-Enforced (No Hallucinations)</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs font-semibold text-ink-muted">End-to-End Latency</p>
          <p className="mt-1 text-xl font-bold text-ink">&lt; 140ms</p>
          <p className="mt-0.5 text-[11px] text-ink-muted font-medium">P95 serving response time</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs font-semibold text-ink-muted">Supported Protocols</p>
          <p className="mt-1 text-xl font-bold text-ink">REST · MCP · SSE</p>
          <p className="mt-0.5 text-[11px] text-ink-muted font-medium">Unified downstream contracts</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs font-semibold text-ink-muted">Audit Provenance</p>
          <p className="mt-1 text-xl font-bold text-ink">6-Year Replay</p>
          <p className="mt-0.5 text-[11px] text-ink-muted font-medium">SHA-256 cryptographic audit logs</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="pipeline" className="space-y-6">
        <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 gap-6">
          <TabsTrigger value="pipeline" className="gap-2 pb-3 pt-2 text-sm">
            <Layers className="h-4 w-4" /> 13-Step Serving Pipeline
          </TabsTrigger>
          <TabsTrigger value="ecosystem" className="gap-2 pb-3 pt-2 text-sm">
            <Network className="h-4 w-4" /> Consumer Ecosystem (Spokes)
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-2 pb-3 pt-2 text-sm">
            <Code2 className="h-4 w-4" /> OpenAPI & MCP Contracts
          </TabsTrigger>
          <TabsTrigger value="mesh" className="gap-2 pb-3 pt-2 text-sm">
            <Activity className="h-4 w-4" /> Change Propagation & Maturity
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: 13-STEP PIPELINE INSPECTOR */}
        <TabsContent value="pipeline" className="space-y-6">
          {/* Phase Overview & Steps Grid */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-border/70 pb-4">
              <div>
                <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                  <span>Interactive Runtime Serving Pipeline</span>
                  <Badge variant="outline" className="text-xs font-mono font-medium">
                    13 Sequential Stages
                  </Badge>
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Click any step below to inspect inputs, outputs, execution type, and safety guarantees.
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Deterministic Code [D]</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span>Model-Assisted [P]</span>
                </span>
              </div>
            </div>

            {/* Stepper Cards Grouped into 4 Phases */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Phase 1 */}
              <div className="space-y-2 rounded-lg bg-surface-alt/50 p-3 border border-border/80">
                <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
                  <span>Phase 1: Ingress</span>
                  <span>Steps 1–3</span>
                </div>
                <div className="space-y-2">
                  {RUNTIME_STEPS.slice(0, 3).map((s) => {
                    const isSelected = currentDisplayStep === s.n;
                    return (
                      <button
                        key={s.n}
                        type="button"
                        onClick={() => setActiveStep(s.n)}
                        className={`w-full text-left p-2.5 rounded-md border text-xs font-medium transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                            : "border-border bg-background hover:border-ink/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">#{s.n} {s.label}</span>
                          <span className="text-[10px] font-mono px-1 rounded bg-surface border text-ink-muted">
                            [D]
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phase 2 */}
              <div className="space-y-2 rounded-lg bg-surface-alt/50 p-3 border border-border/80">
                <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
                  <span>Phase 2: Intent & Retrieval</span>
                  <span>Steps 4–6</span>
                </div>
                <div className="space-y-2">
                  {RUNTIME_STEPS.slice(3, 6).map((s) => {
                    const isSelected = currentDisplayStep === s.n;
                    return (
                      <button
                        key={s.n}
                        type="button"
                        onClick={() => setActiveStep(s.n)}
                        className={`w-full text-left p-2.5 rounded-md border text-xs font-medium transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                            : "border-border bg-background hover:border-ink/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">#{s.n} {s.label}</span>
                          <span className={`text-[10px] font-mono px-1 rounded bg-surface border ${s.type === 'probabilistic' ? 'text-amber-700 font-bold' : 'text-ink-muted'}`}>
                            {s.type === "probabilistic" ? "[P]" : "[D]"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phase 3 - THE DETERMINISTIC POLICY GATE */}
              <div className="space-y-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 p-3 border-2 border-emerald-500/50 relative shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Policy Gate
                  </span>
                  <span>Steps 7–9</span>
                </div>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium leading-tight">
                  Deterministic check before any generation
                </p>
                <div className="space-y-2">
                  {RUNTIME_STEPS.slice(6, 9).map((s) => {
                    const isSelected = currentDisplayStep === s.n;
                    return (
                      <button
                        key={s.n}
                        type="button"
                        onClick={() => setActiveStep(s.n)}
                        className={`w-full text-left p-2.5 rounded-md border text-xs font-medium transition-all ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 shadow-sm ring-1 ring-emerald-600"
                            : "border-emerald-200/80 dark:border-emerald-800/80 bg-background hover:border-emerald-500"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">#{s.n} {s.label}</span>
                          <span className="text-[10px] font-mono px-1 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                            [D]
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phase 4 */}
              <div className="space-y-2 rounded-lg bg-surface-alt/50 p-3 border border-border/80">
                <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
                  <span>Phase 4: Synthesis & Audit</span>
                  <span>Steps 10–13</span>
                </div>
                <div className="space-y-2">
                  {RUNTIME_STEPS.slice(9, 13).map((s) => {
                    const isSelected = currentDisplayStep === s.n;
                    return (
                      <button
                        key={s.n}
                        type="button"
                        onClick={() => setActiveStep(s.n)}
                        className={`w-full text-left p-2 rounded-md border text-xs font-medium transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                            : "border-border bg-background hover:border-ink/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">#{s.n} {s.label}</span>
                          <span className={`text-[10px] font-mono px-1 rounded bg-surface border ${s.type === 'probabilistic' ? 'text-amber-700 font-bold' : 'text-ink-muted'}`}>
                            {s.type === "probabilistic" ? "[P]" : "[D]"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Selected Step Deep Dive Inspector */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary/10 pb-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                    {selectedStepData.n}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-ink">
                      Stage {selectedStepData.n}: {selectedStepData.label}
                    </h3>
                    <p className="text-xs text-ink-muted">
                      Part of <strong className="text-ink">{selectedStepData.phase}</strong> · Target execution time:{" "}
                      <strong className="text-ink">{selectedStepData.latencyMs}ms</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={selectedStepData.type === "deterministic" ? "default" : "secondary"}
                    className="font-mono text-xs"
                  >
                    {selectedStepData.type === "deterministic" ? "Deterministic Code [D]" : "Model-Assisted [P]"}
                  </Badge>
                </div>
              </div>

              <p className="text-sm text-ink leading-relaxed font-medium">
                {selectedStepData.desc}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="rounded-lg border border-border bg-surface p-3.5 space-y-1.5">
                  <span className="font-sans font-bold text-ink-muted uppercase tracking-wider text-[10px]">
                    Runtime Input / Condition
                  </span>
                  <p className="text-ink text-xs whitespace-pre-wrap">{selectedStepData.input}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3.5 space-y-1.5">
                  <span className="font-sans font-bold text-ink-muted uppercase tracking-wider text-[10px]">
                    Governed Transformation / Output
                  </span>
                  <p className="text-ink text-xs whitespace-pre-wrap">{selectedStepData.output}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-surface border border-border px-3.5 py-2.5 text-xs text-ink font-medium">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>
                  <strong>Governance Guarantee:</strong> {selectedStepData.guarantee}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: CONSUMER ECOSYSTEM (SPOKES) */}
        <TabsContent value="ecosystem" className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
              <div>
                <h2 className="text-lg font-bold text-ink">Who Consumes Verity (Enterprise Topology)</h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Verity serves as the authoritative truth kernel across clinical, member-facing, and operational channels.
                </p>
              </div>
              <div className="rounded-lg bg-surface-alt border border-border px-3 py-1.5 text-xs text-ink-muted font-medium italic">
                “Verity decides what is true and applicable. Each product decides what to do with it.”
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SPOKES.map((spoke) => (
                <div
                  key={spoke.id}
                  className="rounded-xl border border-border bg-background p-5 space-y-3.5 shadow-sm transition-all hover:border-ink/20 hover:shadow"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-ink">{spoke.label}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${spoke.badgeClass}`}>
                      {spoke.phaseBadge}
                    </span>
                  </div>

                  <p className="text-xs text-ink-muted leading-relaxed min-h-[38px]">{spoke.useCase}</p>

                  <div className="border-t border-border/80 pt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-muted">Throughput & SLA:</span>
                      <span className="font-mono font-semibold text-ink">
                        {spoke.volume} · {spoke.sla}
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5 text-[11px] text-ink">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{spoke.governance}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Central Architecture Anchor Banner */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
                  <Network className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-ink">Centralized Truth, Decentralized Action</h4>
                  <p className="text-xs text-ink-muted">
                    No downstream product implements its own knowledge base or policy rules. Any policy update made by
                    Knowledge Owners or Legal instantly harmonizes across all spokes.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 font-mono text-xs font-semibold">
                6 Active Spokes Connected
              </Badge>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: INTEGRATION CONTRACTS (OPENAPI & MCP) */}
        <TabsContent value="contracts" className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
              <div>
                <h2 className="text-lg font-bold text-ink">OpenAPI & Model Context Protocol (MCP) Standards</h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Identical governance contracts whether accessed by traditional microservices or generative agentic frameworks.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-primary">v1.2.0 Specification</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* REST API Contract */}
              <div className="rounded-lg border border-border bg-background p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-bold">
                      POST
                    </span>
                    <span className="font-mono text-xs font-semibold text-ink">/api/v1/query</span>
                  </div>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() =>
                      handleCopy(
                        "rest",
                        `curl -X POST "https://api.verity.internal/v1/query" \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"query":"how long does mail order take","context":{"lob":"MAPD","state":"KY","planYear":"2026"}}'`
                      )
                    }
                  >
                    {copiedCode === "rest" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>

                <p className="text-xs text-ink-muted">
                  Deterministic endpoint returning grounded answer text, citing unit ID, version number, and approval owner.
                </p>

                <div className="rounded bg-surface-alt p-3 font-mono text-[11px] text-ink overflow-x-auto space-y-1">
                  <p className="text-ink-muted font-bold">// Response Payload (200 OK)</p>
                  <pre className="text-ink leading-relaxed">
{`{
  "outcome": "approved",
  "answer": "Standard delivery takes 7 to 10 business days.",
  "citations": [
    {
      "unit_id": "U-PH-006",
      "version": 1,
      "title": "CenterWell Pharmacy delivery window",
      "approved_by": "Owen (Knowledge Owner)",
      "legal_exact": true
    }
  ],
  "trace_id": "trc_9081a_2026",
  "latency_ms": 118
}`}
                  </pre>
                </div>
              </div>

              {/* MCP Tool Schema */}
              <div className="rounded-lg border border-border bg-background p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 font-mono text-xs font-bold">
                      MCP TOOL
                    </span>
                    <span className="font-mono text-xs font-semibold text-ink">verity_query</span>
                  </div>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() =>
                      handleCopy(
                        "mcp",
                        `{
  "name": "verity_query",
  "description": "Query Verity governed truth with automatic policy, citation, and applicability enforcement.",
  "parameters": {
    "type": "object",
    "properties": {
      "question": { "type": "string" },
      "plan_year": { "type": "string", "enum": ["2026", "2027"] },
      "lob": { "type": "string" },
      "state": { "type": "string" }
    },
    "required": ["question", "plan_year"]
  }
}`
                      )
                    }
                  >
                    {copiedCode === "mcp" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>

                <p className="text-xs text-ink-muted">
                  Model Context Protocol tool definition allowing AI agents (Claude Desktop, OpenAI, AutoGen) to safely reference enterprise truth.
                </p>

                <div className="rounded bg-surface-alt p-3 font-mono text-[11px] text-ink overflow-x-auto space-y-1">
                  <p className="text-ink-muted font-bold">// MCP Tool Definition</p>
                  <pre className="text-ink leading-relaxed">
{`{
  "name": "verity_query",
  "description": "Authoritative enterprise knowledge retrieval.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "question": { "type": "string" },
      "plan_year": { "type": "string", "enum": ["2026", "2027"] },
      "state": { "type": "string", "description": "2-letter state code" }
    },
    "required": ["question", "plan_year"]
  }
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: EVENT MESH & PLATFORM MATURITY */}
        <TabsContent value="mesh" className="space-y-6">
          {/* Live Invalidation Table */}
          <SubscriberChangePanel />

          {/* Built vs Roadmap Enterprise Capability Matrix */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
              <div>
                <h3 className="text-lg font-bold text-ink">Platform Capabilities: Certified vs Enterprise Roadmap</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Enterprise readiness matrix showing production-certified components and future-state infrastructure.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Built & Certified */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                    ✓
                  </span>
                  <h4 className="font-bold text-sm text-ink">Built & Certified in Production</h4>
                </div>
                <div className="space-y-2.5">
                  {BUILT_CAPABILITIES.map((cap) => (
                    <div
                      key={cap.name}
                      className="rounded-lg border border-border bg-surface-alt/40 p-3 flex items-start justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold text-xs text-ink">{cap.name}</p>
                        <p className="text-[11px] text-ink-muted mt-0.5">{cap.desc}</p>
                      </div>
                      <Badge className="bg-emerald-600 text-[10px] shrink-0 font-medium">{cap.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Roadmap */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                    →
                  </span>
                  <h4 className="font-bold text-sm text-ink">Enterprise Scale Roadmap</h4>
                </div>
                <div className="space-y-2.5">
                  {ROADMAP_CAPABILITIES.map((cap) => (
                    <div
                      key={cap.name}
                      className="rounded-lg border border-dashed border-border bg-background p-3 flex items-start justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold text-xs text-ink">{cap.name}</p>
                        <p className="text-[11px] text-ink-muted mt-0.5">{cap.desc}</p>
                      </div>
                      <Badge variant="outline" className="text-ink-muted text-[10px] shrink-0 font-mono">
                        {cap.phase}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
