// Demo guide script. Edit titles and "Say:" talk tracks freely here.
export type GuideRoute = "/" | "/story" | "/work" | "/legal" | "/audit" | "/evals" | "/platform" | "/review" | "/library";

export interface GuideAction {
  /** Button label when a step has more than one part. */
  label?: string;
  /** Person name from src/data/personas.json. Omit to keep the current person. */
  person?: string;
  to: GuideRoute;
  unitId?: string;
  context?: { lob?: string; state?: string; planYear?: string };
  query?: string;
  /** Switch the plan year after the first result arrives. */
  thenPlanYear?: string;
  /** Remember this request id so a later step can replay it. */
  record?: string;
  /** Replay the request id remembered under this key. */
  replay?: string;
  /** Hint shown under the button for manual follow-up. */
  hint?: string;
}

export interface GuideStep { title: string; say: string; actions: GuideAction[] }

const CTX = { lob: "MAPD", state: "KY", planYear: "2026" };

export const GUIDE_STEPS: GuideStep[] = [
  { title: "Problem", say: "Three channels, three answers, and open enrollment opens in days.", actions: [{ to: "/story" }] },
  { title: "One approved answer", say: "One approved unit, cited with version and owner.", actions: [{ person: "Priya", to: "/", context: CTX, query: "how long does mail order take" }] },
  { title: "Year specific", say: "Same question, the year changes the truth.", actions: [{ person: "Priya", to: "/", context: CTX, query: "how many days supply by mail", thenPlanYear: "2027" }] },
  {
    title: "Conflict resolution (P0-1)",
    say: "Two approved sources disagree. Advocate reports conflict; Knowledge Owner resolves; re-query returns a single answer.",
    actions: [
      { label: "1. Conflict shown", person: "Priya", to: "/", context: CTX, query: "how many days supply by mail", record: "disagreement", hint: "Notice both units cited without picking. Click 'Report for resolution'." },
      { label: "2. Owner resolves", person: "Owen", to: "/review", hint: "Open conflict ticket CONF-... and click 'Apply S04 Consolidating Unit' or 'Keep U-PH-007'." },
      { label: "3. Legal signs off", person: "Rita", to: "/legal", hint: "Approve and publish the consolidated authoritative draft." },
      { label: "4. Re-query single answer", person: "Priya", to: "/", context: CTX, query: "how many days supply by mail", hint: "Retired/superseded unit excluded; clean single answer served immediately." },
    ],
  },
  {
    title: "Stale enforcement (P0-2)",
    say: "Units past next_review are blocked from returning as clean answers. Owner confirms still valid to restore.",
    actions: [
      { label: "1. Stale served", person: "Priya", to: "/", context: CTX, query: "is there a shipping fee for mail order", hint: "Past review date (2026-06-30): served as 'stale' with confirm/revise guidance." },
      { label: "2. Confirm still valid", person: "Owen", to: "/library", unitId: "U-PH-008", hint: "Select U-PH-008 and click 'Confirm still valid (+12 mo)'." },
      { label: "3. Re-query restored", person: "Priya", to: "/", context: CTX, query: "is there a shipping fee for mail order", hint: "Returns clean approved answer citing v1." },
    ],
  },
  {
    title: "Change propagation (P0-3)",
    say: "Publishing notifies all subscriber channels and invalidates caches in real-time.",
    actions: [
      { label: "1. Platform feed", person: "Nitin", to: "/platform", hint: "Inspect change propagation feed showing Agent Assist, Member Chat, and Voice subscribers." },
      { label: "2. Immediate re-search", person: "Priya", to: "/", context: CTX, query: "how many days supply by mail", hint: "Serves latest published version without server restart." },
    ],
  },
  { title: "Verbatim", say: "Legal wording is stored and inserted, never generated.", actions: [{ person: "Priya", to: "/", context: CTX, query: "pricing disclaimer" }] },
  {
    title: "Permissions",
    say: "Permissions apply before retrieval; the member gets plain text only.",
    actions: [
      { label: "Go: Marcus", person: "Marcus", to: "/", context: CTX, query: "pricing disclaimer" },
      { label: "Then: Eleanor", person: "Eleanor", to: "/", context: CTX, query: "pricing disclaimer" },
    ],
  },
  { title: "Safety", say: "Urgent language goes to a person before anything else.", actions: [{ person: "Eleanor", to: "/", context: CTX, query: "I have chest pain, can you rush my heart pills" }] },
  {
    title: "How truth is made",
    say: "A model extracts, people decide, a gate checks regressions.",
    actions: [
      { label: "Go: Dana", person: "Dana", to: "/work", hint: "Pick \"AEP contact-center script 2027\", Extract, select the changes, then Propose selected." },
      { label: "Then: Rita", person: "Rita", to: "/legal" },
    ],
  },
  { title: "Defensible", say: "Six-year replay: what was shown, which version, who approved.", actions: [{ person: "Casey", to: "/audit", replay: "disagreement" }] },
  { title: "Honest evals", say: "Real numbers, including what still fails.", actions: [{ person: "Nitin", to: "/evals" }] },
  { title: "Platform", say: "Same rules for REST, MCP and every downstream product.", actions: [{ person: "Nitin", to: "/platform" }] },
];
