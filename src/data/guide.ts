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
  {
    title: "One approved answer",
    say: "One approved unit, cited with version and owner.",
    actions: [{ person: "Priya", to: "/", context: CTX, query: "how long does mail order take", hint: "Certified 7 to 10 day delivery window returned with full provenance (U-PH-006 v1)." }],
  },
  {
    title: "Year specific",
    say: "Same question, the year changes the truth.",
    actions: [{ person: "Priya", to: "/", context: CTX, query: "how many days supply by mail", thenPlanYear: "2027", hint: "Plan year partition switches automatically from 2026 (90-day policy) to 2027 (84-day policy)." }],
  },
  {
    title: "Cite-or-decline (S03)",
    say: "Unsupported questions produce genuine abstention and log a gap. Never hallucinate from memory.",
    actions: [
      { label: "1. Genuine abstention", person: "Priya", to: "/", context: CTX, query: "what is the dental allowance for dental implants", hint: "Verity returns insufficient_evidence with human recovery script; zero hallucinated text." },
      { label: "2. Author gap queue", person: "Dana", to: "/work", hint: "Knowledge authoring workspace surfaces the newly logged gap in the queue." },
    ],
  },
  {
    title: "Applicability (S05)",
    say: "Relevance is not applicability. Verity asks for missing state context before answering.",
    actions: [
      { label: "1. Missing state context", person: "Priya", to: "/", context: { lob: "MAPD", state: "", planYear: "2026" }, query: "is there a copay assistance program", hint: "Kentucky copay pilot exists but state is unassigned: prompts with choice chips." },
      { label: "2. Kentucky (In-scope)", person: "Priya", to: "/", context: { lob: "MAPD", state: "KY", planYear: "2026" }, query: "is there a copay assistance program", hint: "Returns approved Kentucky copay assistance pilot unit (U-PH-010)." },
      { label: "3. Florida (Out-of-scope)", person: "Priya", to: "/", context: { lob: "MAPD", state: "FL", planYear: "2026" }, query: "is there a copay assistance program", hint: "Declines: relevant content exists but does not apply to Florida." },
    ],
  },
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
  {
    title: "Verbatim lock (S07)",
    say: "Legal wording is stored and inserted, never generated.",
    actions: [{ person: "Priya", to: "/", context: CTX, query: "pricing disclaimer", hint: "Mandatory verbatim disclosure returned exactly as approved by Legal." }],
  },
  {
    title: "Permissions & Role scoping (S02)",
    say: "Permissions apply before retrieval; no cross-domain leakage.",
    actions: [
      { label: "1. Marcus (Insurance)", person: "Marcus", to: "/", context: CTX, query: "pricing disclaimer", hint: "Insurance advocate blocked from Pharmacy KB (KB-PHARM); routes without leaking text." },
      { label: "2. Priya (Pharmacy)", person: "Priya", to: "/", context: CTX, query: "pricing disclaimer", hint: "Pharmacy advocate receives certified legal disclosure with citations." },
    ],
  },
  {
    title: "Multi-channel consistency (S09)",
    say: "Advocate Assist and Member Chat serve the exact same governed unit ID without drift.",
    actions: [
      { label: "1. Advocate View", person: "Priya", to: "/", context: CTX, query: "how long does mail order take", hint: "Advocate view receives full citations, unit ID, and operational metadata." },
      { label: "2. Member Chat", person: "Eleanor", to: "/", context: CTX, query: "how long does mail order take", hint: "Member chat receives plain-language text citing the identical unit U-PH-006." },
    ],
  },
  {
    title: "Safety escalation (S10)",
    say: "Urgent language goes to a person before anything else.",
    actions: [{ person: "Eleanor", to: "/", context: CTX, query: "I have chest pain, can you rush my heart pills", hint: "Safety pre-check catches crisis keywords at Step 3; immediate 911 human handoff." }],
  },
  {
    title: "How truth is made (S06)",
    say: "A model extracts, people decide, a gate checks regressions.",
    actions: [
      { label: "1. Dana extracts", person: "Dana", to: "/work", hint: "Pick 'AEP contact-center script 2027', Extract, select the changes, then Propose selected." },
      { label: "2. Rita decides", person: "Rita", to: "/legal", hint: "Maker-checker prevents Dana from self-approving; Legal reviewer decides and publishes." },
    ],
  },
  {
    title: "Defensible",
    say: "Six-year replay: what was shown, which version, who approved.",
    actions: [{ person: "Casey", to: "/audit", replay: "disagreement", hint: "Full cryptographic audit replay of the exact dispute with inputs and trace." }],
  },
  {
    title: "Honest evals (S11)",
    say: "Real numbers, including what still fails.",
    actions: [{ person: "Nitin", to: "/evals", hint: "Golden evaluation set, failure taxonomy, and blind holdout certification gate." }],
  },
  {
    title: "Platform (13-step runtime)",
    say: "Same rules for REST, MCP and every downstream product.",
    actions: [{ person: "Nitin", to: "/platform", hint: "The 13-step serving pipeline and OpenAPI/MCP contracts." }],
  },
];
