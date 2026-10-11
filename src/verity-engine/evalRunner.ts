// Server-side evaluation runner for Verity.
// Executes evaluation test cases against the live deterministic Verity engine
// and computes accurate, un-mocked metrics.

import { getStore, AS_OF } from './server.ts';
import goldenRaw from './data/golden_set.json';
import { passes, type RegressionCase } from './regression.ts';
import type { ServeRequest, ServeResponse } from './types.ts';
import type { Verity } from './pipeline.ts';

export interface EvalCitation {
  unit_id: string;
  version: number;
  title: string;
  owner: string;
  effective_date: string;
  verbatim: boolean;
}

export interface EvalCaseResult {
  case_id: string;
  query: string;
  role: string;
  channel: string;
  input_mode?: 'typed' | 'voice' | undefined;
  expected_outcome: string;
  actual_outcome: string;
  expected_unit_ids: string[];
  actual_unit_ids: string[];
  ok: boolean;
  severity: string;
  failure_reason: string | null;
  citations: EvalCitation[];
  trace: string[];
  latency_ms: number;
  slices?: string[] | undefined;
}

export interface EvalMetrics {
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  accuracy: number; // overall percentage (0-100)
  outcome_accuracy: number; // percentage where actual outcome matched expected
  critical_failures: number;
  permission_leaks: number;
  retired_exposure: number;
  verbatim_compliance: number; // percentage of verbatim cases that matched exact text
  average_latency_ms: number;
}

export interface EvalReport {
  run_id: string;
  suite: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  engine_version: string;
  as_of: string;
  metrics: EvalMetrics;
  gate_passed: boolean;
  cases: EvalCaseResult[];
}

export interface RunOptions {
  cases?: RegressionCase[];
  engine?: Verity;
}

/**
 * Executes an individual regression case against the specified Verity engine.
 */
export function executeCase(c: RegressionCase, engine: Verity): {
  result: EvalCaseResult;
  isPermissionLeak: boolean;
  isRetiredExposure: boolean;
  isVerbatimCompliant: boolean | null;
} {
  const req: ServeRequest = {
    query: c.query,
    role: c.role,
    channel: c.channel,
    input_mode: c.input_mode ?? 'typed',
    context: {
      lob: c.context?.lob ?? null,
      state: c.context?.state ?? null,
      plan_year: (c.context as { plan_year?: number })?.plan_year as number,
    },
  };

  const t0 = performance.now();
  const resp: ServeResponse = engine.serve(req);
  const latencyMs = Math.round(performance.now() - t0);

  const evalResult = passes(c, resp, engine);
  const actualUnitIds = [...new Set(resp.parts.flatMap((p) => p.unit_ids))];

  // Resolve citations from active engine units
  const citations: EvalCitation[] = actualUnitIds
    .map((id) => engine.unit(id))
    .filter((u): u is NonNullable<typeof u> => !!u)
    .map((u) => ({
      unit_id: u.unit_id,
      version: u.version,
      title: u.title,
      owner: u.owner,
      effective_date: u.effective_date,
      verbatim: u.verbatim,
    }));

  // Safety Check: Permission leakage
  let isPermissionLeak = false;
  if (resp.outcome === 'not_authorized') {
    // If not authorized, body text must never be served, and model context must be empty
    const bodyServed = resp.parts.some((p) => p.text !== null && p.text !== '');
    const modelContextExposed = (resp.record?.model_context_unit_ids ?? []).length > 0;
    if (bodyServed || modelContextExposed) {
      isPermissionLeak = true;
    }
  }

  // Safety Check: Retired unit exposure
  let isRetiredExposure = false;
  for (const id of actualUnitIds) {
    const u = engine.unit(id);
    if (u && u.status === 'retired') {
      isRetiredExposure = true;
    }
  }

  // Verbatim Compliance Check
  let isVerbatimCompliant: boolean | null = null;
  if (c.must_match_verbatim_exactly) {
    const exp = c.expected_unit_ids[0] ? engine.unit(c.expected_unit_ids[0]) : undefined;
    isVerbatimCompliant = resp.outcome === 'answer' && !!exp && resp.parts.some((p) => p.text === exp.body);
  }

  const caseResult: EvalCaseResult = {
    case_id: c.case_id,
    query: c.query,
    role: c.role,
    channel: c.channel,
    input_mode: c.input_mode,
    expected_outcome: c.expected_outcome,
    actual_outcome: resp.outcome,
    expected_unit_ids: c.expected_unit_ids,
    actual_unit_ids: actualUnitIds,
    ok: evalResult.ok,
    severity: c.severity_if_wrong,
    failure_reason: evalResult.ok ? null : (evalResult.reason ?? `Failed expectation: expected ${c.expected_outcome}, got ${evalResult.got}`),
    citations,
    trace: resp.trace.map((t) => `${t.step}. ${t.name} [${t.kind}]: ${t.detail}`),
    latency_ms: latencyMs,
    slices: (c as { slices?: string[] }).slices,
  };

  return {
    result: caseResult,
    isPermissionLeak,
    isRetiredExposure,
    isVerbatimCompliant,
  };
}

/**
 * Runs the Golden evaluation suite (or custom provided cases) against the Verity engine.
 */
export function runGoldenSuite(options: RunOptions = {}): EvalReport {
  const tStart = performance.now();
  const startedAt = new Date().toISOString();

  // Load cases: default to golden_set.json
  const rawCases: RegressionCase[] = options.cases ?? ((goldenRaw as unknown as { cases?: RegressionCase[] }).cases ?? []);
  if (!Array.isArray(rawCases) || rawCases.length === 0) {
    throw new Error('Evaluation dataset is empty or invalid.');
  }

  const engine = options.engine ?? getStore().engine();
  const results: EvalCaseResult[] = [];

  let passedCases = 0;
  let matchingOutcomes = 0;
  let criticalFailures = 0;
  let permissionLeaks = 0;
  let retiredExposure = 0;
  let verbatimTotal = 0;
  let verbatimPassed = 0;
  let totalLatency = 0;

  for (const c of rawCases) {
    try {
      const { result, isPermissionLeak, isRetiredExposure, isVerbatimCompliant } = executeCase(c, engine);
      results.push(result);

      if (result.ok) {
        passedCases++;
      } else if (c.severity_if_wrong === 'critical') {
        criticalFailures++;
      }

      if (result.actual_outcome === c.expected_outcome) {
        matchingOutcomes++;
      }

      if (isPermissionLeak) {
        permissionLeaks++;
      }

      if (isRetiredExposure) {
        retiredExposure++;
      }

      if (isVerbatimCompliant !== null) {
        verbatimTotal++;
        if (isVerbatimCompliant) {
          verbatimPassed++;
        }
      }

      totalLatency += result.latency_ms;
    } catch (err) {
      // Individual case failure should be recorded with error reason
      const errMsg = err instanceof Error ? err.message : String(err);
      results.push({
        case_id: c.case_id,
        query: c.query,
        role: c.role,
        channel: c.channel,
        input_mode: c.input_mode,
        expected_outcome: c.expected_outcome,
        actual_outcome: 'error',
        expected_unit_ids: c.expected_unit_ids,
        actual_unit_ids: [],
        ok: false,
        severity: c.severity_if_wrong,
        failure_reason: `Execution error: ${errMsg}`,
        citations: [],
        trace: [],
        latency_ms: 0,
        slices: (c as { slices?: string[] }).slices,
      });
      if (c.severity_if_wrong === 'critical') {
        criticalFailures++;
      }
    }
  }

  const completedAt = new Date().toISOString();
  const durationMs = Math.round(performance.now() - tStart);
  const totalCases = rawCases.length;
  const failedCases = totalCases - passedCases;
  const accuracy = totalCases > 0 ? Math.round((passedCases / totalCases) * 1000) / 10 : 0;
  const outcomeAccuracy = totalCases > 0 ? Math.round((matchingOutcomes / totalCases) * 1000) / 10 : 0;
  const verbatimCompliance = verbatimTotal > 0 ? Math.round((verbatimPassed / verbatimTotal) * 1000) / 10 : 100;
  const averageLatencyMs = totalCases > 0 ? Math.round((totalLatency / totalCases) * 10) / 10 : 0;

  const gatePassed = criticalFailures === 0 && permissionLeaks === 0 && retiredExposure === 0 && verbatimCompliance === 100;

  const runId = `eval-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  const report: EvalReport = {
    run_id: runId,
    suite: 'golden',
    started_at: startedAt,
    completed_at: completedAt,
    duration_ms: durationMs,
    engine_version: results[0]?.trace[0] ? 'baseline-deterministic-0.1' : 'baseline-deterministic-0.1',
    as_of: AS_OF,
    metrics: {
      total_cases: totalCases,
      passed_cases: passedCases,
      failed_cases: failedCases,
      accuracy,
      outcome_accuracy: outcomeAccuracy,
      critical_failures: criticalFailures,
      permission_leaks: permissionLeaks,
      retired_exposure: retiredExposure,
      verbatim_compliance: verbatimCompliance,
      average_latency_ms: averageLatencyMs,
    },
    gate_passed: gatePassed,
    cases: results,
  };

  latestReport = report;
  return report;
}

let latestReport: EvalReport | null = null;

export function getLatestReport(): EvalReport | null {
  return latestReport;
}

export function resetEvaluationStore(): void {
  latestReport = null;
}

/**
 * Universal suite runner entry point. Validates supported suite names.
 */
export function runSuite(suiteName: string, options: RunOptions = {}): EvalReport {
  if (suiteName !== 'golden') {
    throw new Error(`Evaluation suite "${suiteName}" is not available in Phase 1. Only "golden" is currently supported.`);
  }
  return runGoldenSuite(options);
}
