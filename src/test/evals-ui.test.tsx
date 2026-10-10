import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Route } from '../routes/evals';
import * as verityService from '../services/verity';
import { runGoldenSuite } from '../verity-engine/evalRunner';

// Mock RequirePage to directly render children
vi.mock('@/components/shell/Denied', () => ({
  RequirePage: ({ children }: { children: React.ReactNode }) => <div data-testid="guarded-wrapper">{children}</div>,
}));

// Mock recharts ResponsiveContainer to avoid 0x0 container size warnings in jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

describe('Dynamic Evals UI Integration (Phase 2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders initial state and prompts execution when no run has completed yet', async () => {
    vi.spyOn(verityService, 'getLatestEvalRun').mockResolvedValue(null);

    const EvalsComponent = Route.options.component!;
    render(<EvalsComponent />);

    expect(screen.getByText('Quality & evaluations')).toBeInTheDocument();
    expect(screen.getByTestId('run-eval-btn')).toBeInTheDocument();
    expect(screen.getByTestId('eval-empty-banner')).toBeInTheDocument();
    expect(screen.getByText(/No evaluation has been executed in this session/)).toBeInTheDocument();

    // Suite cards show unexecuted / unavailable states
    expect(screen.getByTestId('suite-card-golden')).toHaveTextContent('Awaiting execution');
    expect(screen.getByTestId('suite-card-blind')).toHaveTextContent('Unavailable');
    expect(screen.getByTestId('suite-card-holdout-1')).toHaveTextContent('Unavailable');
    expect(screen.getByTestId('suite-card-aep-holdout')).toHaveTextContent('Unavailable');
  });

  it('triggers real Golden evaluation, updates metrics dynamically, and displays live results', async () => {
    vi.spyOn(verityService, 'getLatestEvalRun').mockResolvedValue(null);

    const EvalsComponent = Route.options.component!;
    render(<EvalsComponent />);

    const runBtn = screen.getByTestId('run-eval-btn');
    expect(runBtn).toHaveTextContent('Run Golden evaluation');

    // Trigger execution
    fireEvent.click(runBtn);

    // Wait for real execution to complete
    await waitFor(() => {
      expect(screen.getByTestId('eval-run-metadata')).toBeInTheDocument();
    }, { timeout: 4000 });

    // Verify calculated Golden set metrics
    expect(screen.getByTestId('golden-result-text')).toHaveTextContent('96.3% cases correct (26/27)');
    expect(screen.getByTestId('golden-critical-text')).toHaveTextContent('0 critical');
    expect(screen.getByTestId('golden-extra-text')).toHaveTextContent('Release gates PASS · 1 open failure (G17)');

    // Verify Blind and Holdout suites are explicitly marked as unavailable without fake numbers
    expect(screen.getByTestId('suite-card-blind')).toHaveTextContent('Unavailable');
    expect(screen.getByTestId('suite-card-holdout-1')).toHaveTextContent('Unavailable');
    expect(screen.getByTestId('suite-card-aep-holdout')).toHaveTextContent('Unavailable');

    // Verify 4 quality & safety stats
    expect(screen.getByTestId('stat-permission-leaks')).toHaveTextContent('0');
    expect(screen.getByTestId('stat-retired-exposure')).toHaveTextContent('0');
    expect(screen.getByTestId('stat-verbatim-compliance')).toHaveTextContent('100%');
    expect(screen.getByTestId('stat-latency')).toHaveTextContent(/ms/);

    // Verify Release Gate box
    expect(screen.getByTestId('gate-status-banner')).toHaveTextContent('Release gates: PASS');

    // Verify failure count text
    expect(screen.getByTestId('failure-count-text')).toHaveTextContent('1 open failure · 26 passed');

    // Verify G17 is identified as open failure in table
    expect(screen.getByTestId('case-row-G17')).toBeInTheDocument();
    expect(screen.getByTestId('case-row-G17')).toHaveTextContent('Open failure');
  });

  it('inspects failing case G17 and displays real failure diagnosis and pipeline trace', async () => {
    const liveReport = runGoldenSuite();
    vi.spyOn(verityService, 'getLatestEvalRun').mockResolvedValue(liveReport);

    const EvalsComponent = Route.options.component!;
    render(<EvalsComponent />);

    // Wait for mounted report to display
    await waitFor(() => {
      expect(screen.getByTestId('eval-run-metadata')).toBeInTheDocument();
    });

    // Filter to Open failures only
    const filterSelect = screen.getByTestId('filter-select');
    fireEvent.change(filterSelect, { target: { value: 'Open' } });

    // Table now only displays G17
    expect(screen.getByTestId('case-row-G17')).toBeInTheDocument();
    expect(screen.queryByTestId('case-row-G01')).not.toBeInTheDocument();

    // Click row to inspect
    fireEvent.click(screen.getByTestId('case-row-G17'));

    // Verify case diagnosis details
    const detailPanel = screen.getByTestId('selected-case-detail');
    expect(detailPanel).toBeInTheDocument();
    expect(detailPanel).toHaveTextContent('how long does mail order take and is shipping free');
    expect(detailPanel).toHaveTextContent('Multi-part mismatch');
    expect(detailPanel).toHaveTextContent('Serving Pipeline Trace');
    expect(detailPanel).toHaveTextContent('Redact PHI/PII');
  });

  it('displays error banner if runner encounters an exception', async () => {
    vi.spyOn(verityService, 'getLatestEvalRun').mockResolvedValue(null);
    vi.spyOn(verityService, 'executeEvaluation').mockRejectedValue(new Error('Runner execution timeout'));

    const EvalsComponent = Route.options.component!;
    render(<EvalsComponent />);

    const runBtn = screen.getByTestId('run-eval-btn');
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByTestId('eval-error-banner')).toBeInTheDocument();
    });

    expect(screen.getByTestId('eval-error-banner')).toHaveTextContent('Runner execution timeout');
  });
});
