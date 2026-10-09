# Lovable prompts v3: one story, problem to solution

Replaces the persona parts of L1 to L4 in `LOVABLE_PROMPTS.md` (those are v2: 3 personas, hard-coded). The rights policy is `src/data/personas.json` and the screen detail is `UI_SPEC.md`. These prompts add what the spec lacks: **a single demo story that runs across screens, shared state between people, and a guide rail that drives it.**

How to run: one prompt per message, in order. Test each before the next. No tweak prompts (they cost credits); list tweaks and we fix them in Claude Code.

## The story (about 9 minutes live, every step is one click in the guide rail)

| # | Beat | Person | Screen | What the room should take away |
|---|---|---|---|---|
| 1 | Problem: same question, three channels, three answers | none (intro) | `/story` | Knowledge drifts per channel; AEP opens in days |
| 2 | One question, one approved answer, everywhere | Priya | `/` | Typed outcomes; the answer is the unit, not a guess |
| 3 | The truth is year specific | Priya | `/` | Plan year toggle 2026 to 2027 changes the answer (90 to 84 days) |
| 4 | When sources disagree, Verity refuses to pick | Priya | `/` | Conflict, both owners notified |
| 5 | Legal wording is never generated | Priya | `/` | Verbatim, read before benefits, copy exact |
| 6 | Permissions before retrieval | Marcus, then Eleanor | `/` | Not authorized names the owner; member sees plain text only |
| 7 | Safety first | Eleanor | `/` | Chest pain escalates to a person |
| 8 | How the truth gets made | Dana, then Rita | `/work`, `/legal` | Upload, flag near-duplicate, propose, Legal decides, gate, live |
| 9 | Proof it is live | Priya | `/` | The new wording now answers, with version and approver |
| 10 | Can we defend it | Casey | `/audit` | Replay beat 4 by request id, as-of lookup |
| 11 | Does it work, honestly | Nitin | `/evals` | Real numbers including failures and open items |
| 12 | Platform vision | Nitin or Lee | `/platform`, `/agents`, `/health` | Same rules for agents (MCP); consumer map; roadmap labeled |

Dana is the author (in `personas.json`). Alex in the data is the access administrator, so do not narrate "Alex" as the author.

---

## P0. Replace hard-coded personas with the policy file (send this first, instead of or after L1)

```
Refactor persona handling. Do not change the visual theme.

1. Import src/data/personas.json (I have added it; do not retype or edit it). Remove every hard-coded persona list. The header "Signed in as" picker lists the 14 people in personas.json "people", grouped Consumers / Authors and approvers / Governance, showing name, persona label and scope chips (for example KB-PHARM). Default person: Priya.
2. Navigation, home route and buttons are computed from the signed-in person's capabilities and scope using "views" in personas.json. Never write "if persona is legal". Routes a person lacks show a Denied component that names the missing capability and says "This attempt is recorded in the audit log".
3. Add an "Acting as" bar under the header: "You are Rita, Legal and Medicare Compliance approver. You can: [up to 6 capability chips] + N more" with a link to /rights.
4. Add a shared in-memory demo store, src/services/demoStore.ts (a React context plus module-level state, NOT per person). It holds: requests (id, query, person, context, outcome, trace, cited units with version and approver), drafts, units (with versions), audit events, review tasks, feedback. Switching person must NEVER reset it. Add a "Reset demo" button in the footer that restores the fixtures.
5. Every service function (search, listUnits, extractSource, proposeDraft, decideDraft, replay, asOf, ...) reads and writes demoStore. Keep all fixtures in src/services/mockData.ts behind the same function signatures so the real engine can replace them later.
6. Member persona forces Member chat. Footer on every page: "Concept prototype by Nitin Gupta · Synthetic data · Not a Humana product".
```

## P1. Ask, upgraded (plan year, trust, verbatim gate, next step)

```
Upgrade the Ask page for advocates and supervisor (UI_SPEC section 2.1). Keep the outcome-is-the-interface design.

Sticky call-context bar: Line of business (MAPD, PDP), State (blank = unknown, KY, FL, OH), and a Plan year toggle "2026 | 2027" (default 2026) with an "AEP opens Oct 15" chip. Changing any of them re-runs the last search. Hint: "Answers apply to this context".

Every answer card shows: outcome badge, a trust badge (Approved with check, Stale grey, Conflict purple), the text, citation chips (title, version, effective date) that open a Unit drawer (owner, verifier, review date, applies to, channels). Verbatim text: bordered box "READ EXACTLY AS WRITTEN" with Copy, lock icon, not editable. If a unit is flagged read-before-benefits, pin it above the answer as a step: "Read before discussing benefits" with a checkbox "I read this"; until it is ticked, benefit answers below show a held banner "Held until the disclosure is read" and the checkbox writes a read event to the demo store. Add a one-line note: "Recorded attestation. Speech analytics on recordings is the production control."
Refusals get a Next step box (what to say, who to transfer to). Conflict shows both approved texts side by side, never highlighting one. needs_clarification shows choice chips (for example "2026" "2027", state buttons), not free text.
Feedback row: thumbs up, thumbs down, "Flag this answer" (reason dialog) which adds a review task visible to the unit owner (Owen or Olivia) in the demo store.
Show the request id as a small copyable chip under every response ("req-..."), because the auditor will replay it later.
Trace drawer and Channel compare appear only if the person holds view_trace / view_channel_compare.

Fixtures (key on keywords; context matters):
- "days supply" / "how many days" + year 2026 -> conflict between U-PH-007 (90 days, Pharmacy Ops) and U-PH-107 (100 days, legacy, Outbound Pharmacy). Message "Two approved sources disagree. Both shown; routed to owners."
- "days supply" + year 2027 -> answer U-PH-207: "Maintenance supply by mail is 84 days." (Pharmacy Ops, effective 2027-01-01). 2027 delivery: "6 to 9 business days after the prescription is received."
- plan year unknown (user clears it) on "days supply" -> needs_clarification "Which plan year: 2026 or 2027?" with chips.
- "mail order delivery" year 2026 -> "7 to 10 business days after the prescription is received" (U-PH-006).
- "pricing disclaimer" as Priya or Eleanor -> verbatim U-PH-003: "The prices I share today are estimates based on your current plan and may change. Your final cost will be confirmed when your prescription is processed." As Marcus -> not_authorized, owner Compliance (KB-PHARM), Next step "Transfer to Pharmacy".
- "closing" -> verbatim U-SH-002 "Your decision today has no impact on your plan membership. Is there anything else I can help you with today?"
- "shipping fee" -> stale, past review date 2026-06-30, never styled as normal.
- "copay assistance" no state -> needs_clarification (state chips); KY -> answer U-PH-010; other state -> insufficient_evidence "Approved content exists but does not apply here".
- "chest pain" -> safety_escalation, full-width, "Connect to a person now".
- "luminexa copay" -> insufficient_evidence "The approved unit gives the tier but does not state a copay." (shows the engine refuses to infer).
- anything else -> insufficient_evidence + "Gap logged".
Each saves a request into the demo store with a 13-step trace like "7. Eligibility [D]: ..." (tags D, P, H, D+P).
```

## P2. The problem screen and the guide rail (the seamless part)

```
Add two things.

A) Route /story, "Why this exists" (no sign-in needed, uses the plain header). Title "Same question, three answers". A synthetic 3-column card set labelled "Illustrative, synthetic": the question "How long does mail order take?" asked through Phone IVR script, Web chat bot, and Agent cheat sheet. Answers: "5 to 7 days" (IVR, last edited 2024), "Up to 2 weeks" (chat bot, no source), "7 to 10 business days" (agent sheet, review date passed). Under them, three red-bordered facts as tiles: "Annual Election Period opens Oct 15, 2026", "2027 content differs from 2026 content", "Legal wording must be read exactly". One primary button: "See what Verity does" which starts the guide at step 2.

B) A Demo guide rail, toggled by a small "Guide" button in the header (and the key "g"), docked on the right, 320px, collapsible. It holds 12 steps from this table. Each step has: number, title, a one-sentence "Say:" talk track, and a primary button "Go" that (1) signs in as the listed person, (2) navigates to the route, (3) sets the context, (4) pre-fills and auto-submits the query where one is given. Arrow keys move between steps; the current step is highlighted; Back and Next buttons; "Reset demo" restores fixtures.
1 Problem: /story. Say: "Three channels, three answers, and open enrollment opens in days."
2 One approved answer: Priya, /, context MAPD KY 2026, query "how long does mail order take". Say: "One approved unit, cited with version and owner."
3 Year specific: Priya, /, query "how many days supply by mail", toggle to 2027 after the first result. Say: "Same question, the year changes the truth."
4 Disagreement: Priya, /, query "how many days supply by mail", plan year 2026. Say: "Two approved sources disagree. Verity will not pick."
5 Verbatim: Priya, /, query "pricing disclaimer". Say: "Legal wording is stored and inserted, never generated."
6 Permissions: Marcus, /, query "pricing disclaimer"; then Eleanor, same query. Say: "Permissions apply before retrieval; the member gets plain text only."
7 Safety: Eleanor, /, query "I have chest pain, can you rush my heart pills". Say: "Urgent language goes to a person before anything else."
8 How truth is made: Dana, /work, source "AEP script 2027" then extract; then Rita, /legal. Say: "A model extracts, people decide, a gate checks regressions."
9 It is live: Priya, /, query "how many days supply by mail" with 2027. Say: "The approved change is live in every channel, with version and approver."
10 Defensible: Casey, /audit, replay the request id recorded in step 4. Say: "Six-year replay: what was shown, which version, who approved."
11 Honest evals: Nitin, /evals. Say: "Real numbers, including what still fails."
12 Platform: Nitin, /platform. Say: "Same rules for REST, MCP and every downstream product."
The talk track text must be editable in src/data/guide.ts. Only show the rail when toggled; the rest of the app must work without it.
```

## P3. Author to Legal to live (shared state, the proof beat)

```
Build the authoring chain so that one action in one person's session shows up in the next person's session, using the demo store.

DANA (/work, tabs Sources, My drafts, Gaps, Insights): pick the sample "AEP contact-center script 2027" (SYN-AEP-2027) or paste text; Extract. Show candidates in a table with status chips (Unchanged, Changed: flagged, New unit), a word-level diff for changes, merge and split suggestions, and "Route: Needs Legal / Needs owner". Fixture results:
- Opening statement: Unchanged vs U-SH-001, verbatim exact.
- Legacy pricing disclaimer ("The prices I give you today are estimates based on your current plan and might change. Your final cost will be confirmed once your prescription is processed."): "Changed: flagged", near-duplicate of U-PH-003 (similarity 0.67), route Legal, banner "Any change to verbatim is flagged. A model may raise priority but never clears a flag."
- Fragments A and B ("Your request will affect / will not affect your plan enrollment"): both exact, banner "Conflict note: two verbatim units disagree. Escalate."
- "Maintenance supply 84 days, delivery 6 to 9 business days" for 2027: Changed vs U-PH-207, with near-duplicate U-PH-204 also listed as a possible duplicate, route owner (Pharmacy Ops), tag suggestion plan year 2027.
- Outdated Saturday delivery paragraph: Changed with note "Stale: review expired 2026-09-30".
- Coaching and editor notes: listed as skipped with the reason.
Actions: "Propose selected" creates drafts (never approve; authors have no Approve button; show "A second person approves"). My drafts shows a lifecycle timeline (Proposed, In review, Approved and published, Rejected) and who it waits on.

RITA (/legal): tabs To decide, Verbatim vault, Decided. Each draft: side-by-side diff (current approved vs proposed), Impact panel from the publication gate ("checked 27 cases, 0 blocking" or a blocking list with was and now), Edit wording (Legal only), Approve and Reject (reason required). Approving the 2027 days-supply draft publishes U-PH-207 v2 into the demo store with approver "Rita", effective date, and adds an audit event; the legacy disclaimer draft should show gate result "Blocked: contradicts approved U-PH-003" so the room sees a block, then Rita rejects it with a reason.
Disabled buttons always show the reason ("You proposed this: a second person must decide", "Needs Legal: verbatim wording").

OWEN (/review): ranked table (Stale, Conflict, Flagged, Gap, AEP 2027 pending, Change notice) with demand, due date, verifier and a Re-verify action; an AEP readiness bar that moves when Rita publishes.
After Rita publishes, Priya's Ask for "how many days supply by mail" in 2027 must return the new version with "v2 · approved by Rita · effective ..." in the Unit drawer.
```

## P4. Audit, rights, replay

```
Build /audit for the auditor (Casey), read only, no action buttons. Events table with filters (actor, action, unit, date); denied events highlighted with capability and reason. Answer replay: select or paste a request id (the ones in the demo store, including the one from step 4 of the guide). Show redacted query, person, context (line of business, state, plan year), the 13-step trace, each cited unit with version and approver, outcome, and which policy path decided. As-of lookup: unit id plus date returns the version live then, approver and effective window. Note: "All versions and records kept at least 6 years (design assumption). Prototype storage is not tamper-evident; production uses write-once storage."
Build /rights for everyone: matrix of personas (rows, grouped) by capabilities (columns, grouped Search, Author, Approve, Govern) generated from personas.json, signed-in row highlighted; the never_together separation-of-duties rules; a click on a persona opens Who, Goal, Cannot see, and "What happens when they try". Build /access for Alex (access administrator): roles by knowledge bases matrix with toggles, a dialog needing a reason, an audit event created, and the banner "The last access administrator and the last Legal approver cannot be removed". Alex sees no unit text anywhere.
```

## P5. Evals, Agents, Health, Platform (evidence and vision)

```
Replace src/data/evals.ts with these real numbers (synthetic data; smoke tests, not a launch gate) and rebuild /evals from them:
- Golden set (27 cases, written while building): 96.3% cases correct, 0 critical, release gates PASS, 1 open failure (G17).
- Blind set (30 cases written by an agent that never saw the engine): first run 39.4%, now 51.5% outcome accuracy, 5 critical failures still open. Label it "Honest generalization score".
- Hold-out set 1 (15 cases): 66.7%, 2 critical open.
- AEP hold-out (30 cases from a different AI, written for the 2027 script): first run 66.7%, now 93.3%, 0 critical. Note "Fixed cases are no longer blind; a fresh hold-out is needed."
- Tiles: 0 permission leaks, 0 retired units served, verbatim exact on every verbatim case.
- Bar chart (recharts): Golden 96.3, Blind first 39.4, Blind now 51.5, Hold-out 66.7, AEP first 66.7, AEP now 93.3.
- Release gate panel with five checks (zero critical on golden, zero permission leaks, verbatim 100%, zero retired exposure, drift flag recall 100%).
- Failure log table F01 to F17 with symptom and status; open ones: G17, F05, F12 (conversational phrasing defeats the keyword gate), F13 (stale unit dropped silently), F14 (paraphrase of a restricted title), F16 (duplicate approved units). Use the labels Fixed or Open; never hide an Open.

/agents (AI product owner and Agent Assist): "Same rules for agents (MCP)". Four tool cards (search_knowledge, get_unit, report_gap, list_changes), a connections table (principal, bound role, persona ai_agent, last call), a call log (time, REST or MCP, principal, role, tool, outcome) that also lists every search made in the demo store, and the note "The agent's role comes from its connection, never from a tool argument. Agents read and propose, never decide. PHI is redacted before anything is logged."

/health (Lee, leadership): tiles all labelled "Illustrative": verbatim compliance on recorded calls, cross-channel consistency, AEP readiness (reads from the demo store), oldest unclaimed gap, review time per unit, unanswered rate. Aggregates only, no unit text or queries.

/platform (everyone): one page, three stacked diagrams drawn in SVG with the theme colors:
1. Consumer map: Verity at the center; spokes Phase 1 Agent Assist (thickest), Phase 2 Prior Authorization and Payment Integrity, Phase 3 HEDIS, Risk Adjustment, Clinical interventions. Footer line "Verity decides what is true and applicable. Each product decides what to do with it."
2. The 13-step runtime with steps 7 to 9 shaded "deterministic, before any generation" and model steps tagged P.
3. Built vs Roadmap legend: Built (engine, REST, MCP, personas, drift, evals) in green; Roadmap (write-once audit storage, multi-region availability, edge PHI tokenization, token exchange for agent feedback, separate admin listener, emergency publication exception) in grey with a dashed border.
```

## Acceptance (do this once after P5, before the deck is final)

1. Run the guide rail steps 1 to 12 without touching the keyboard except Go and Next. Nothing may show an empty state or a stale fixture.
2. Step 4 request id replays in step 10.
3. Step 8 publish changes the step 9 answer to v2 approved by Rita.
4. Marcus, Eleanor and Casey never see Approve, owner names (member), or unit text (Alex).
5. Every number on Health says Illustrative. Evals shows the open failures.
