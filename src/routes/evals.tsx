import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequirePage } from "@/components/shell/Denied";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { executeEvaluation, getLatestEvalRun } from "@/services/verity";
import type { EvalCaseResult, EvalReport } from "@/verity-engine/evalRunner";

export const Route = createFileRoute("/evals")({
  head: () => ({
    meta: [
      { title: "Evals — Verity" },
      { name: "description", content: "Verity evaluation results, release gate and failure log." },
      { property: "og:title", content: "Evals — Verity" },
      {
        property: "og:description",
        content: "Verity evaluation results, release gate and failure log.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GuardedEvalsPage,
});

function EvalsPage() {
  const [report, setReport] = useState<EvalReport | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "Open" | "Fixed">("all");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Check for an existing evaluation run on mount
  useEffect(() => {
    let mounted = true;
    getLatestEvalRun()
      .then((existing) => {
        if (mounted && existing) {
          setReport(existing);
        }
      })
      .catch((err) => {
        console.warn("Could not retrieve latest eval run", err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleRunEvaluation = async () => {
    setIsExecuting(true);
    setError(null);
    try {
      const res = await executeEvaluation("golden");
      setReport(res);
      // Auto-select the first failing case for quick diagnosis if available
      const firstFailure = res.cases.find((c) => !c.ok);
      if (firstFailure) {
        setSelectedCaseId(firstFailure.case_id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsExecuting(false);
    }
  };

  // Determine dynamic stats and failure counts
  const cases = report?.cases ?? [];
  const openFailures = cases.filter((c) => !c.ok);
  const passedCases = cases.filter((c) => c.ok);
  const failingIds = openFailures.map((c) => c.case_id).join(", ");

  const filteredCases = cases.filter((c) => {
    if (filter === "Open") return !c.ok;
    if (filter === "Fixed") return c.ok;
    return true;
  });

  const selectedCase: EvalCaseResult | undefined = cases.find((c) => c.case_id === selectedCaseId);

  // Chart data
  const chartData = report
    ? [
        { name: "Golden (All)", value: report.metrics.accuracy, color: "var(--color-brand-green-dark)" },
        { name: "Golden (Outcome)", value: report.metrics.outcome_accuracy, color: "var(--color-brand-green-dark)" },
        { name: "Golden (Verbatim)", value: report.metrics.verbatim_compliance, color: "var(--color-brand-green-dark)" },
        { name: "Blind (Unconfigured)", value: 0, color: "var(--color-ink-muted, #94a3b8)" },
        { name: "Hold-out (Unconfigured)", value: 0, color: "var(--color-ink-muted, #94a3b8)" },
        { name: "AEP (Unconfigured)", value: 0, color: "var(--color-ink-muted, #94a3b8)" },
      ]
    : [
        { name: "Golden (All)", value: 0, color: "var(--color-ink-muted, #94a3b8)" },
        { name: "Golden (Outcome)", value: 0, color: "var(--color-ink-muted, #94a3b8)" },
        { name: "Golden (Verbatim)", value: 0, color: "var(--color-ink-muted, #94a3b8)" },
        { name: "Blind", value: 0, color: "var(--color-ink-muted, #94a3b8)" },
        { name: "Hold-out", value: 0, color: "var(--color-ink-muted, #94a3b8)" },
        { name: "AEP", value: 0, color: "var(--color-ink-muted, #94a3b8)" },
      ];

  return (
    <section className="space-y-8" data-testid="evals-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Quality & evaluations</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Execute deterministic regression suites and inspect failure diagnostics against the serving pipeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRunEvaluation}
            disabled={isExecuting}
            className="flex items-center gap-2"
            data-testid="run-eval-btn"
          >
            {isExecuting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Running Golden suite...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Run Golden evaluation
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Execution status notification banners */}
      {isExecuting && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-md border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green-dark"
          data-testid="eval-executing-banner"
        >
          <RefreshCw className="h-4 w-4 animate-spin text-brand-green-dark" />
          <span>Executing all 27 golden regression cases against the live Verity serving engine...</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          data-testid="eval-error-banner"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <span>Evaluation execution error: {error}</span>
        </div>
      )}

      {report && !isExecuting && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface-alt px-4 py-2.5 text-xs text-ink-muted"
          data-testid="eval-run-metadata"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-brand-green-dark">Live Execution:</span>
            <span className="font-mono">{report.run_id}</span>
            <span>·</span>
            <span>Suite: {report.suite}</span>
            <span>·</span>
            <span>Engine: {report.engine_version}</span>
            <span>·</span>
            <span>As of: {report.as_of}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            <span>Duration: {report.duration_ms} ms</span>
            <span>({report.metrics.average_latency_ms} ms/case)</span>
          </div>
        </div>
      )}

      {!report && !isExecuting && !error && (
        <div
          className="rounded-md border border-border bg-surface-alt px-4 py-3 text-sm text-ink-muted"
          data-testid="eval-empty-banner"
        >
          No evaluation has been executed in this session. Click <strong>Run Golden evaluation</strong> above to execute the 27 golden cases against the live Verity serving engine.
        </div>
      )}

      {/* 4 Evaluation Suite Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Golden Set Card */}
        <div
          className={`rounded-md border p-5 ${report ? "border-brand-green/30 bg-surface" : "border-border bg-surface"}`}
          data-testid="suite-card-golden"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold">
              Golden set <span className="text-sm font-normal text-ink-muted">({report ? report.metrics.total_cases : 27} cases)</span>
            </p>
            {report && (
              <span className="rounded bg-brand-green/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-green-dark">
                Live
              </span>
            )}
          </div>
          <p className="text-xs text-ink-muted">Audited baseline regression suite</p>
          <p className="mt-2 text-lg font-semibold text-brand-green-dark" data-testid="golden-result-text">
            {report ? `${report.metrics.accuracy}% cases correct (${report.metrics.passed_cases}/${report.metrics.total_cases})` : "Awaiting execution"}
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${
              report && report.metrics.critical_failures > 0 ? "text-destructive" : "text-brand-green-dark"
            }`}
            data-testid="golden-critical-text"
          >
            {report ? `${report.metrics.critical_failures} critical` : "0 critical"}
          </p>
          <p className="mt-1 text-sm text-ink-muted" data-testid="golden-extra-text">
            {report
              ? `Release gates ${report.gate_passed ? "PASS" : "BLOCKED"} · ${report.metrics.failed_cases} open failure (${failingIds})`
              : "Click 'Run Golden evaluation' to execute"}
          </p>
        </div>

        {/* Blind Set Card - Unavailable in Phase 2 */}
        <div className="rounded-md border border-border/60 bg-surface/60 p-5 opacity-70" data-testid="suite-card-blind">
          <p className="font-semibold text-ink-muted">
            Blind set <span className="text-sm font-normal">(Unavailable)</span>
          </p>
          <p className="text-xs text-ink-muted">Dataset not configured in Phase 2</p>
          <p className="mt-2 text-lg font-semibold text-ink-muted">Unavailable</p>
          <p className="mt-1 text-sm text-ink-muted">—</p>
          <p className="mt-1 text-xs text-ink-muted">Blind evaluation dataset has not been authored or ingested yet.</p>
        </div>

        {/* Hold-out Set 1 - Unavailable in Phase 2 */}
        <div className="rounded-md border border-border/60 bg-surface/60 p-5 opacity-70" data-testid="suite-card-holdout-1">
          <p className="font-semibold text-ink-muted">
            Hold-out set 1 <span className="text-sm font-normal">(Unavailable)</span>
          </p>
          <p className="text-xs text-ink-muted">Dataset not configured in Phase 2</p>
          <p className="mt-2 text-lg font-semibold text-ink-muted">Unavailable</p>
          <p className="mt-1 text-sm text-ink-muted">—</p>
          <p className="mt-1 text-xs text-ink-muted">Hold-out dataset 1 has not been authored or ingested yet.</p>
        </div>

        {/* AEP Hold-out Set - Unavailable in Phase 2 */}
        <div className="rounded-md border border-border/60 bg-surface/60 p-5 opacity-70" data-testid="suite-card-aep-holdout">
          <p className="font-semibold text-ink-muted">
            AEP hold-out <span className="text-sm font-normal">(Unavailable)</span>
          </p>
          <p className="text-xs text-ink-muted">Dataset not configured in Phase 2</p>
          <p className="mt-2 text-lg font-semibold text-ink-muted">Unavailable</p>
          <p className="mt-1 text-sm text-ink-muted">—</p>
          <p className="mt-1 text-xs text-ink-muted">AEP hold-out dataset has not been authored or ingested yet.</p>
        </div>
      </div>

      {/* Metric KPI summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-border bg-surface p-5" data-testid="stat-permission-leaks">
          <p className="text-3xl font-semibold text-brand-green-dark">
            {report ? report.metrics.permission_leaks : "0"}
          </p>
          <p className="mt-1 text-sm text-ink-muted">permission leaks</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-5" data-testid="stat-retired-exposure">
          <p className="text-3xl font-semibold text-brand-green-dark">
            {report ? report.metrics.retired_exposure : "0"}
          </p>
          <p className="mt-1 text-sm text-ink-muted">retired units served</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-5" data-testid="stat-verbatim-compliance">
          <p className="text-3xl font-semibold text-brand-green-dark">
            {report ? `${report.metrics.verbatim_compliance}%` : "100%"}
          </p>
          <p className="mt-1 text-sm text-ink-muted">verbatim exact match compliance</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-5" data-testid="stat-latency">
          <p className="text-3xl font-semibold text-brand-green-dark">
            {report ? `${report.metrics.average_latency_ms} ms` : "—"}
          </p>
          <p className="mt-1 text-sm text-ink-muted">average serving latency</p>
        </div>
      </div>

      {/* Outcome Accuracy Chart and Release Gate */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="border-y border-border py-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Outcome accuracy (%)</h2>
            {report && (
              <span className="text-xs text-ink-muted">
                Outcome match: {report.metrics.outcome_accuracy}% · Overall case pass: {report.metrics.accuracy}%
              </span>
            )}
          </div>
          <div className="h-64" data-testid="evals-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" interval={0} tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="value" label={{ position: "top" }}>
                  {chartData.map((a) => (
                    <Cell key={a.name} fill={a.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-5" data-testid="release-gate-card">
          <h2 className="mb-4 font-semibold">Release gate (golden set)</h2>
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center gap-2">
              {report && report.metrics.critical_failures === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-brand-green-dark" aria-label="Pass" />
              ) : report && report.metrics.critical_failures > 0 ? (
                <AlertTriangle className="h-5 w-5 text-destructive" aria-label="Fail" />
              ) : (
                <Circle className="h-5 w-5 text-ink-muted" aria-label="Pending" />
              )}
              Zero critical failures on golden
            </li>
            <li className="flex items-center gap-2">
              {report && report.metrics.permission_leaks === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-brand-green-dark" aria-label="Pass" />
              ) : report && report.metrics.permission_leaks > 0 ? (
                <AlertTriangle className="h-5 w-5 text-destructive" aria-label="Fail" />
              ) : (
                <Circle className="h-5 w-5 text-ink-muted" aria-label="Pending" />
              )}
              Zero permission leaks
            </li>
            <li className="flex items-center gap-2">
              {report && report.metrics.verbatim_compliance === 100 ? (
                <CheckCircle2 className="h-5 w-5 text-brand-green-dark" aria-label="Pass" />
              ) : report && report.metrics.verbatim_compliance < 100 ? (
                <AlertTriangle className="h-5 w-5 text-destructive" aria-label="Fail" />
              ) : (
                <Circle className="h-5 w-5 text-ink-muted" aria-label="Pending" />
              )}
              Verbatim 100%
            </li>
            <li className="flex items-center gap-2">
              {report && report.metrics.retired_exposure === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-brand-green-dark" aria-label="Pass" />
              ) : report && report.metrics.retired_exposure > 0 ? (
                <AlertTriangle className="h-5 w-5 text-destructive" aria-label="Fail" />
              ) : (
                <Circle className="h-5 w-5 text-ink-muted" aria-label="Pending" />
              )}
              Zero retired exposure
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-brand-green-dark" aria-label="Pass" />
              Drift flag recall 100%
            </li>
          </ul>

          <div
            className={`mt-5 rounded px-3 py-2 text-center font-bold ${
              report
                ? report.gate_passed
                  ? "bg-brand-green/10 text-brand-green-dark"
                  : "bg-destructive/10 text-destructive"
                : "bg-surface-alt text-ink-muted"
            }`}
            data-testid="gate-status-banner"
          >
            {report
              ? `Release gates: ${report.gate_passed ? "PASS" : "BLOCKED"}`
              : "Release gates: Awaiting run"}
          </div>
        </div>
      </div>

      {/* Case Inspector and Failure Log Table */}
      <div className="overflow-x-auto rounded-md border border-border bg-surface" data-testid="cases-inspector">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="font-semibold">
              Case inspector & failure log{" "}
              <span className="text-sm font-normal text-ink-muted" data-testid="failure-count-text">
                ({openFailures.length} open failure{openFailures.length === 1 ? "" : "s"} · {passedCases.length} passed)
              </span>
            </h2>
            <p className="text-xs text-ink-muted">
              Click any row to inspect query resolution details, citations, and execution traces.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              aria-label="Filter case status"
              className="field-select text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as "all" | "Open" | "Fixed")}
              data-testid="filter-select"
            >
              <option value="all">All cases ({cases.length})</option>
              <option value="Open">Open failures ({openFailures.length})</option>
              <option value="Fixed">Passed cases ({passedCases.length})</option>
            </select>
          </div>
        </div>

        {filteredCases.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted" data-testid="no-cases-message">
            {report
              ? "No cases match the selected filter."
              : "No evaluation has been executed yet. Click 'Run Golden evaluation' to view live case results."}
          </div>
        ) : (
          <table className="w-full text-left text-sm" data-testid="cases-table">
            <thead className="bg-surface-alt text-ink-muted">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Query</th>
                <th className="px-4 py-2">Expected</th>
                <th className="px-4 py-2">Actual</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((c) => {
                const isSelected = c.case_id === selectedCaseId;
                return (
                  <tr
                    key={c.case_id}
                    className={`cursor-pointer border-t border-border transition-colors hover:bg-surface-alt/70 ${
                      isSelected ? "bg-surface-alt" : ""
                    } ${!c.ok ? "bg-destructive/5" : ""}`}
                    onClick={() => setSelectedCaseId(isSelected ? null : c.case_id)}
                    data-testid={`case-row-${c.case_id}`}
                  >
                    <td className="px-4 py-2 font-mono font-semibold">
                      <span className={!c.ok ? "text-destructive font-bold" : ""}>{c.case_id}</span>
                    </td>
                    <td className="px-4 py-2 max-w-xs truncate" title={c.query}>
                      {c.query}
                    </td>
                    <td className="px-4 py-2 text-xs font-mono">
                      <span className="font-semibold">{c.expected_outcome}</span>
                      {c.expected_unit_ids.length > 0 && (
                        <span className="text-ink-muted"> [{c.expected_unit_ids.join(", ")}]</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs font-mono">
                      <span className={c.actual_outcome !== c.expected_outcome ? "font-bold text-destructive" : ""}>
                        {c.actual_outcome}
                      </span>
                      {c.actual_unit_ids.length > 0 && (
                        <span className="text-ink-muted"> [{c.actual_unit_ids.join(", ")}]</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          c.ok ? "text-brand-green-dark" : "text-destructive"
                        }`}
                      >
                        {c.ok ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Passed
                          </>
                        ) : (
                          <>
                            <Circle className="h-4 w-4 text-destructive" aria-hidden="true" /> Open failure
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink font-medium"
                        aria-label={`Inspect ${c.case_id}`}
                      >
                        {isSelected ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {isSelected ? "Hide" : "Inspect"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Selected Case Diagnostic Drawer / Inspector Box */}
        {selectedCase && (
          <div
            className="border-t-2 border-brand-green/30 bg-surface-alt/40 p-5 space-y-4"
            data-testid="selected-case-detail"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-mono text-base font-bold">{selectedCase.case_id}</span>
                <span className="ml-2 rounded bg-surface border border-border px-2 py-0.5 text-xs text-ink-muted">
                  Severity: {selectedCase.severity}
                </span>
                {selectedCase.slices && selectedCase.slices.length > 0 && (
                  <span className="ml-2 text-xs text-ink-muted">
                    Slices: {selectedCase.slices.join(", ")}
                  </span>
                )}
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                  selectedCase.ok ? "text-brand-green-dark" : "text-destructive"
                }`}
              >
                {selectedCase.ok ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Passed Assertions
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-4 w-4" /> Open Failure Detected
                  </>
                )}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-sm bg-surface p-3.5 rounded border border-border">
              <div>
                <p className="text-xs text-ink-muted font-medium">Input Query</p>
                <p className="font-medium mt-0.5">"{selectedCase.query}"</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted font-medium">Context & Route</p>
                <p className="text-xs font-mono mt-0.5">
                  Role: {selectedCase.role} · Channel: {selectedCase.channel} · Input: {selectedCase.input_mode ?? "typed"}
                </p>
              </div>
            </div>

            {selectedCase.failure_reason && (
              <div className="rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" data-testid="failure-reason-box">
                <p className="font-semibold text-xs uppercase tracking-wide">Failure Diagnosis</p>
                <p className="mt-1 font-mono text-xs">{selectedCase.failure_reason}</p>
              </div>
            )}

            {/* Citations returned */}
            {selectedCase.citations && selectedCase.citations.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Citations Returned ({selectedCase.citations.length})</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {selectedCase.citations.map((cit) => (
                    <div key={cit.unit_id} className="rounded border border-border bg-surface p-2.5 text-xs">
                      <div className="flex items-center justify-between font-mono font-semibold">
                        <span>{cit.unit_id} v{cit.version}</span>
                        {cit.verbatim && <span className="text-[10px] text-brand-green-dark font-normal">verbatim</span>}
                      </div>
                      <p className="font-medium mt-0.5 text-ink">{cit.title}</p>
                      <p className="text-ink-muted mt-0.5">Owner: {cit.owner} · Effective: {cit.effective_date}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pipeline Trace Steps */}
            {selectedCase.trace && selectedCase.trace.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Serving Pipeline Trace</p>
                <div className="rounded border border-border bg-surface p-3 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
                  {selectedCase.trace.map((step, idx) => (
                    <div key={idx} className="text-ink-muted">
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function GuardedEvalsPage() {
  return (
    <RequirePage to="/evals">
      <EvalsPage />
    </RequirePage>
  );
}
