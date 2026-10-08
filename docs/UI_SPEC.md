# Verity UI spec (for Lovable and for review)

Version 1, 2026-10-08. Source of truth for the persona-based UI. Companion: `PRD.md`, `ARCHITECTURE.md`, `CAPABILITY_MAP.md`, `src/data/personas.json` (the rights policy; import it, do not retype it).

## 0. Working rules (read first)

1. **Lovable owns:** `src/routes/**`, `src/components/**`, `src/styles.css`, `src/lib/session.tsx`, `src/services/mockData.ts`, `src/services/*.ts` type files.
2. **Do not touch:** `src/verity-engine/**` and `src/services/*.functions.ts`. The engine owner wires these later. Build every screen against typed fixtures in `src/services/mockData.ts`, behind the existing service functions, so swapping to the real server calls changes no screen.
3. Rights come from `src/data/personas.json` only. Navigation, buttons and pages are computed from the acting person's capabilities and scope. Never hard-code "if persona is legal".
4. Every outcome and status uses **color + icon + text label**. Use the existing Humana-inspired tokens in `src/styles.css`. No real Humana logos or member data. Keep the footer "Concept prototype by Nitin Gupta, synthetic data, not a Humana product".
5. Every screen has loading, empty, error and **denied** states. A denied state names the missing capability and says "This attempt is recorded in the audit log".
6. Accessibility: keyboard reachable, visible focus, minimum 16px body text, 4.5:1 contrast, screen-reader labels. Responsive down to tablet width; member chat works on phone width.

## 1. App shell

- **Header:** logo, "Verity", a persona picker (a "Signed in as" control, grouped Consumers / Authors and approvers / Governance), showing person name, persona label (Humana-flavoured label from the context doc) and scope chips (for example `KB-PHARM`, `KB-SHARED`).
- **Persona picker content:** the 14 demo people in `personas.json` (`people`). Changing person changes the whole app: home route, navigation, available actions.
- **Navigation:** built from `views` in `personas.json`: show an item only if the person holds one of the view's capabilities. Order and labels below.
- **Acting-as bar** under the header: "You are Rita, Legal and Medicare Compliance approver. You can: [chips of up to 6 capabilities] + N more" with a "See all rights" link to `/rights`.
- **AEP banner** (all staff and advocate personas): "Annual Election Period opens Oct 15, 2026. Plan year 2027 content: 38 of 51 units approved" (fixture numbers, labelled illustrative).
- **Denied page component** `Denied({capability, reason})`: used by every route guard.

| Route | Label | Views (capability) |
|---|---|---|
| `/` | Ask | `ask` (search) |
| `/work` | My work | `author_ingest` (ingest_source) |
| `/review` | Needs my review | `author_queue`, `author_owner` (view_review_queue, view_owner_queue) |
| `/legal` | Legal queue | shown when person holds `approve_legal` |
| `/access` | Access | `author_access` (manage_access, view_access_matrix) |
| `/audit` | Audit | `author_audit` (view_audit) |
| `/evals` | Evals | `evals` (view_evals) |
| `/agents` | Agents | `agents` (manage_agents, view_call_log) |
| `/health` | Health | `analytics` (view_analytics) |
| `/rights` | Rights | everyone |

**Home route per persona:** advocates, supervisor, member and agent landing: `/` (agent: `/agents` read-only tool view); author: `/work`; owner: `/review`; Legal: `/legal`; access admin: `/access`; auditor: `/audit`; product owner: `/evals`; leadership: `/health`.

## 2. Screens

### 2.1 Ask (advocates and supervisor) `/`
Inspired by Amazon Q in Connect, Verint, Guru.
- **Call context bar** (sticky): Line of business (MAPD, PDP), State (select), **Plan year toggle `2026 | 2027`** with an AEP chip. Changing it re-runs the last search. A hint: "Answers apply to this context".
- **Search bar** with example chips (acronyms, misspellings, speech-style: "rx pricing disclaimer", "how long does mail order take", "ID card replacement").
- **Answer card:** outcome badge + **trust badge** (Approved green check, Stale grey, Conflict amber); answer text; citation chips (unit title, version, effective date) that open the **Unit drawer**.
- **Verbatim block** when `verbatim=true`: bordered, labelled "Read exactly as written", with a **Copy** button. If `mustReadBeforeBenefits`, pin it above the answer as a checklist step: "Read before discussing benefits" with a checkbox "I read this" (records a read event; fixture only).
- **Refusal states** (insufficient_evidence, not_authorized, stale, conflict, safety_escalation): the existing explanation plus a prominent **Next step** box (what to say, who to transfer to). For conflict, show both approved texts side by side, never pick one.
- **needs_clarification:** the question as **choice chips** (for example state buttons), not free text.
- **Feedback row:** thumbs up, thumbs down, **Flag this answer** (reason dialog). A flag shows "Sent to the unit owner (Pharmacy Ops)".
- **Browse** side panel: knowledge bases and categories listing unit titles within entitlement (not_authorized ones hidden).
- **Trace drawer** and **Channel compare** only when the person holds `view_trace` and `view_channel_compare`. Plain advocates never see them.
- **Supervisor extras:** "Escalations from my team" list (fixture): flagged and unanswered items with an "Open in trace" action.

### 2.2 Member chat (member persona) `/`
- A chat layout, not a dashboard. Large friendly text; **Text size** toggle (A, A+, A++); voice button; plain-language answers.
- Citations show **title and date only**. No unit ids, versions, owners, trace, or internal next steps.
- A **Talk to a person** button is always visible. Unanswerable and restricted questions say so kindly and offer a call-back or an advocate.
- Show a small "Answers come from plan-approved information" note.

### 2.3 My work (author) `/work`
Inspired by Guru Card Manager and Salesforce Knowledge lifecycle.
- Tabs: **Sources**, **My drafts**, **Gaps**, **Insights**.
- **Sources:** pick a sample document or paste text, then **Extract**. Show candidates in a table with status chips (Unchanged, Changed: flagged, New unit), the word-level diff for changes, merge and split suggestions, and "Route: Needs Legal / Needs owner". Action: **Propose selected** (never approve).
- **My drafts:** each draft with a **lifecycle timeline** (Proposed, In review with Owner or Legal, Approved and published, or Rejected with reason) and who it is waiting on.
- **Gaps:** clusters with demand, age (days), suggested owner, claim button, "Propose unit" dialog.
- **Insights:** outcomes mix, unanswered rate, top gaps.
- Out-of-scope candidates show "belongs to a knowledge base outside your scope".
- Approve buttons are **not shown** to authors; a short note says "A second person approves".

### 2.4 Needs my review (owner) `/review`
Inspired by Guru My Tasks and ServiceNow knowledge manager.
- KPI tiles: Open items, Overdue reviews, **AEP readiness** progress bar (2027 units approved vs needed).
- **Ranked table** (default sort: demand): type (Stale, Conflict, Flagged, Gap, AEP 2027 pending, Change notice), unit, owner, **demand** (asks), due date, **verifier**, status, actions (Re-verify, Claim, Draft revision, Open).
- **Pending approvals** section for non-legal drafts in the owner's knowledge base: diff, golden-set impact chip (Safe to publish / Blocked), **Approve** and **Reject**. Disabled buttons show the reason from the engine (for example "You proposed this: a second person must decide", "Needs Legal: verbatim wording").
- **Change notice** button: form (kind, summary, effective date, plan year, terms) that lists affected units and creates tasks (fixture).

### 2.5 Legal queue (Legal and Medicare Compliance) `/legal`
- Tabs: **To decide**, **Verbatim vault**, **Decided**.
- **To decide:** card per draft with a **side-by-side diff** (current approved vs proposed) and word chips; **Impact** panel from the publication gate (checked N cases, blocking cases listed with was/now); **Edit wording** text area (Legal only); **Approve** (runs the gate; if blocked, show reasons and keep the draft pending), **Reject** (reason required).
- **Verbatim vault:** every verbatim unit with version, approver, review date, "must read before benefits" flag, Spanish variant status (Current / Translation out of date), and channels using it.
- Legal cannot ingest or propose; no such buttons.

### 2.6 Access (access administrator) `/access`
Inspired by Glean admin tiers and ServiceNow user criteria.
- **Matrix** roles by knowledge bases with toggles. Non-admins (auditor, product owner) see it read-only.
- Change opens a dialog requiring a **named person (the signed-in person, not typed)** and a **reason**. Show the audit event created.
- **Guard banner:** "The last access administrator and the last Legal approver cannot be removed."
- **People and personas** table (read-only): person, persona, scope, status.
- This persona sees **no unit text** anywhere; show the note "Access administrators manage who can read, not what is written".

### 2.7 Audit (auditor) `/audit`
- **Events** table with filters (actor, action, unit, date). `denied` events are highlighted with the capability and reason.
- **Answer replay:** enter or pick a request id. Show: redacted query, persona, context (lob, state, plan year), the 13-step trace, each cited unit with **version and approver**, outcome, and which policy path decided.
- **As-of lookup:** unit id + date shows the version live on that date, its approver and effective window. Note: "All versions and records kept at least 6 years (design assumption)".
- Read only: no action buttons anywhere.

### 2.8 Evals `/evals` and Agents `/agents` (AI product owner)
Keep the existing pages. Add to Agents: a table of connections (principal, bound role, persona ai_agent, last call), and a note "Agents can read and propose, never decide". Evals keeps release gates visible.

### 2.9 Health (leadership) `/health`
- Tiles, each labelled **Illustrative**: Verbatim compliance on recorded calls, Cross-channel consistency, AEP readiness, Oldest unclaimed gap (days), Review time per unit, Unanswered rate.
- Two charts (line for consistency over weeks, bar for AEP readiness by owner team). Aggregates only; no unit text, no query text, no table of individual items.

### 2.10 Rights `/rights` (everyone)
- Matrix: personas (rows, grouped) by capabilities (columns, grouped Search, Author, Approve, Govern). Cell = check. Highlight the signed-in persona's row.
- **Separation-of-duties rules** list from `never_together`, plus "Nobody decides a draft they proposed" and "Agents and models read and propose, never decide".
- Click a persona: panel with Who, Goal, Cannot see, and "What happens when they try" (denied example).

## 3. Data contracts (fixtures now, real calls later)

```ts
export interface Me { name: string; persona: string; capabilities: string[]; scope: string[]; views: string[] }
export type Trust = 'approved' | 'stale' | 'conflict';
export interface Citation { unitId?: string; version?: number; title: string; effectiveDate: string; owner?: string; verbatim?: boolean; trust: Trust }
export interface Part { part: string; outcome: Outcome; text: string | null; message: string; nextStep: string | null; ownerTeam: string | null; mustReadBeforeBenefits: boolean; citations: Citation[] }
export interface SearchContext { lob: string | null; state: string | null; planYear: 2026 | 2027 }
export interface ReviewTask { id: string; kind: 'stale'|'conflict'|'flagged'|'gap'|'aep_2027'|'change_notice'; unitId: string; title: string; owner: string; demand: number; due: string; verifier: string; status: 'open'|'claimed'|'done' }
export interface DraftRow { draftId: string; unitId: string; title: string; kind: string; routeTo: 'Legal'|'Author'; proposedBy: string; status: string; canDecide: boolean; whyNot: string | null; diff: string[]; impact: { allowed: boolean; checked: number; blocking: { caseId: string; query: string; was: string; now: string }[] } }
export interface ReplayRecord { requestId: string; query: string; persona: string; context: SearchContext; trace: string[]; units: { unitId: string; version: number; approver: string; effective: string }[]; outcome: Outcome }
export interface AsOfResult { unitId: string; asOf: string; version: number; approver: string; effectiveFrom: string; effectiveTo: string | null }
export interface Health { verbatimCompliance: number; consistency: number; aepReady: { done: number; needed: number; byOwner: { owner: string; done: number; needed: number }[] }; oldestGapDays: number; reviewHoursPerUnit: number; unansweredRate: number }
```

Fixture content must include: a 2026 and a 2027 version of "Days supply by mail"; a verbatim unit flagged "read before benefits"; a stale unit; a conflict pair; a Spanish variant marked "Translation out of date"; a Legal draft that the publication gate blocks; a draft the signed-in person proposed (to show the maker-checker reason); a denied audit event.

## 4. Acceptance checks

1. Switching person changes home route, navigation and available buttons with no reload.
2. Each of the 14 people sees only their views; opening another route directly shows the Denied page.
3. Member chat never shows ids, versions, owners, trace or internal next steps.
4. An author never sees Approve; an owner never sees Approve on verbatim; Legal never sees Ingest.
5. The Rights page matches `personas.json` exactly.
6. Every number on Health is labelled Illustrative.
