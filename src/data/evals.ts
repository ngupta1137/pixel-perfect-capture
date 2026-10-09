// Synthetic data. Smoke tests, not a launch gate.
export const SETS = [
  { name: "Golden set", cases: 27, note: "Written while building", result: "96.3% cases correct", critical: 0, extra: "Release gates PASS · 1 open failure (G17)" },
  { name: "Blind set", cases: 30, note: "Written by an agent that never saw the engine", result: "39.4% first run → 51.5% now (outcome accuracy)", critical: 5, extra: "Honest generalization score" },
  { name: "Hold-out set 1", cases: 15, note: "Never tuned on", result: "66.7%", critical: 2, extra: "" },
  { name: "AEP hold-out", cases: 30, note: "From a different AI, written for the 2027 script", result: "66.7% first run → 93.3% now", critical: 0, extra: "Fixed cases are no longer blind; a fresh hold-out is needed." },
];

export const STATS = [
  { value: "0", label: "permission leaks" },
  { value: "0", label: "retired units served" },
  { value: "Exact", label: "verbatim on every verbatim case" },
];

export const ACCURACY = [
  { name: "Golden", value: 96.3, color: "var(--color-brand-green-dark)" },
  { name: "Blind first", value: 39.4, color: "var(--color-outcome-insufficient)" },
  { name: "Blind now", value: 51.5, color: "var(--color-outcome-insufficient)" },
  { name: "Hold-out", value: 66.7, color: "var(--color-outcome-clarify)" },
  { name: "AEP first", value: 66.7, color: "var(--color-outcome-clarify)" },
  { name: "AEP now", value: 93.3, color: "var(--color-brand-green-dark)" },
];

export const GATE = [
  "Zero critical failures on golden",
  "Zero permission leaks",
  "Verbatim 100%",
  "Zero retired exposure",
  "Drift flag recall 100%",
];

export type FailureStatus = "Fixed" | "Open";
export const FAILURES: { id: string; symptom: string; status: FailureStatus }[] = [
  { id: "G17", symptom: "Golden case G17 fails", status: "Open" },
  { id: "F01", symptom: "Two approved units disagreed; date recency silently picked one", status: "Fixed" },
  { id: "F02", symptom: 'Abstained on "closing statement" on a recorded call', status: "Fixed" },
  { id: "F03", symptom: '"Voice" meant both input and delivery', status: "Fixed" },
  { id: "F04", symptom: 'Leftover "DOB" label steered search', status: "Fixed" },
  { id: "F05", symptom: "Second half of a two-part question lost its subject", status: "Open" },
  { id: "F06", symptom: "Grievance question got mail-order steps", status: "Fixed" },
  { id: "F07", symptom: '"tier3" steered toward the Kentucky pilot', status: "Fixed" },
  { id: "F08", symptom: 'PHI survived with capital "Member"', status: "Fixed" },
  { id: "F09", symptom: "Two indirect safety phrasings missed", status: "Fixed" },
  { id: "F10", symptom: "Contractions diluted coverage", status: "Fixed" },
  { id: "F11", symptom: "Unit-ID request treated as a search", status: "Fixed" },
  { id: "F12", symptom: "Conversational phrasing defeats the keyword gate", status: "Open" },
  { id: "F13", symptom: "Stale unit dropped silently", status: "Open" },
  { id: "F14", symptom: "Paraphrase of a restricted title", status: "Open" },
  { id: "F15", symptom: "AEP 2027 cases answered with 2026 units", status: "Fixed" },
  { id: "F16", symptom: "Duplicate approved units", status: "Open" },
  { id: "F17", symptom: "AEP plan-year wording missed by the year filter", status: "Fixed" },
];
