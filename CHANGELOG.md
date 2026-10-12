# Verity Prototype Changelog

## P1 Governance Features Implementation

### Overview
This release extends the Verity prototype with P1 governance features following the strict core tenets: AI proposes, humans publish; maker-checker and regression gates strictly enforced; retrieval scoped to approved units and authorized knowledge bases only.

---

### Demo Clicks & Walkthroughs

The features are documented below in the required execution order:
**P1-1 (Synonyms) → P1-3 (Explicit Retire) → P1-4 (KB Access Grant/Revoke) → P1-5 (Gap Disposition) → P1-2 (Merge & Split Suggestions)**.

---

### P1-1: Synonyms / Humana-Speak Map

#### Requirements Met
- Managed synonym/acronym store with pre-seeded rows: `MOOP → maximum out-of-pocket`, `PA → prior authorization`, `home delivery → mail order`, `OTC → over the counter`, `PCP → primary care provider`.
- Query-time expansion/normalization before retrieval without bypassing entitlements.
- Admin/Owner UI to add, edit, disable/enable, and delete synonym entries with comprehensive audit logging.
- AI candidate synonym suggestions learned from search/gap logs ready for human confirmation.

#### Demo Clicks
1. **Switch Persona**: Select **Amara (Access admin)** or **Owen (Knowledge owner)** in the persona selector.
2. **Navigate to Knowledge Management**:
   - Click **Settings** in the left sidebar navigation (`/settings`).
   - Switch to the **Knowledge Management** tab.
3. **Inspect Active Synonyms**:
   - View the **Governed Synonyms & Acronyms** table showing seeded entries (`MOOP`, `PA`, `home delivery`, `OTC`, `PCP`).
   - Click the toggle switch on `OTC` to temporarily disable it.
   - Click **Audit Trail** (`/audit`) to verify the `synonym_updated` or `synonym_toggled` event was recorded.
4. **Add / Edit Synonym**:
   - Click the **+ Add Synonym** button in the top right.
   - Enter Acronym/Term: `step therapy`, Expanded Text: `fail first requirement`, Category: `pharmacy`.
   - Click **Save Synonym**.
5. **Human Confirmation of Candidate Synonyms**:
   - Scroll down to the **Candidate Synonyms (Learned from Gaps & Search Logs)** card.
   - Find candidate: `mail delivery` → `mail order`.
   - Click **Confirm & Add**. Notice it immediately promotes to the active synonyms table and audits the action.
6. **Verify Search Expansion**:
   - Switch Persona to **Priya (Pharmacy advocate)**.
   - Go to **Ask** (`/ask`).
   - Submit query: `"home delivery setup steps"` or `"MO setup steps"`.
   - Observe Verity expanding the acronym and retrieving unit `U-PH-005` ("Mail Order Pharmacy Setup") with 100% confidence.

---

### P1-3: Explicit Retire Unit

#### Requirements Met
- Knowledge Owner / Legal Approver can explicitly retire any published knowledge unit with a **mandatory reason**.
- Retired units receive `status = "retired"`, are immediately and permanently excluded from search retrieval, and cannot be cited as answers.
- Retired units remain visible in the Knowledge Library with a `Retired` badge and retain their full version history and audit log.
- Seeded retired unit: `U-SH-000` ("Legacy Pharmacy Help Desk Introduction (2024)").

#### Demo Clicks
1. **Switch Persona**: Select **Owen (Knowledge owner)** or **Rita (Legal approver)**.
2. **Navigate to Knowledge Library**:
   - Click **Library** in the sidebar (`/library`).
3. **View Pre-Seeded Retired Unit**:
   - In the search/filter bar, locate `U-SH-000` ("Legacy Pharmacy Help Desk Introduction (2024)").
   - Notice the prominent badge **Retired** and the banner: *"This unit was retired by Rita (Legal approver) on 2026-10-01: Superseded by standard scripted intro U-SH-001"*.
4. **Retire an Active Unit**:
   - Select an approved unit (e.g., `U-PH-010` or any draft/approved unit).
   - In the slide-out detail panel, scroll to the bottom and click **Retire Unit**.
   - Attempt to click **Confirm Retirement** without typing a reason; notice the mandatory reason validation error.
   - Enter reason: *"Replaced by unified 2027 manufacturer assistance guidance."*
   - Click **Confirm Retirement**.
5. **Verify Retrieval Exclusion**:
   - Switch persona to **Priya (Pharmacy advocate)**.
   - Query in **Ask** for the retired unit's topic.
   - Notice that the retired unit is never cited; retrieval falls back or declines safely.
6. **Verify Audit Trail**:
   - Navigate to **Audit** (`/audit`).
   - Confirm the `unit_retired` audit record exists with actor, unit ID, timestamp, and mandatory reason.

---

### P1-4: Governed KB Access (Grant / Revoke with Reason)

#### Requirements Met
- Authorized admins (`Amara`) can grant or revoke role-level access to any knowledge base (`KB-PHARM`, `KB-INS`, `KB-CLIN`) with a **mandatory reason**.
- Effective immediately for all subsequent searches (caches invalidated).
- AI actor is strictly forbidden from granting or modifying access permissions (enforced with hard error).
- Full audit event logged for every grant and revoke operation.

#### Demo Clicks
1. **Switch Persona**: Select **Amara (Access admin)**.
2. **Navigate to Access Control**:
   - Click **Settings** (`/settings`) or **Author / Access** (`/access`).
   - Switch to the **Access & Roles** tab.
3. **Revoke KB Access with Reason**:
   - Locate the row for **Insurance Advocate**.
   - Uncheck/toggle access for **KB-INS**.
   - In the prompt modal, enter reason: *"Annual security policy compliance review."*
   - Click **Save**.
4. **Verify Immediate Retrieval Effect**:
   - Switch Persona to **Marcus (Insurance advocate)**.
   - Go to **Ask** and query `"replace id card"`.
   - Observe immediate outcome: `not_authorized` (access denied to KB-INS).
5. **Grant KB Access**:
   - Switch back to **Amara (Access admin)**.
   - In **Access & Roles**, re-enable **KB-INS** (or grant **KB-PHARM**) with reason: *"Temporary cross-domain cross-training pilot."*
6. **Verify Immediate Restoration**:
   - Switch back to **Marcus (Insurance advocate)**.
   - Query `"replace id card"` again.
   - Observe outcome: `answer` with clean citation of `U-IN-001`.
7. **Verify AI Inability to Modify Rights**:
   - Programmatic / API calls by non-human or AI agents throw: `"AI cannot grant or revoke access"`.

---

### P1-5: Gap Disposition — Unit vs Process Fix

#### Requirements Met
- Knowledge Owners can resolve knowledge gaps as either:
  1. **Create unit** (traditional flow routing to extraction/drafting), or
  2. **Process fix** (no unit created; captures mandatory resolution rationale and optional linked system/process ticket).
- Process-fix gaps do not stay open forever; they show as resolved with a `Process Fix` badge and details.
- Real-time analytics counter tracking gaps closed as unit vs process fix.
- Pre-seeded process fix example: `GAP-003` ("Formulary Exception Appeals Escalation Process").

#### Demo Clicks
1. **Switch Persona**: Select **Owen (Knowledge owner)**.
2. **Navigate to Knowledge Gaps**:
   - Click **Gaps** in the sidebar navigation (`/gaps`).
3. **Inspect Disposition Metrics**:
   - At the top of the page, view the **Resolution Metrics**:
     - *Total Process Fixes*: Shows resolved process-fix count.
     - *Units Created*: Shows resolved unit creation count.
4. **Inspect Seeded Process Fix**:
   - Find `GAP-003` in the table.
   - Notice the purple **Process Fix** badge.
   - Click to expand: view resolution details (*"Appeals must be submitted via Provider Portal form FA-992. No knowledge unit required."*) and linked ticket (*"ServiceNow #INC-88391"*).
5. **Resolve an Open Gap as Process Fix**:
   - Select an open gap (e.g., `GAP-001`: "Specialty drug tiering inquiry").
   - Click **Resolve as Process Fix**.
   - Enter Mandatory Rationale: *"Specialty medications route to Specialty Pharmacy Call Center IVR queue #4."*
   - Enter Linked System Note: *"Jira TICKET-OPS-912"*.
   - Click **Confirm Process Fix**.
   - Notice the gap immediately marks as resolved and the metrics counter increments.
6. **Verify Audit Trail**:
   - Go to **Audit** (`/audit`).
   - Check the `gap_disposition` log entry with reason and linked system note.

---

### P1-2: AI Merge & Split Suggestions

#### Requirements Met
- Automated detection of near-duplicates (similarity ≥ 80%) proposes **Merge**.
- Author can review and **Accept** (creates surviving draft unit with `supersedes` metadata routing through maker-checker approval) or **Reject** (with reason; leaves original units untouched).
- Automated detection of multi-statement compound units proposes **Split** into 2+ atomic candidate drafts (titles + spans).
- **No auto-publish**: All merge and split outputs route through standard human maker-checker review, golden evaluation gates, and legal signoff.

#### Demo Clicks
1. **Switch Persona**: Select **Owen (Knowledge owner)** or **Rita (Legal approver)**.
2. **Navigate to Review Queue**:
   - Click **Review** in the sidebar navigation (`/review`).
   - Notice the amber notification banner: *"AI Governance Recommendations: 1 Merge Proposal, 1 Split Suggestion awaiting human review"*.
3. **Inspect AI Merge Proposal (`MERGE-01`)**:
   - Click on the **AI Merge & Split** tab.
   - View the card for `MERGE-01`:
     - Similarity: `88%`
     - Source: `U-PH-204` (Consolidated 2027 mail order text)
     - Target: `U-PH-207` (Days supply by mail 2027)
     - Reason: *"Near-duplicate text detected between U-PH-204 and U-PH-207... Propose consolidating into surviving unit U-PH-207."*
4. **Accept Merge Proposal**:
   - Click **Accept Merge**.
   - Verity automatically creates a consolidated draft (`D-MERGE-...`) superseding `U-PH-204` with status `proposed`.
   - The draft appears in the review queue awaiting an independent approver's sign-off.
5. **Approve via Standard Maker-Checker**:
   - Switch persona to **Rita (Legal approver)**.
   - Review the generated merge draft and click **Approve**.
   - The golden regression gate runs; upon passing, the unit publishes to live retrieval and `U-PH-204` is marked superseded.
6. **Reject a Merge Proposal (Alternative Path)**:
   - If rejecting, click **Reject Merge**.
   - Enter reason: *"These units cover distinct policy years."*
   - Click **Confirm Rejection**.
   - Verify original units remain completely untouched and an audit record `merge_rejected` is created.
7. **Inspect and Confirm AI Split Suggestion (`SPLIT-01`)**:
   - Under the **Split Suggestions** section, locate `SPLIT-01` for compound unit `U-PH-204`.
   - View proposed atomic splits:
     1. *"Maintenance supply duration (2027)"* (Span: 84 days)
     2. *"Mail order delivery window (2027)"* (Span: 6 to 9 business days)
   - Click **Confirm Split**.
   - Two candidate drafts are generated (`D-SPLIT-...-1` and `D-SPLIT-...-2`) in `proposed` status for normal human review.

---

### Automated Test Verification

All P0 and P1 governance acceptance tests are fully automated and verified:
- `p0-governance-features.test.ts`: **3/3 passed (100%)**
  - P0-1: Conflict resolution workflow end-to-end.
  - P0-2: Stale / review-due enforcement at serve time.
  - P0-3: Change propagation on publish signal.
- `p1-governance-features.test.ts`: **13/13 passed (100%)**
  - P1-1: Synonym expansion, audit trail, and entitlement enforcement.
  - P1-3: Explicit retire, retrieval exclusion, reason requirement, and audit trail.
  - P1-4: Governed KB access grant/revoke, immediate search effect, and AI privilege restriction.
  - P1-5: Gap disposition (process fix vs unit created) and disposition metrics.
  - P1-2: Merge proposal acceptance, maker-checker approval gate, rejection safety, and split suggestion generation.

Total: **16/16 tests passing cleanly**.
