// Demo guide script. Edit titles and "Say:" talk tracks freely here.
export type GuideRoute = "/" | "/story" | "/work" | "/legal" | "/audit" | "/evals" | "/platform";

export interface GuideAction {
  /** Button label when a step has more than one part. */
  label?: string;
  /** Person name from src/data/personas.json. Omit to keep the current person. */
  person?: string;
  to: GuideRoute;
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
  { title: "Disagreement", say: "Two approved sources disagree. Verity will not pick.", actions: [{ person: "Priya", to: "/", context: CTX, query: "how many days supply by mail", record: "disagreement" }] },
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
      { label: "Go: Dana", person: "Dana", to: "/work", hint: "Choose the source \"AEP script 2027\", then Extract." },
      { label: "Then: Rita", person: "Rita", to: "/legal" },
    ],
  },
  { title: "It is live", say: "The approved change is live in every channel, with version and approver.", actions: [{ person: "Priya", to: "/", context: { ...CTX, planYear: "2027" }, query: "how many days supply by mail" }] },
  { title: "Defensible", say: "Six-year replay: what was shown, which version, who approved.", actions: [{ person: "Casey", to: "/audit", replay: "disagreement" }] },
  { title: "Honest evals", say: "Real numbers, including what still fails.", actions: [{ person: "Nitin", to: "/evals" }] },
  { title: "Platform", say: "Same rules for REST, MCP and every downstream product.", actions: [{ person: "Nitin", to: "/platform" }] },
];
