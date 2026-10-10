// Server functions for Verity evaluation runs.
// Following TanStack Start createServerFn conventions.
import { createServerFn } from '@tanstack/react-start';
import type { EvalReport } from '../verity-engine/evalRunner.ts';

export interface RunEvaluationRequest {
  suite: string;
}

/**
 * Validates evaluation request inputs.
 * Rejects invalid payloads or unsupported suites.
 */
export function validateEvaluationRequest(d: RunEvaluationRequest): { suite: string } {
  if (!d || typeof d !== 'object' || typeof d.suite !== 'string') {
    throw new Error('Invalid evaluation request payload: suite name is required.');
  }
  const normalizedSuite = d.suite.trim().toLowerCase();
  if (normalizedSuite !== 'golden') {
    throw new Error(
      `Evaluation suite "${d.suite}" is not executable. Blind and holdout suites are not configured in Phase 1; only "golden" is supported.`,
    );
  }
  return { suite: normalizedSuite };
}

/**
 * Server-side evaluation execution handler.
 */
export async function executeEvaluationHandler(data: { suite: string }): Promise<EvalReport> {
  const { runSuite } = await import('../verity-engine/evalRunner.ts');
  return runSuite(data.suite);
}

/**
 * Server function to trigger an evaluation run.
 * In Phase 1 and 2, only the "golden" suite is executable.
 */
export const runEvaluationSuite = createServerFn({ method: 'POST' })
  .validator(validateEvaluationRequest)
  .handler(async ({ data }): Promise<EvalReport> => {
    return executeEvaluationHandler(data);
  });

/**
 * Server-side handler to fetch the latest execution report.
 */
export async function executeGetLatestHandler(): Promise<EvalReport | null> {
  const { getLatestReport } = await import('../verity-engine/evalRunner.ts');
  return getLatestReport();
}

/**
 * Server function to retrieve the latest evaluation report.
 */
export const getLatestEvaluationReport = createServerFn({ method: 'GET' })
  .handler(async (): Promise<EvalReport | null> => {
    return executeGetLatestHandler();
  });

