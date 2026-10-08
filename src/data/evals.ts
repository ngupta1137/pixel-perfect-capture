export const STATS = [
  { value: "0", label: "critical failures (golden set, 27 cases)" },
  { value: "92.9%", label: "outcome accuracy (golden)" },
  { value: "39.4% → 51.5%", label: "blind set (30 cases, written by an agent that never saw the engine)" },
  { value: "0 · 0", label: "permission leaks · retired units served" },
];

export const ACCURACY = [
  { name: "Golden", value: 92.9, color: "#4E8416" },
  { name: "Blind first run", value: 39.4, color: "#B26B00" },
  { name: "Blind after fixes", value: 51.5, color: "#5EA908" },
];

export const GATE = [
  "Zero critical failures",
  "Zero permission leaks",
  "Verbatim 100%",
  "Zero retired exposure",
  "Verbatim drift flag recall 100%",
];

export const FAILURES: { id: string; symptom: string; status: "Fixed" | "Open" }[] = [
  { id: "F01", symptom: "Two approved units disagreed; date recency silently picked one", status: "Fixed" },
  { id: "F02", symptom: 'Abstained on "closing statement" on a recorded call', status: "Fixed" },
  { id: "F03", symptom: '"Voice" meant both input and delivery', status: "Fixed" },
  { id: "F04", symptom: 'Leftover "DOB" label steered search', status: "Fixed" },
  { id: "F05", symptom: "Second half of a two-part question lost its subject", status: "Open" },
  { id: "F06", symptom: "Grievance question got mail-order steps", status: "Fixed" },
  { id: "F07", symptom: '"tier3" steered toward the Kentucky pilot', status: "Open" },
  { id: "F08", symptom: 'PHI survived with capital "Member"', status: "Fixed" },
  { id: "F09", symptom: "Two indirect safety phrasings missed", status: "Fixed" },
  { id: "F10", symptom: "Contractions diluted coverage", status: "Fixed" },
  { id: "F11", symptom: "Unit-ID request treated as a search", status: "Fixed" },
  { id: "F12", symptom: "Conversational phrasing defeats the keyword gate", status: "Open" },
];
