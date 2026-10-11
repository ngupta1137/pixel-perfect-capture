# Verity — Governed AI Knowledge & Answer Platform

Verity is an enterprise-grade governed knowledge and answer platform designed for regulated healthcare and life sciences environments. It ensures that every response served to advocates, clinicians, or members is strictly grounded in approved, cited, effective knowledge units with zero tolerance for ungrounded hallucination.

This project was built with [Lovable](https://lovable.dev) and enhanced with a production-grade deterministic serving engine, cryptographic RBAC, maker-checker governance, and relational persistence.

---

## 🌟 Key Capabilities & Architecture

### 1. Governed 13-Step Answer Pipeline
- **Strict Grounding:** Every answer is mapped directly to approved knowledge units and citations.
- **Fail-Safe Responses:** Queries with missing, conflicting, or expired evidence resolve into explicit outcome states (`insufficient_evidence`, `conflict`, `stale_policy`) and automatically route to the Knowledge Gaps backlog.
- **Citation Provenance Safeguards:** Hardened citation verification prevents fabricated metadata or ungrounded unit references.

### 2. Enterprise Authentication & Server RBAC
- **Cryptographic Session Tokens:** HMAC-SHA256 signed session tokens prevent tampering.
- **Strict Role Verification:** Server RPCs (`auth.server.ts`) validate user persona, role privileges, and assigned knowledge bases before executing any write or read operation.
- **Role Isolation:** Knowledge Authors, Owners, Legal Approvers, Advocates, and Auditors operate within strict entitlement boundaries defined in `src/data/personas.json`.

### 3. Governed Knowledge Lifecycle & Maker-Checker Approval
- **Ingestion & Extraction:** Multi-format document ingestion with SHA-256 deduplication and candidate unit extraction.
- **Maker-Checker Review:** Strict segregation of duties — authors proposing a draft cannot approve their own submission.
- **Automated Regression Gating:** Before publishing, candidate changes run against regression test cases to verify no unintended query regressions.
- **Real-Time Synchronization:** Approved knowledge versions instantly publish to the serving engine and Knowledge Library with draft isolation.

### 4. Deterministic Evaluation Harness & Golden Suite
- **Live Golden Suite:** 27 benchmark cases executed through `src/verity-engine/evalRunner.ts`.
- **Dynamic Evals UI:** Real-time metrics calculation, pass/fail rates, regression gates, and per-case 13-step trace inspection (`/evals`).

### 5. Relational Persistence & Audit Trail
- **Database Engine:** Powered by SQLite and Kysely migrations (`src/storage/`).
- **Entity Storage:** Persisted storage for source documents, extracted candidate units, drafts, knowledge versions, and immutable audit events for regulatory compliance replay.

---

## 👥 Personas & Roles

Verity includes an interactive persona switcher to test and demonstrate end-to-end multi-role workflows:

| Persona | Role | Primary Workspaces |
| :--- | :--- | :--- |
| **Priya Patel** | Pharmacy Advocate | `/` (Ask, citations, outcome inspection) |
| **Marcus Vance** | Insurance Advocate | `/` (Benefit queries, coverage details) |
| **Sam Torres** | Member | `/` (Member Chat, simplified outcome cards) |
| **Dana Vance** | Knowledge Author | `/work` (Source ingestion, unit extraction, drafting) |
| **Owen Wright** | Knowledge Owner | `/review`, `/library` (Policy approval, lifecycle review) |
| **Rita Chen** | Legal & Compliance Approver | `/review` (Verbatim disclaimer verification, legal sign-off) |
| **Alex Mercer** | Auditor | `/audit` (Compliance replay, request investigation) |
| **Nitin Sethi** | Access Admin | `/access` (Role assignment, knowledge-base partitioning) |

---

## 🛠️ Technology Stack

- **Framework:** React 19, TanStack Start & TanStack Router
- **Styling & UI:** Tailwind CSS v4, Lucide React, Radix UI primitives
- **Data & Persistence:** Kysely, SQLite
- **Testing:** Vitest, Testing Library, JSDOM (31 test suites, 220 tests)
- **Language:** TypeScript 5.8 (Strict Mode)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ and npm

### Installation & Local Development

```sh
# Clone the repository
git clone https://github.com/ngupta1137/pixel-perfect-capture.git
cd pixel-perfect-capture

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173` (or the port indicated in your console).

### Running Tests

```sh
# Run the complete test suite (220 tests across 31 suites)
npx vitest run

# Run tests in watch mode
npx vitest
```

---

## 📁 Repository Structure

```
├── docs/                             # Architecture specifications & audits
│   ├── EVALS_CURRENT_STATE_AUDIT.md  # Evaluation harness audit
│   ├── EVALS_TARGET_DESIGN.md        # Target evaluation runner design
│   ├── IMPLEMENTATION_ROADMAP.md     # Evals & persistence delivery plan
│   ├── PERSONAS.md                   # Persona definitions and rights
│   ├── UI_SPEC.md                    # Screen specifications
│   └── VERITY_END_TO_END_AUDIT.md    # Comprehensive 19-route architecture audit
├── src/
│   ├── components/                   # UI components (Ask, Ingest, Review, Library, etc.)
│   ├── routes/                       # TanStack Start file-based routes
│   ├── services/                     # Server functions, auth, ingestion, review, and client bridge
│   ├── storage/                      # SQLite schema, migrations, and Kysely repository
│   ├── test/                         # 31 unit, integration, and security test suites
│   └── verity-engine/                # 13-step deterministic answer & evaluation engine
└── roadmap.md                        # Enterprise platform milestones & delivery progress
```

---

## 🔄 Lovable Integration

This project was bootstrapped and remains connected with [Lovable](https://lovable.dev/projects/d48e563c-536e-4e69-90ad-c517c1157eba). Commits pushed to GitHub automatically sync back to the Lovable editor.
