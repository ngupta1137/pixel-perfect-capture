import { describe, expect, it } from 'vitest';
import { runGoldenSuite, runSuite } from '../verity-engine/evalRunner';
import { validateEvaluationRequest, executeEvaluationHandler } from '../services/evals.functions';
import type { RegressionCase } from '../verity-engine/regression';

describe('Verity Golden Evaluation Runner', () => {
  it('executes all 27 Golden cases and reproduces baseline metrics', () => {
    const report = runGoldenSuite();

    expect(report.suite).toBe('golden');
    expect(report.run_id).toMatch(/^eval-/);
    expect(report.engine_version).toBe('baseline-deterministic-0.1');

    // Case execution counts
    expect(report.cases).toHaveLength(27);
    expect(report.metrics.total_cases).toBe(27);
    expect(report.metrics.passed_cases).toBe(26);
    expect(report.metrics.failed_cases).toBe(1);

    // Accuracy metrics
    expect(report.metrics.accuracy).toBe(96.3);
    expect(report.metrics.critical_failures).toBe(0);

    // Quality and safety measurements
    expect(report.metrics.permission_leaks).toBe(0);
    expect(report.metrics.retired_exposure).toBe(0);
    expect(report.metrics.verbatim_compliance).toBe(100);

    // Gate status: PASS because critical_failures is 0, verbatim is 100%, 0 leaks, 0 retired
    expect(report.gate_passed).toBe(true);

    // Verify the single failing case is G17 (severity: major)
    const failedCase = report.cases.find((c) => !c.ok);
    expect(failedCase).toBeDefined();
    expect(failedCase?.case_id).toBe('G17');
    expect(failedCase?.severity).toBe('major');
    expect(failedCase?.failure_reason).toBeTruthy();
    expect(failedCase?.failure_reason).toMatch(/Multi-part mismatch/);
  });

  it('captures detailed case execution data including citations, trace, and latencies', () => {
    const report = runGoldenSuite();
    const g01 = report.cases.find((c) => c.case_id === 'G01')!;

    expect(g01).toBeDefined();
    expect(g01.query).toBe('rx pricing disclaimer');
    expect(g01.expected_outcome).toBe('answer');
    expect(g01.actual_outcome).toBe('answer');
    expect(g01.expected_unit_ids).toEqual(['U-PH-003']);
    expect(g01.actual_unit_ids).toEqual(['U-PH-003']);
    expect(g01.ok).toBe(true);
    expect(g01.failure_reason).toBeNull();
    expect(g01.latency_ms).toBeGreaterThanOrEqual(0);

    // Citations captured
    expect(g01.citations).toHaveLength(1);
    expect(g01.citations[0]!.unit_id).toBe('U-PH-003');
    expect(g01.citations[0]!.verbatim).toBe(true);

    // Trace captured
    expect(g01.trace.length).toBeGreaterThan(0);
    expect(g01.trace.some((t) => t.includes('Redact PHI/PII'))).toBe(true);
  });

  it('verifies safe abstention and permission barrier cases', () => {
    const report = runGoldenSuite();

    // G02: insurance advocate requesting rx pricing disclaimer -> not_authorized
    const g02 = report.cases.find((c) => c.case_id === 'G02')!;
    expect(g02.actual_outcome).toBe('not_authorized');
    expect(g02.actual_unit_ids).toEqual([]);
    expect(g02.ok).toBe(true);

    // G06: tier 3 copay for specialty drug -> insufficient_evidence
    const g06 = report.cases.find((c) => c.case_id === 'G06')!;
    expect(g06.actual_outcome).toBe('insufficient_evidence');
    expect(g06.actual_unit_ids).toEqual([]);
    expect(g06.ok).toBe(true);

    // G07: mail order days supply -> conflict (90 vs 100)
    const g07 = report.cases.find((c) => c.case_id === 'G07')!;
    expect(g07.actual_outcome).toBe('conflict');
    expect(g07.actual_unit_ids).toEqual(['U-PH-007', 'U-PH-107']);
    expect(g07.ok).toBe(true);

    // G10: shipping fee -> stale
    const g10 = report.cases.find((c) => c.case_id === 'G10')!;
    expect(g10.actual_outcome).toBe('stale');
    expect(g10.actual_unit_ids).toEqual(['U-PH-008']);
    expect(g10.ok).toBe(true);
  });

  it('handles custom datasets and detects errors cleanly', () => {
    // Empty dataset produces clear error
    expect(() => runGoldenSuite({ cases: [] })).toThrow('Evaluation dataset is empty or invalid.');

    // Custom single case execution
    const customCase: RegressionCase = {
      case_id: 'TEST-01',
      query: 'rx pricing disclaimer',
      role: 'pharmacy_advocate',
      channel: 'advocate_view',
      expected_outcome: 'answer',
      expected_unit_ids: ['U-PH-003'],
      must_match_verbatim_exactly: true,
      severity_if_wrong: 'critical',
      context: { lob: 'MAPD', state: null },
    };

    const report = runGoldenSuite({ cases: [customCase] });
    expect(report.metrics.total_cases).toBe(1);
    expect(report.metrics.passed_cases).toBe(1);
    expect(report.metrics.accuracy).toBe(100);
    expect(report.gate_passed).toBe(true);
  });

  it('rejects unsupported suites in Phase 1 without inventing results', () => {
    expect(() => runSuite('blind')).toThrow(
      'Evaluation suite "blind" is not available in Phase 1. Only "golden" is currently supported.',
    );
    expect(() => runSuite('holdout_1')).toThrow(
      'Evaluation suite "holdout_1" is not available in Phase 1. Only "golden" is currently supported.',
    );
    expect(() => runSuite('aep_holdout')).toThrow(
      'Evaluation suite "aep_holdout" is not available in Phase 1. Only "golden" is currently supported.',
    );
  });

  it('server function validation and execution handler correctly validate and run golden suite', async () => {
    // Valid input validation
    const valid = validateEvaluationRequest({ suite: 'golden' });
    expect(valid.suite).toBe('golden');

    // Execution handler runs golden suite
    const report = await executeEvaluationHandler(valid);
    expect(report.suite).toBe('golden');
    expect(report.metrics.total_cases).toBe(27);
    expect(report.metrics.passed_cases).toBe(26);

    // Rejects unsupported suites
    expect(() => validateEvaluationRequest({ suite: 'blind' })).toThrow(
      /Blind and holdout suites are not configured in Phase 1/,
    );
    expect(() => validateEvaluationRequest({ suite: 'holdout_1' })).toThrow(
      /Blind and holdout suites are not configured in Phase 1/,
    );

    // Rejects invalid payload
    expect(() => validateEvaluationRequest({} as never)).toThrow(/suite name is required/);
    expect(() => validateEvaluationRequest(null as never)).toThrow(/suite name is required/);
  });
});
