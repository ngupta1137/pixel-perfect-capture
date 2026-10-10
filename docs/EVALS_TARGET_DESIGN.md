# Verity — Target Evaluation Architecture & Design

**Document:** `docs/EVALS_TARGET_DESIGN.md`  
**Purpose:** Architecture, execution flow, metric definitions, safety checks, and regression promotion gates for Verity Evals.

---

## 1. System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Evals UI (/evals)                             │
│  - Suite Selector (Golden, Blind, Holdout, AEP)                        │
│  - Trigger Run Button with live progress state                         │
│  - Real-time KPI Cards, Recharts Accuracy Graph, Gate Checklist        │
│  - Interactive Case-Level Failure Inspector with Trace / Repro Diff    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                       Server Function (RPC)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│           Evaluation Orchestrator (src/services/evals.functions.ts)    │
│  - Loads target dataset (golden_set.json, blind_set.json, etc.)        │
│  - Spawns Evaluation Runner with active Engine configuration           │
│  - Records run metadata: run_id, timestamp, git_commit, dataset_version│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Evaluation Execution Engine (src/verity-engine/evals.ts)   │
│  - Invokes Verity.serve() for each RegressionCase                      │
│  - Evaluates passes() criteria: outcome, unit_ids, verbatim, safety    │
│  - Collects CaseExecutionRecord (trace, redaction, citations, latency) │
│  - Calculates Aggregate Metrics & Release Gate compliance              │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐   ┌─────────────────────────────┐
│    Verity Serving Pipeline (Real)    │   │  Evaluation Report Storage  │
│  - Steps 1-13 (pipeline.ts)          │   │  - data/eval_runs/<run_id>  │
│  - Keyword Index (retrieval.ts)      │   │  - summary.json & cases.json│
│  - Guards & Redaction (guards.ts)    │   │  - Survives browser reload  │
└──────────────────────────────────────┘   └─────────────────────────────┘
```

---

## 2. End-to-End Execution Flow

1. **Suite Selection & Trigger:**
   - User selects an evaluation suite on `/evals` (`Golden`, `Blind`, `Hold-out 1`, `AEP hold-out`).
   - User clicks **"Execute Evaluation"**.
   - UI enters running state; displays elapsed time and disables conflicting actions.
2. **Execution via Server Function:**
   - Client calls `runEvaluationSuite({ suite: 'golden', datasetVersion: 'v1.0' })`.
   - The server function initializes the runner against the current in-memory or persisted knowledge store (`getStore().engine()`).
3. **Case-by-Case Execution & Capturing:**
   - For each test case:
     - Feeds query, role, channel, and context (`lob`, `state`) into `engine.serve()`.
     - Records:
       - Query & Redacted Query
       - Expected outcome & actual outcome
       - Expected unit IDs & actual unit IDs
       - Verbatim text match verification
       - Citations returned with source & version
       - Step-by-step trace steps (Steps 1–13)
       - Execution latency in milliseconds
4. **Metric Calculation:**
   - Computes:
     - Overall Case Accuracy (%)
     - Outcome Accuracy (%)
     - Unit Selection Accuracy (%)
     - Verbatim Compliance Rate (must be 100%)
     - Role Permission Leakage Count (must be 0)
     - Retired Exposure Count (must be 0)
     - Critical Failure Count (must be 0 for Golden)
5. **Gate Evaluation:**
   - Tests run results against the defined **Release Gates**.
   - Computes gate status: `PASS` vs `BLOCKED`.
6. **Persistence & Reporting:**
   - Stores the execution report on the server file store (`src/verity-engine/data/runs/<run_id>.json`).
   - Returns structured `EvaluationReport` to the UI.
   - UI renders real numbers, charts, and actionable failure logs.

---

## 3. Metric Definitions & Calculations

| Metric | Formula | Target Threshold | Action on Breach |
|---|---|---|---|
| **Overall Accuracy** | $\frac{\text{Cases with All Assertions Passed}}{\text{Total Cases}} \times 100$ | Golden: $\ge 95\%$ | Flagged in summary |
| **Outcome Accuracy** | $\frac{\text{Cases with Outcome} == \text{Expected Outcome}}{\text{Total Cases}} \times 100$ | Golden: $\ge 95\%$ | Review incorrect outcomes |
| **Critical Failure Count** | $\sum [\text{Failed Cases with } \text{severity} == \text{"critical"}]$ | **0** | **Hard Block** (Release Gate failure) |
| **Permission Leaks** | $\sum [\text{Responses returning restricted body or unauthorized unit}]$ | **0** | **Hard Block** (Security escalation) |
| **Verbatim Compliance** | $\frac{\text{Verbatim cases with exact text match}}{\text{Total verbatim cases}} \times 100$ | **100%** | **Hard Block** (Legal compliance failure) |
| **Retired Unit Exposure** | $\sum [\text{Responses serving units with status} == \text{"retired"}]$ | **0** | **Hard Block** (Stale content failure) |
| **Drift Flag Recall** | $\frac{\text{Detected semantic drift cases}}{\text{Total drift benchmark cases}} \times 100$ | **100%** | Authoring review block |
| **Abstention Accuracy** | $\frac{\text{Correctly abstained insufficient-evidence cases}}{\text{Total out-of-scope cases}} \times 100$ | $\ge 90\%$ | Knowledge gap investigation |

---

## 4. Quality & Safety Enforcement Checks

The target evaluation framework enforces these automated assertions on every run:

1. **Zero Permission Leakage:**
   - When role is not entitled to a KB (e.g. `G02`: `insurance_advocate` querying pharmacy disclaimer):
   - Result must be `not_authorized`.
   - Unit bodies must NEVER be populated in `r.parts[*].text`.
   - Model context list must be empty.
2. **Zero Unapproved Unit Exposure:**
   - Units with status `draft`, `in_review`, or `rejected` must never appear in `unit_ids` or citations.
3. **Exact Verbatim Preservation:**
   - For cases marked `must_match_verbatim_exactly: true`:
   - `r.parts[*].text` must be strictly identical (`===`) to `unit.body`. No trimming, reformatting, or generative alteration.
4. **Source & Version Traceability:**
   - Citations must match the active `unit_id`, `version`, and `effective_date`.
5. **Safe Abstention:**
   - Out-of-scope queries (e.g. `G20`: dental allowance on medical plan) must return `insufficient_evidence` with `unit_ids: []`.
   - Never generate hallucinated answers from model weights.
6. **Conflict & Staleness Escalation:**
   - Contradicting units (`G07`) must yield `conflict`, cite both units, and refrain from picking an arbitrary winner.
   - Units past `review_date` (`G10`) must yield `stale` with an explicit warning.
7. **Regression Comparison:**
   - When previewing drafts or running candidate changes, any case that passed in baseline and newly fails in candidate is classified as a regression.
   - If `severity_if_wrong == "critical"`, the candidate is strictly blocked from publication.

---

## 5. Persistence & Reproducibility Schema

Every evaluation run produces an immutable run artifact:

```typescript
export interface StoredEvalRun {
  run_id: string; // e.g. "eval-20261010-184500-a1b2"
  started_at: string; // ISO timestamp
  completed_at: string; // ISO timestamp
  git_commit: string; // Current commit hash
  engine_version: string; // "baseline-deterministic-0.1"
  suite: "golden" | "blind" | "holdout_1" | "aep_holdout";
  dataset_version: string;
  total_cases: number;
  passed_cases: number;
  accuracy: number;
  critical_failures: number;
  gates_passed: boolean;
  metrics: {
    permission_leaks: number;
    retired_exposed: number;
    verbatim_rate: number;
    abstention_accuracy: number;
  };
  cases: {
    case_id: string;
    query: string;
    expected_outcome: string;
    actual_outcome: string;
    expected_unit_ids: string[];
    actual_unit_ids: string[];
    ok: boolean;
    severity: string;
    failure_reason?: string;
    trace: string[];
  }[];
}
```

This artifact is saved to disk and loaded by the UI. If a user refreshes the browser, the UI queries `getLatestEvalRun({ suite })` and displays the verified historical results rather than synthetic placeholders.
