# Verity — Evals Current State Audit

**Audit Date:** 2026-10-10  
**Repository:** `pixel-perfect-capture`  
**Current Branch / Commit:** `main` (`ac6c831`)  
**Scope:** Phase 0 evaluation framework inspection, engine tracing, dataset analysis, and capability matrix.

---

## 1. Executive Summary

This audit evaluates the current state of Verity's evaluation system, tracing the execution path from the frontend UI (`/evals`) down to the core engine (`src/verity-engine/`).

### Key Findings:
1. **The `/evals` UI is 100% static mock data:**
   - [src/routes/evals.tsx](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/routes/evals.tsx) imports hardcoded constants from [src/data/evals.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/data/evals.ts).
   - There is no interactive "Run Evaluation" button, no background worker, and no API connection to the backend engine.
   - It cannot execute a real evaluation run in its current state.
2. **A real, deterministic evaluation engine exists in the codebase:**
   - [src/verity-engine/regression.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/regression.ts) implements `checkPublication()` and `passes()`, which compare pipeline responses (`ServeResponse`) against regression test cases.
   - [src/verity-engine/pipeline.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/pipeline.ts) implements the 13-step deterministic serving pipeline.
   - This engine is actively hooked into authoring publication gates ([src/verity-engine/workflow.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/workflow.ts#L209-L219)), but is completely decoupled from the `/evals` page.
3. **Only 1 of 4 evaluation datasets actually exists:**
   - **Golden set:** Present on disk at [src/verity-engine/data/golden_set.json](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/data/golden_set.json) (27 curated cases).
   - **Blind set:** Non-existent (mocked as 30 cases in UI constants).
   - **Hold-out set 1:** Non-existent (mocked as 15 cases in UI constants).
   - **AEP hold-out:** Non-existent (mocked as 30 cases in UI constants).
4. **Controlled execution verification:**
   - Executing all 27 golden cases against the live baseline engine produced **26 passing cases (96.3%) and 1 failure: `G17`**.
   - This perfectly reproduces the static number displayed in [src/data/evals.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/data/evals.ts#L3) (`"96.3% cases correct · 1 open failure (G17)"`), confirming that the UI constants were captured from a previous offline run of this engine.
5. **Lack of persistence:**
   - Engine state is held entirely in memory in [src/verity-engine/server.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/server.ts#L19-L36) (`let store: KnowledgeStore | null = null`).
   - There is no database or file persistence for evaluation run histories, metrics, or case traces. All evaluation state resets upon process restart.

---

## 2. Evaluation Capability Classification Matrix

| Capability | Existing Implementation Location | Real, Partial or Mock | Evidence from Code and Test Execution | Missing Work |
|---|---|---|---|---|
| **1. Golden-set evaluation** | [src/verity-engine/data/golden_set.json](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/data/golden_set.json), [src/verity-engine/regression.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/regression.ts) | **Partial** (Engine is Real; UI is Mock) | Engine code `checkPublication()` and `passes()` runs 27 cases. Controlled test passes 26/27. UI [src/routes/evals.tsx](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/routes/evals.tsx) only displays static `SETS[0]`. | Connect `/evals` UI to a server function that executes the golden suite and displays live results. |
| **2. Blind-set evaluation** | [src/data/evals.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/data/evals.ts#L4) | **Mock** | No dataset file exists in repository. Only static text: `"39.4% first run → 51.5% now"`. | Author or ingest a genuine 30-case blind evaluation dataset file `blind_set.json`. |
| **3. Holdout-set evaluation** | [src/data/evals.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/data/evals.ts#L5-L6) | **Mock** | No dataset files exist for Hold-out 1 or AEP hold-out. Only static numbers (66.7%, 93.3%). | Author or ingest genuine holdout datasets `holdout_set_1.json` and `aep_holdout.json`. |
| **4. Retrieval relevance & ranking quality** | [src/verity-engine/retrieval.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/retrieval.ts) (`KnowledgeIndex`) | **Real** (Keyword TF-IDF only) | `scoreOne()` calculates TF-IDF across synonyms (w=3), title (w=2), body (w=1). Enforces `MIN_COVERAGE = 0.5`. No vector/embedding search is implemented yet. | Embedding-based semantic retrieval is unimplemented (comment indicates future plugin); eval suite does not compute MRR, NDCG, or Recall@k. |
| **5. Correct answer & knowledge-unit selection** | [src/verity-engine/pipeline.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/pipeline.ts#L159-L284) | **Real** | Steps 6–9 evaluate candidate clustering, eligibility, applicability, authority rank, and recency (`supersedes`). | No granular metric logging (Precision@1, Unit Selection Accuracy) output to UI. |
| **6. Role-based access & restricted-content leakage** | [src/verity-engine/pipeline.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/pipeline.ts#L81-L85), [retrieval.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/retrieval.ts#L103-L128) | **Real** | Verified by test case `G02` & `G12`. Entitlement filter is evaluated inside search; routing index returns `not_authorized` with owner team, body never enters context. | Need automated assertions tracking zero leakages across all suites with auditable violation logging. |
| **7. Approved vs. unapproved content enforcement** | [src/verity-engine/retrieval.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/retrieval.ts#L107), [server.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/server.ts#L20-L36) | **Real** | `search()` and `route()` strictly filter `it.unit.status === 'approved'`. Draft/in-review units are excluded from serving index. | No negative test cases in golden set asserting unapproved drafts are ignored. |
| **8. Citation correctness & source traceability** | [src/verity-engine/server.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/server.ts#L114-L121) | **Real** | Citations map `unit_id`, `version`, `title`, `owner`, `effective_date`, `verbatim`. | The eval harness in `regression.ts` checks `unit_ids` but does not assert citation metadata or source version traceability. |
| **9. Insufficient-evidence & safe abstention** | [src/verity-engine/pipeline.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/pipeline.ts#L217,L249,L314) | **Real** | Verified by test cases `G06`, `G15`, `G20`, `R01`, `R03`, `R04`. Yields `insufficient_evidence` and logs gaps. | UI does not display abstention accuracy or false-positive rate. |
| **10. Conflict and stale-content handling** | [src/verity-engine/pipeline.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/pipeline.ts#L234-L235,L273-L281,L299-L306) | **Real** | Verified by test cases `G07` (`conflict`, both shown) and `G10` (`stale`, warning message). | UI does not break down staleness detection or conflict resolution rates. |
| **11. Critical failure detection** | [src/verity-engine/regression.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/regression.ts#L38,L73-L84) | **Real in Engine, Mock in UI** | `checkPublication()` segregates `blocking` (critical) from `warnings`. UI `FAILURES` array is a hardcoded list of 17 items. | Failure log in UI is static; does not capture live execution failures or critical failure flags dynamically. |
| **12. Regression comparison (Baseline vs Candidate)** | [src/verity-engine/regression.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/regression.ts#L61-L85) | **Real in Authoring Gate, Mock in Evals UI** | `checkPublication(data, before, after, cases)` runs baseline `a` vs candidate `b`. Tested in [src/test/authoring.test.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/test/authoring.test.ts#L91). | Evals screen has no interface to select baseline vs candidate or run regression diffs. |
| **13. Per-case failure details & reproducibility** | [src/verity-engine/data/golden_set.json](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/verity-engine/data/golden_set.json), [src/data/evals.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/data/evals.ts#L33-L52) | **Mock in UI** | `FAILURES` in UI has 17 strings without input query, expected unit, trace steps, or repro instructions. | Live run failure details (e.g., query, trace, diff) are never surfaced in the UI. |
| **14. Evaluation metrics displayed by the UI** | [src/routes/evals.tsx](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/routes/evals.tsx#L48-L105) | **Mock** | Displayed cards, stats, recharts bar chart, and release gate checks are hardcoded constants from [src/data/evals.ts](file:///c:/Users/lakha/nitin_sir_collab/pixel-perfect-capture/src/data/evals.ts). | Metrics are not computed from actual runs. |
| **15. Persistence of evaluation runs** | None | **Missing** | No database tables, JSON run logs, or file storage exist for evals. | Evaluation runs are not persisted; browser reload resets all display states. |

---

## 3. Detailed Inspection of Existing Evaluation Code

### 3.1 The Evals UI (`src/routes/evals.tsx`)
- **Route:** `/evals` guarded by `RequirePage to="/evals"`.
- **Rendered Content:**
  - 4 set cards (`SETS`: Golden set, Blind set, Hold-out set 1, AEP hold-out).
  - 3 statistic blocks (`STATS`: "0 permission leaks", "0 retired units served", "Exact verbatim on every verbatim case").
  - Outcome accuracy bar chart (`ACCURACY`).
  - Release gate check list (`GATE`: 5 static items with green icons).
  - Failure log table (`FAILURES`: 17 hardcoded rows, with an "all/Open/Fixed" status dropdown).
- **Execution Hook:**
  - There is **zero** code invoking `Verity`, `serveEngine`, or `checkPublication`.
  - There is no button to trigger a run or reload data from a server function.

### 3.2 Evaluation Data Source (`src/data/evals.ts`)
- Contains static data structures hardcoded as constants:
  - `SETS`: `[ { name: "Golden set", cases: 27, result: "96.3% cases correct", critical: 0, extra: "Release gates PASS · 1 open failure (G17)" }, ... ]`
  - `ACCURACY`: `[ { name: "Golden", value: 96.3 }, ... ]`
  - `GATE`: `[ "Zero critical failures on golden", "Zero permission leaks", "Verbatim 100%", "Zero retired exposure", "Drift flag recall 100%" ]`
  - `FAILURES`: 17 items (`G17`, `F01`–`F17`).

### 3.3 The Core Regression Engine (`src/verity-engine/regression.ts`)
- Implements `RegressionCase` interface:
  - `case_id`, `query`, `role`, `channel`, `input_mode`, `context`, `expected_outcome`, `expected_unit_ids`, `expected_parts`, `must_match_verbatim_exactly`, `severity_if_wrong`.
- Implements `passes(c: RegressionCase, r: ServeResponse, engine: Verity)`:
  - Verifies exact set matching of unit IDs.
  - Verifies multi-part query expectations if `expected_parts` is provided.
  - Verifies verbatim text exactness against `engine.unit(expected_id).body`.
- Implements `checkPublication(data, before, after, cases)`:
  - Instantiates baseline engine `a` and candidate engine `b`.
  - Runs all test cases; filters out pre-existing failures (`if (!was.ok) continue;`).
  - Flags newly failing cases as `blocking` (if severity is `critical`) or `warnings`.

### 3.4 Live Controlled Run Results on Golden Set
Running all 27 golden cases against the live Verity engine yielded:
- **Total Cases:** 27
- **Passed:** 26 (96.3%)
- **Failed:** 1 (3.7%)
- **Failed Case:** `G17` (Severity: `major`, Slices: `multi_part, stale`)
  - **Query:** `"how long does mail order take and is shipping free"`
  - **Expected:**
    - Part 1: `"delivery time"` -> outcome: `"answer"`, unit: `["U-PH-006"]`
    - Part 2: `"shipping cost"` -> outcome: `"stale"`, unit: `["U-PH-008"]`
  - **Actual:**
    - Part 0: `"how long does mail order take"` -> outcome: `"answer"`, unit: `["U-PH-006"]`
    - Part 1: `"is shipping free"` -> outcome: `"insufficient_evidence"`, unit: `[]`
  - **Root Cause:** In the baseline engine without model gateway assist, `splitParts()` splits into `"is shipping free"`, losing the context word `"mail order"`. As a result, the query fails to hit the keyword coverage threshold for `U-PH-008` (Mail order shipping fee), resulting in `insufficient_evidence` instead of `stale`.
  - **Significance:** This confirms that `G17` in `FAILURES` and `src/data/evals.ts` is an authentic failure mode of the deterministic baseline.

---

## 4. Evaluation Dataset Analysis

| Dataset Name | File Location | Case Count | Format | Status | Failure Types & Coverage |
|---|---|---|---|---|---|
| **Golden Set** | `src/verity-engine/data/golden_set.json` | 27 | JSON array of `RegressionCase` | **Curated & Verified** | Verbatim match, RBAC permission barrier, Humana-speak acronyms, Insufficient evidence gap, Conflict detection, Retired unit prevention, Staleness detection, State applicability, Safety escalation, Multi-part query, PHI redaction, Speech-to-text error. |
| **Blind Set** | Non-existent | 0 (Mocked as 30) | N/A | **Missing** | Claimed in spec: Generalization evaluation written without seeing engine internals. |
| **Hold-out Set 1** | Non-existent | 0 (Mocked as 15) | N/A | **Missing** | Claimed in spec: Untuned holdout cases. |
| **AEP Hold-out** | Non-existent | 0 (Mocked as 30) | N/A | **Missing** | Claimed in spec: AEP 2027 script cases. |

---

## 5. Backend Dependencies & Blockers

1. **No Execution API:**
   - There is no server function (such as `runEvalsFn` in `engine.functions.ts`) that executes an evaluation suite and returns results to the client.
2. **Missing Datasets:**
   - Blind and holdout dataset JSON files must be created or supplied to run suites 2, 3, and 4.
3. **No Persistent Eval Run Storage:**
   - Evaluation runs are neither logged to disk nor stored in a database.
   - Refreshing the browser or restarting the process wipes any runtime results.
4. **Decoupled Engine vs Frontend:**
   - The frontend `/evals` page was built from mockup prompts (`docs/LOVABLE_PROMPTS_V3.md`) and was never wired to `src/verity-engine/regression.ts`.
