# Verity personas, rights and screens

Status: 2026-10-08. Source of truth: `data/personas.json` (this page is generated from it by hand; if they differ, the file wins). Companion: `PRD.md` section 4 and 5, `UI_SPEC.md` (screens), `api/openapi.yaml`.

## How rights work

- A right is a **capability** (what) plus a **scope** (which knowledge bases). 31 capabilities.
- **Separation of duties** (never held by one persona): manage_access + approve_standard; manage_access + approve_legal; manage_access + ingest_source; approve_legal + ingest_source; run_evals + approve_legal.
- **Maker-checker**: nobody decides a draft they proposed.
- **Agents and models** may only ever hold: search, get_unit, list_changes, report_gap. They read and propose, never decide, whatever persona they claim.
- **Guard rail**: the last holder of `approve_legal` and of `manage_access` cannot be removed.
- **Every denial is an audit event.** The UI offers only what a persona may do and explains disabled actions.
- **Views** (pages) are derived from capabilities, so the UI, REST and MCP cannot disagree.

## The twelve personas

### Consumers

#### Pharmacy advocate (`pharmacy_advocate`)

- **Who:** Takes calls and chats about drugs, pharmacy benefits and prior authorization of medicines.
- **Goal:** Say the approved thing, quickly, with a citation, and know what to do when there is no answer.
- **Pages offered:** ask, units
- **Scope:** all, or the role entitlement
- **Answer detail:** standard
- **Cannot see:** Insurance knowledge base bodies, drafts, the audit log, other advocates' queries.
- **If they try:** Open the Author or Access pages: the pages are not offered and the API returns 403.
- **Rights:** search, get_unit, list_changes, report_gap, give_feedback

#### Insurance advocate (`insurance_advocate`)

- **Who:** Takes calls and chats about plan benefits, eligibility, claims and ID cards.
- **Goal:** Same as the pharmacy advocate, on the insurance knowledge base.
- **Pages offered:** ask, units
- **Scope:** all, or the role entitlement
- **Answer detail:** standard
- **Cannot see:** Pharmacy knowledge base bodies. A pharmacy question returns not_authorized plus the owning team.
- **If they try:** Same denials as the pharmacy advocate.
- **Rights:** search, get_unit, list_changes, report_gap, give_feedback

#### Advocate supervisor (`advocate_supervisor`)

- **Who:** Team lead who takes the escalation when an advocate gets conflict, stale or no answer.
- **Goal:** Unblock the advocate on the call, then make sure the gap reaches an owner.
- **Pages offered:** ask, units, author_insights
- **Scope:** all, or the role entitlement
- **Answer detail:** full
- **Cannot see:** Drafts, approvals, access and audit. Sees the reasoning trace but cannot change anything.
- **If they try:** Approve or edit a unit: denied.
- **Rights:** search, get_unit, list_changes, report_gap, view_trace, view_provenance, view_search_insights, give_feedback

#### Member (self-service) (`member_chat`)

- **Who:** A member asking in chat or by voice.
- **Goal:** A plain, correct answer, or a warm hand-off to a person. Never a wrong or internal one.
- **Pages offered:** ask
- **Scope:** all, or the role entitlement
- **Answer detail:** minimal
- **Cannot see:** Advocate-only units, unit ids, owner teams, internal next steps, trace, anything not marked for the member audience.
- **If they try:** A restricted question returns a hand-off, never the owner team or the unit title.
- **Rights:** search, report_gap, give_feedback

#### AI agent (downstream channel) (`ai_agent`)

- **Who:** Voice bot, chat assistant or Agent Assist calling Verity as a tool.
- **Goal:** Ground every answer in an approved unit and insert legal verbatim by reference.
- **Pages offered:** ask, units
- **Scope:** all, or the role entitlement
- **Answer detail:** standard
- **Cannot see:** Anything outside the role bound to its connection. The role is fixed on the connection, never an argument.
- **If they try:** Cannot hold any authoring, approval or access capability, whatever its configuration says.
- **Rights:** search, get_unit, list_changes, report_gap

### Authors and approvers

#### Knowledge author (Knowledge Ops) (`knowledge_author`)

- **Who:** Turns messy source documents into knowledge units and keeps them current.
- **Goal:** Get correct units reviewed fast, and close the gaps people actually ask about.
- **Pages offered:** units, author_ingest, author_queue, author_gaps, author_insights, change_notices
- **Scope:** assigned knowledge bases
- **Answer detail:** full
- **Cannot see:** Knowledge bases outside their write scope, access settings, other people's audit detail.
- **If they try:** Approve any unit, including their own: denied (maker-checker). Touch a verbatim unit: denied.
- **Rights:** ingest_source, create_change_notice, propose_unit, accept_merge_split, view_review_queue, view_gaps, claim_gap, view_search_insights, view_trace, view_channel_compare, view_provenance, get_unit

#### Knowledge owner (domain) (`knowledge_owner`)

- **Who:** Accountable for one domain's units, such as Pharmacy Ops or Member Services.
- **Goal:** Approve non-legal changes, clear stale and conflict items, own the backlog of gaps.
- **Pages offered:** units, author_queue, author_owner, author_gaps, author_insights, needs_review, change_notices
- **Scope:** assigned knowledge bases
- **Answer detail:** full
- **Cannot see:** Other domains' drafts. Legal-routed drafts are visible only as read-only context.
- **If they try:** Approve a verbatim or legal unit: denied. Approve a draft they proposed: denied.
- **Rights:** view_review_queue, approve_standard, create_change_notice, reverify_unit, view_owner_queue, resolve_owner_item, view_gaps, claim_gap, view_search_insights, view_trace, view_channel_compare, view_provenance, get_unit, accept_merge_split

#### Legal / Compliance approver (`legal_approver`)

- **Who:** Owns every word that must be said exactly.
- **Goal:** Approve, edit or reject verbatim and legal wording, seeing exactly what changed and what it would break.
- **Pages offered:** units, author_queue, author_gaps, author_insights, needs_review
- **Scope:** all, or the role entitlement
- **Answer detail:** full
- **Cannot see:** Access settings, eval controls. Cannot ingest or propose, so Legal never approves its own proposal.
- **If they try:** Grant access or upload a source: denied.
- **Rights:** view_review_queue, approve_legal, approve_standard, reverify_unit, view_gaps, view_trace, view_channel_compare, view_provenance, get_unit, accept_merge_split, view_search_insights

### Governance

#### Access administrator (`access_admin`)

- **Who:** Grants and revokes which role may read which knowledge base.
- **Goal:** Least privilege, with a named person and a reason on every change.
- **Pages offered:** author_access, author_audit, rights
- **Scope:** all, or the role entitlement
- **Answer detail:** none
- **Cannot see:** Unit bodies, queries, drafts. Cannot search.
- **If they try:** Search, approve, ingest or run evals: denied. Separation of duties: access and content never sit with one person.
- **Rights:** manage_access, view_access_matrix, view_audit, view_rights_matrix

#### Compliance auditor / QA (`compliance_auditor`)

- **Who:** Checks that the system did what policy says, after the fact.
- **Goal:** Reconstruct any answer or publication: who, what, which version, which rule.
- **Pages offered:** units, author_queue, author_owner, author_gaps, author_insights, author_access, author_audit, evals, agents, audit_replay, rights
- **Scope:** all, or the role entitlement
- **Answer detail:** full
- **Cannot see:** Nothing is hidden from them, and nothing is writable by them.
- **If they try:** Any write: approve, propose, ingest, access change, claim: denied. Read-only by construction.
- **Rights:** get_unit, view_provenance, view_trace, view_channel_compare, view_audit, view_call_log, view_evals, view_access_matrix, view_search_insights, view_review_queue, view_owner_queue, view_gaps, replay_answer, view_rights_matrix

#### AI product owner (platform) (`ai_product_owner`)

- **Who:** Owns the platform, the evals and the release gates.
- **Goal:** Prove the system is safe to publish to, and see where it fails.
- **Pages offered:** author_gaps, author_insights, author_access, author_audit, evals, agents, analytics, rights
- **Scope:** all, or the role entitlement
- **Answer detail:** full
- **Cannot see:** Cannot approve content or change access. A platform owner who could also publish would be marking their own homework.
- **If they try:** Approve a unit or change access: denied.
- **Rights:** run_evals, view_evals, manage_agents, view_call_log, view_trace, view_search_insights, view_analytics, view_access_matrix, view_audit, view_gaps, view_rights_matrix

#### Operations leadership (`leadership`)

- **Who:** Accountable for compliance findings, handle time and channel consistency.
- **Goal:** See whether the program is working: consistency, backlog age, verbatim compliance, review time.
- **Pages offered:** analytics, rights
- **Scope:** all, or the role entitlement
- **Answer detail:** none
- **Cannot see:** Unit bodies, query text, drafts, audit rows. Aggregates only.
- **If they try:** Open any unit, queue or log: denied.
- **Rights:** view_analytics, view_rights_matrix

## Rights matrix

| Capability | Pharmacy advocate | Insurance advocate | Advocate supervisor | Member | AI agent | Knowledge author | Knowledge owner | Legal / Compliance approver | Access administrator | Compliance auditor / QA | AI product owner | Operations leadership |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `search` | x | x | x | x | x |  |  |  |  |  |  |  |
| `get_unit` | x | x | x |  | x | x | x | x |  | x |  |  |
| `list_changes` | x | x | x |  | x |  |  |  |  |  |  |  |
| `report_gap` | x | x | x | x | x |  |  |  |  |  |  |  |
| `view_trace` |  |  | x |  |  | x | x | x |  | x | x |  |
| `view_channel_compare` |  |  |  |  |  | x | x | x |  | x |  |  |
| `view_provenance` |  |  | x |  |  | x | x | x |  | x |  |  |
| `ingest_source` |  |  |  |  |  | x |  |  |  |  |  |  |
| `propose_unit` |  |  |  |  |  | x |  |  |  |  |  |  |
| `accept_merge_split` |  |  |  |  |  | x | x | x |  |  |  |  |
| `view_review_queue` |  |  |  |  |  | x | x | x |  | x |  |  |
| `approve_standard` |  |  |  |  |  |  | x | x |  |  |  |  |
| `approve_legal` |  |  |  |  |  |  |  | x |  |  |  |  |
| `view_owner_queue` |  |  |  |  |  |  | x |  |  | x |  |  |
| `resolve_owner_item` |  |  |  |  |  |  | x |  |  |  |  |  |
| `view_gaps` |  |  |  |  |  | x | x | x |  | x | x |  |
| `claim_gap` |  |  |  |  |  | x | x |  |  |  |  |  |
| `view_search_insights` |  |  | x |  |  | x | x | x |  | x | x |  |
| `manage_access` |  |  |  |  |  |  |  |  | x |  |  |  |
| `view_access_matrix` |  |  |  |  |  |  |  |  | x | x | x |  |
| `view_audit` |  |  |  |  |  |  |  |  | x | x | x |  |
| `view_call_log` |  |  |  |  |  |  |  |  |  | x | x |  |
| `run_evals` |  |  |  |  |  |  |  |  |  |  | x |  |
| `view_evals` |  |  |  |  |  |  |  |  |  | x | x |  |
| `manage_agents` |  |  |  |  |  |  |  |  |  |  | x |  |
| `view_analytics` |  |  |  |  |  |  |  |  |  |  | x | x |
| `create_change_notice` |  |  |  |  |  | x | x |  |  |  |  |  |
| `reverify_unit` |  |  |  |  |  |  | x | x |  |  |  |  |
| `give_feedback` | x | x | x | x |  |  |  |  |  |  |  |  |
| `replay_answer` |  |  |  |  |  |  |  |  |  | x |  |  |
| `view_rights_matrix` |  |  |  |  |  |  |  |  | x | x | x | x |

What each capability means:

- `search`: Ask a question and get an approved, cited, scoped answer
- `get_unit`: Open one approved unit by id (within entitlement)
- `list_changes`: See what changed in the knowledge they may read
- `report_gap`: Log a question the knowledge could not answer
- `view_trace`: See the 13-step reasoning trace behind an answer
- `view_channel_compare`: See the same unit rendered for every channel
- `view_provenance`: See owner, approver, version history and source section of a unit
- `ingest_source`: Upload a source document and run extraction (proposes only)
- `propose_unit`: Turn extraction candidates or a gap into a draft for review
- `accept_merge_split`: Accept a merge or split suggestion on a non-verbatim draft
- `view_review_queue`: See pending drafts in their scope
- `approve_standard`: Approve or reject non-legal units in their knowledge bases
- `approve_legal`: Approve, reject or edit verbatim and legally approved units
- `view_owner_queue`: See stale and conflict items for units they own
- `resolve_owner_item`: Claim and resolve stale and conflict items
- `view_gaps`: See clustered unanswered questions
- `claim_gap`: Claim a gap so two authors do not write the same unit
- `view_search_insights`: See what people searched for and what came back empty
- `manage_access`: Grant or revoke a role's access to a knowledge base
- `view_access_matrix`: See who may read which knowledge base
- `view_audit`: Read the audit log of proposals, decisions, access changes and denials
- `view_call_log`: Read the REST and MCP call log
- `run_evals`: Run the golden, blind and hold-out sets
- `view_evals`: Read eval results and release gates
- `manage_agents`: Register agent connections and bind each to a role
- `view_analytics`: See aggregate health metrics only: no unit bodies, no query text
- `create_change_notice`: Enter a formulary or notice-of-change update once and open a task for every affected unit
- `reverify_unit`: Attest that a unit is still correct and extend its review date (verbatim needs Legal)
- `give_feedback`: Rate an answer and flag it; a flag opens an item for the unit owner
- `replay_answer`: Reconstruct a past answer from its request id, and see which version was live on a date
- `view_rights_matrix`: See the persona by capability matrix and the separation-of-duties rules (read only)

## Demo people

The prototype simulates identity with named people (a real deployment resolves them from SSO groups):

| Person | Persona | Scope |
|---|---|---|
| Priya | Pharmacy advocate | KB-PHARM, KB-SHARED |
| Marcus | Insurance advocate | KB-INS, KB-SHARED |
| Sam | Advocate supervisor | KB-PHARM, KB-SHARED |
| Eleanor | Member (self-service) | KB-PHARM, KB-INS |
| Agent Assist | AI agent (downstream channel) | n/a |
| Dana | Knowledge author (Knowledge Ops) | KB-PHARM, KB-SHARED |
| Ian | Knowledge author (Knowledge Ops) | KB-INS, KB-SHARED |
| Owen | Knowledge owner (domain) | KB-PHARM |
| Olivia | Knowledge owner (domain) | KB-INS |
| Rita | Legal / Compliance approver | KB-PHARM, KB-INS, KB-SHARED |
| Alex | Access administrator | n/a |
| Casey | Compliance auditor / QA | KB-PHARM, KB-INS, KB-SHARED |
| Nitin | AI product owner (platform) | n/a |
| Lee | Operations leadership | n/a |

## Journeys (one line each)

- **Advocate**: sets call context (line of business, state, plan year), asks, reads the pinned verbatim step first when flagged, says the answer, rates or flags it. No answer: typed refusal with a next step and the owning team.
- **Member**: plain answer in larger text, or a warm hand-off to a person. Never ids, owners or internal steps.
- **Author**: ingests a source, reviews proposals and drift, proposes units, claims gap clusters, raises change notices.
- **Owner**: works a ranked 'needs my review' queue, approves non-legal changes, re-verifies, clears stale and conflict items.
- **Legal**: sees the exact diff and what it would break, edits or approves verbatim wording. Never ingests.
- **Access admin**: grants or revokes access with a named person and a reason. Cannot read content.
- **Auditor**: replays any answer from its request id, looks up which version was live on a date. Read only.
- **Product owner**: eval results, release gates, agent connections, call log. Cannot approve content.
- **Leadership**: aggregate health and plan-year readiness only.
- **AI agent**: reads and proposes through MCP or REST; its role is bound to the connection.

## Tests

`tests/personas.test.ts` checks the matrix, separation of duties, views, 403s, field-level visibility and the guard rails. `tests/humana.test.ts` covers the Humana features. `tests/workflow.test.ts` covers maker-checker and Legal-only wording.
