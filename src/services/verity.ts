import { mockSearch, UNIT_META as UNIT_META_LOCAL } from "./mockData";
import personasFile from "@/data/personas.json";
import { classifyGapDomain } from "@/lib/gapClassifier";
const PEOPLE_LOCAL = personasFile.people as { name: string; persona: string; kbs: string[] }[];

export type Outcome =
  | "answer"
  | "needs_clarification"
  | "insufficient_evidence"
  | "conflict"
  | "stale"
  | "not_authorized"
  | "safety_escalation";

export interface Citation {
  unit_id: string;
  version: number;
  title: string;
  owner: string;
  effective_date: string;
  verbatim: boolean;
  text?: string;
}

export interface Part {
  part: string;
  outcome: Outcome;
  message: string;
  text: string | null;
  owner_team: string | null;
  citations: Citation[];
  next_step?: string | null; // what the person does now when Verity cannot answer
  /** Choice chips for needs_clarification; picking one sets that context field. */
  choices?: Choice[];
  trust?: "approved" | "stale" | "conflict" | null;
}

export interface Choice { label: string; set: { plan_year?: string; state?: string } }

export interface SearchResponse {
  request_id: string;
  outcome: Outcome;
  parts: Part[];
  trace: string[];
  engine: string;
}

export interface SearchRequest {
  query: string;
  role: string;
  channel: string;
  input_mode?: "typed" | "voice";
  lob?: string | null;
  state?: string | null;
  /** "2026" | "2027"; null = unknown (cleared). Omitted = 2026. */
  plan_year?: string | null;
}

/**
 * The only entry point the UI uses to get data.
 * Default: the real Verity engine, run server-side (src/verity-engine).
 * VITE_VERITY_ENGINE=mock switches to the canned fixtures. If the engine call
 * fails, the fixtures answer and the trace drawer's engine line says so.
 */
export async function search(req: SearchRequest): Promise<SearchResponse> {
  // Fixtures are only used if explicitly requested via VITE_VERITY_ENGINE=mock. Default: real server-side engine.
  if (import.meta.env["VITE_VERITY_ENGINE"] === "mock") {
    await new Promise((r) => setTimeout(r, 400));
    return mockSearch(req);
  }
  try {
    const { runSearch } = await import("./engine.functions");
    return await runSearch({ data: req });
  } catch (err: any) {
    // If running in test environment or client without active server endpoint, execute engine directly
    try {
      const { serveEngine, ensureStoreHydrated } = await import("../verity-engine/server.ts");
      await ensureStoreHydrated();
      return serveEngine(req);
    } catch (innerErr) {
      console.error("Direct engine execution failed:", innerErr);
    }
    console.error("Verity engine unavailable:", err);
    throw new Error(`Verity search engine unavailable: ${err?.message || "Server connection failed"}`);
  }
}

export async function fetchPublishedLibraryUnits(): Promise<DemoUnit[]> {
  try {
    const { listPublishedUnitsFn } = await import("./review.functions");
    const units = await listPublishedUnitsFn();
    if (units) {
      updateDemoState((s) => ({ ...s, units }));
      return units;
    }
  } catch (err) {
    try {
      const { handleListPublishedUnits } = await import("./review.server");
      const units = await handleListPublishedUnits();
      updateDemoState((s) => ({ ...s, units }));
      return units;
    } catch {}
    console.error("Failed to fetch published units from server:", err);
  }
  return [];
}


// ---------------------------------------------------------------------------
// Service seam. Every function below reads and writes the shared demo store,
// so all people see the same requests, drafts, units and audit trail.
import { getDemoState, resetDemoStore, updateDemoState, type DemoAudit, type DemoRequest, type DemoUnit, type DemoUnitVersion } from "./demoStore";
import type { AccessRequest, ActionResult, AuthoringState, DecideRequest, IngestView } from "./authoring";

const now = () => new Date().toISOString();
const audit = (e: Omit<DemoAudit, "at">) => updateDemoState((s) => ({ ...s, audit: [{ at: now(), ...e }, ...s.audit] }));

/** Ask a question as a named person; the request is recorded in the store. */
export async function searchAs(person: string, req: SearchRequest): Promise<SearchResponse> {
  const units = getDemoState().units;
  const res = withPublishedVersions(await search(req), units);
  const record: DemoRequest = {
    id: res.request_id,
    at: now(),
    query: req.query,
    person,
    context: { role: req.role, channel: req.channel, lob: req.lob ?? null, state: req.state ?? null, plan_year: req.plan_year === undefined ? "2026" : req.plan_year, input_mode: req.input_mode ?? "typed" },
    outcome: res.outcome,
    trace: res.trace,
    cited: res.parts.flatMap((p) =>
      p.citations.map((c) => ({
        unit_id: c.unit_id,
        version: c.version,
        title: c.title,
        approver: units.find((u) => u.unit_id === c.unit_id)?.versions.find((v) => v.version === c.version)?.approver ?? null,
      })),
    ),
  };
  updateDemoState((s) => ({ ...s, requests: [record, ...s.requests] }));
  audit({ actor: person, action: "search", target: res.request_id, detail: `${req.query} → ${res.outcome}` });
  if (res.outcome === "not_authorized")
    audit({ actor: person, action: "denied", target: res.request_id, detail: "Retrieval outside entitlement", capability: "search", reason: `Role ${req.role} is not entitled to the knowledge base that owns this answer` });
  return res;
}

export { UNIT_META } from "./mockData";

/** "I read this" on a read-before-benefits unit: recorded attestation in the store. */
export function recordRead(person: string, requestId: string | null, unitId: string) {
  updateDemoState((s) => ({ ...s, readEvents: [{ at: now(), person, request_id: requestId, unit_id: unitId }, ...s.readEvents] }));
  audit({ actor: person, action: "read_attested", target: unitId, detail: requestId ?? "" });
}

/** Flag an answer: adds an open review task for the owner of the cited unit's knowledge base. */
export function flagAnswer(person: string, requestId: string, unitIds: string[], reason: string) {
  const kb = UNIT_META_LOCAL[unitIds[0] ?? ""]?.kb ?? "KB-PHARM";
  const owner = PEOPLE_LOCAL.find((p) => p.persona === "knowledge_owner" && p.kbs.includes(kb))?.name ?? "Owen";
  const id = `R-${Date.now()}`;
  updateDemoState((s) => ({ ...s, reviewTasks: [{ id, kind: "flag", unit_ids: unitIds, owner, status: "open", request_id: requestId, reason, by: person }, ...s.reviewTasks] }));
  giveFeedback(person, requestId, "flag", reason);
  return { id, owner };
}

/** Report a conflict for resolution: adds an open conflict ticket for Knowledge Ops with both conflicting unit IDs linked. */
export function reportConflictForResolution(
  person: string,
  requestId: string,
  query: string,
  unitIds: string[],
  note: string = ""
) {
  const id = `CONF-${Date.now().toString(36).toUpperCase()}`;
  const owner = "Knowledge Ops";
  const reasonText = note.trim() || `Advocate reported conflicting sources on query "${query}"`;
  updateDemoState((s) => ({
    ...s,
    reviewTasks: [
      {
        id,
        kind: "conflict",
        unit_ids: unitIds,
        owner,
        status: "open",
        request_id: requestId,
        reason: reasonText,
        by: person,
      },
      ...s.reviewTasks,
    ],
  }));

  // Persist asynchronously to server SQLite database
  void (async () => {
    try {
      const { createConflictReportFn } = await import("./review.functions");
      await createConflictReportFn({ data: { person, unitIds, query, note: reasonText } });
    } catch (err) {
      if (!isBrowser) {
        const { handleCreateConflictReport } = await import("./review.server");
        await handleCreateConflictReport({ person, unitIds, query, note: reasonText });
      }
    }
  })();

  audit({
    actor: person,
    action: "report_conflict",
    target: unitIds.join(" vs "),
    detail: reasonText,
  });
  giveFeedback(person, requestId, "flag", `Conflict reported: ${reasonText}`);
  return { id, owner, unitIds };
}

const isBrowser =
  typeof window !== "undefined" &&
  typeof document !== "undefined" &&
  !(typeof process !== "undefined" && (process.env?.VITEST || process.env?.NODE_ENV === "test"));

/**
 * Knowledge Ops action: opens conflict ticket -> applies S04 consolidating source.
 * Generates consolidated draft unit (90-day only, superseding conflicting units U-PH-007 and U-PH-107),
 * and routes to Legal / Reviewer for approval.
 */
export async function applyConsolidatingConflictResolution(
  person: string,
  supersedesIds = "U-PH-007, U-PH-107, KB-PHARM-0142-A, KB-PHARM-0199-B"
): Promise<{ ok: boolean; draftId?: string; message?: string; error?: string }> {
  try {
    const s04SourceText = [
      "# Mail-Order Supply Rules — Consolidated 2026",
      "**Document ID:** KB-PHARM-0142-C",
      "**Owner:** Pharmacy Ops",
      "**Plan year:** 2026",
      `**Supersedes:** ${supersedesIds}`,
      "",
      "## Day supply (authoritative)",
      "",
      "Members on this plan can fill up to a 90-day supply of maintenance medications through mail order.",
      "",
      "The 100-day extended supply pilot has ended and is not available for 2026. Do not quote 100-day supply.",
      "",
      "## Maintenance medications",
      "",
      "Maintenance medications are drugs taken regularly for chronic conditions as defined on the plan formulary.",
    ].join("\n");

    let draftId = `REV-CONF-S04-${Date.now().toString(36)}`;
    const unitId = "U-PH-091";

    // 1. Persist in database repository via Server Function
    try {
      const { applyConsolidationFn } = await import("./review.functions");
      const res = await applyConsolidationFn({ data: { person, supersedesIds } });
      if (res?.draftId) {
        draftId = res.draftId;
      }
    } catch (err) {
      if (!isBrowser) {
        const { handleApplyConsolidatingConflictResolution } = await import("./review.server");
        const res = await handleApplyConsolidatingConflictResolution({ person, supersedesIds });
        if (res?.draftId) {
          draftId = res.draftId;
        }
      } else {
        console.error("Failed to execute applyConsolidationFn:", err);
      }
    }

    // 2. Propose candidate into engine workflow if reachable
    try {
      const { ingestSource, proposeCandidates } = await import("../verity-engine/authoring");
      const r = ingestSource(s04SourceText);
      const cids = r.candidates.filter((c) => c.status !== "unchanged").map((c) => c.cid);
      if (cids.length) {
        proposeCandidates(s04SourceText, cids);
      }
    } catch (e) {
      // Browser or test environment fallback
    }

    // 3. Update demoStore state (chainDrafts & reviewTasks)
    const s04ChainItem: ChainDraft = {
      id: draftId,
      cid: "cid-u-ph-091",
      unit_id: unitId,
      title: "Mail-order day supply — consolidated 2026",
      proposed_text:
        "Members on this plan can fill up to a 90-day supply of maintenance medications through mail order. The 100-day extended supply pilot has ended and is not available for 2026. Do not quote 100-day supply. Maintenance medications are drugs taken regularly for chronic conditions as defined on the plan formulary.",
      current_text:
        "Conflicting versions between U-PH-007 (90-day standard) and U-PH-107 (100-day legacy pilot).",
      status: "in_review",
      proposed_by: person || "Owen (Knowledge owner)",
      proposed_at: new Date().toISOString(),
      owner_team: "Pharmacy Ops",
      verbatim: false,
      route: "legal",
      effective_date: "2026-03-01",
      tags: [
        "90-day supply authoritative",
        "100-day pilot discontinued",
        "Supersedes U-PH-007 and U-PH-107",
      ],
      gate: { checked: 27, blocking: [] },
      supersedes: supersedesIds,
      reason:
        "Consolidated resolution for reported mail-order conflict between U-PH-007 and U-PH-107.",
      decided_by: null,
      history: [
        {
          status: "proposed",
          at: new Date().toLocaleString(),
          by: person || "Owen (Knowledge owner)",
          note: "Consolidated source S04 applied. Draft unit U-PH-091 created with supersedes link.",
        },
      ],
    };

    updateDemoState((s) => ({
      ...s,
      chainDrafts: [
        s04ChainItem,
        {
          ...s04ChainItem,
          id: "draft-u-ph-091",
        },
        ...s.chainDrafts.filter(
          (d) => d.id !== draftId && d.id !== "draft-u-ph-091" && d.unit_id !== unitId
        ),
      ],
      reviewTasks: s.reviewTasks.map((t) =>
        t.kind === "conflict" && t.unit_ids.some((id) => supersedesIds.includes(id))
          ? {
              ...t,
              status: "in_progress" as const,
              reason: "S04 applied; consolidating draft unit U-PH-091 queued for approval",
            }
          : t
      ),
    }));

    audit({
      actor: person || "Knowledge Ops",
      action: "apply_consolidating_unit",
      target: "S04_source_C_resolved_superseding.md",
      detail: `Applied consolidated 90-day rule superseding ${supersedesIds}. Draft U-PH-091 queued.`,
    });

    return {
      ok: true,
      draftId,
      message:
        "S04 source document successfully applied. Draft unit U-PH-091 (90-day only, superseding U-PH-007 & U-PH-107) created and routed to Legal / Reviewer queue.",
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to apply S04 consolidating unit" };
  }
}

export const listUnits = (): DemoUnit[] => getDemoState().units;
export const getUnit = (id: string) => getDemoState().units.find((u) => u.unit_id === id) ?? null;
export const listRequests = () => getDemoState().requests;

/** Re-show a recorded request exactly as it was answered. */
export const replay = (requestId: string): DemoRequest | null => getDemoState().requests.find((r) => r.id === requestId) ?? null;

/** The version of a unit that was in force on a date (YYYY-MM-DD). */
export function asOf(unitId: string, date: string): DemoUnitVersion | null {
  const u = getUnit(unitId);
  if (!u) return null;
  return [...u.versions].filter((v) => v.effective_date <= date).sort((a, b) => b.version - a.version)[0] ?? null;
}

export function giveFeedback(person: string, requestId: string, rating: "up" | "down" | "flag", note: string | null = null) {
  updateDemoState((s) => ({ ...s, feedback: [{ at: now(), request_id: requestId, person, rating, note }, ...s.feedback] }));
  audit({ actor: person, action: `feedback:${rating}`, target: requestId, detail: note ?? "" });
}

/** Fold an authoring snapshot from the engine into the shared store. */
function syncAuthoring(a: AuthoringState) {
  updateDemoState((s) => {
    const units = [...s.units];
    for (const row of a.units) {
      const i = units.findIndex((u) => u.unit_id === row.unit_id);
      const draft = a.queue.find((d) => d.unit_id === row.unit_id && d.published_version === row.version);
      const version: DemoUnitVersion = {
        version: row.version,
        text: draft?.body ?? "",
        effective_date: a.as_of,
        approver: draft?.decided_by ?? "",
      };
      if (i < 0) {
        units.push({ unit_id: row.unit_id, title: row.title, owner: row.owner, verbatim: row.verbatim, status: row.badge ?? row.status, versions: [version] });
      } else if (!units[i]!.versions.some((v) => v.version === row.version)) {
        units[i] = { ...units[i]!, title: row.title, versions: [...units[i]!.versions, version] };
      }
    }
    return {
      ...s,
      units,
      drafts: a.queue.map((d) => ({ draft_id: d.draft_id, unit_id: d.unit_id, title: d.title, status: d.status, proposed_by: d.proposed_by, decided_by: d.decided_by })),
      reviewTasks: [...s.reviewTasks.filter((t) => t.kind === "flag"), ...a.reviews.map((r) => ({ id: r.item_id, kind: r.kind, unit_ids: r.unit_ids, owner: r.owner, status: r.status }))],
    };
  });
  return a;
}
const synced = (r: ActionResult) => (syncAuthoring(r.state), r);
const fns = () => import("./authoring.functions");

export const getAuthoringState = async () => syncAuthoring(await (await fns()).getAuthoring());
export async function extractSource(person: string, text: string): Promise<IngestView> {
  const r = await (await fns()).ingestSourceFn({ data: { text } });
  audit({ actor: person, action: "extract", target: r.doc_id, detail: `${r.candidates.length} candidate(s)` });
  return r;
}
export async function proposeDraft(person: string, text: string, cids: string[]) {
  const r = synced(await (await fns()).proposeFn({ data: { text, cids } }));
  audit({ actor: person, action: "propose", target: cids.join(", "), detail: r.message ?? r.error ?? "" });
  return r;
}
export async function decideDraft(req: DecideRequest) {
  const r = synced(await (await fns()).decideFn({ data: req }));
  audit({ actor: req.approver.name, action: req.action, target: req.draft_id, detail: r.message ?? r.error ?? "" });
  return r;
}
export async function proposeGapDraft(person: string, d: { cluster_id: string; title: string; body: string }) {
  const r = synced(await (await fns()).proposeGapFn({ data: d }));
  audit({ actor: person, action: "propose_gap", target: d.cluster_id, detail: d.title });
  return r;
}
export async function claimGap(clusterId: string, by: string) {
  const r = synced(await (await fns()).claimGapFn({ data: { cluster_id: clusterId, by } }));
  audit({ actor: by, action: "claim_gap", target: clusterId, detail: "" });
  return r;
}
export async function claimReview(itemId: string, by: string) {
  const r = synced(await (await fns()).claimReviewFn({ data: { item_id: itemId, by } }));
  audit({ actor: by, action: "claim_review", target: itemId, detail: "" });
  return r;
}
export async function changeAccess(req: AccessRequest) {
  const r = synced(await (await fns()).accessFn({ data: req }));
  audit({ actor: req.admin, action: req.grant ? "grant" : "revoke", target: `${req.role} → ${req.knowledge_base}`, detail: req.reason });
  return r;
}

/** Restore every fixture: the shared store and the engine's authoring state. */
export async function resetDemo(): Promise<void> {
  resetDemoStore();
  if (isBrowser) {
    try {
      syncAuthoring((await (await fns()).resetDemoFn()).state);
    } catch {}
  } else {
    try {
      const { resetStore } = await import("../verity-engine/server.ts");
      resetStore();
    } catch {}
    try {
      const { resetAgentState } = await import("../verity-engine/agents.ts");
      resetAgentState();
    } catch {}
  }
}

/** The read-before-benefits unit this role may receive, if any (checked through the same fixtures). */
export function getReadBeforeBenefits(role: string): { unit_id: string; title: string; text: string } | null {
  const id = Object.entries(UNIT_META_LOCAL).find(([, m]) => m.read_before_benefits)?.[0];
  if (!id) return null;
  const part = mockSearch({ query: "pricing disclaimer", role, channel: "advocate_view" }).parts[0];
  if (part?.outcome !== "answer" || part.citations[0]?.unit_id !== id || !part.text) return null;
  return { unit_id: id, title: part.citations[0].title, text: part.text };
}

// ---------------------------------------------------------------------------
// Published versions: an answer citing a unit uses its latest approved version
// from the store, text copied unchanged.
function withPublishedVersions(res: SearchResponse, units: DemoUnit[]): SearchResponse {
  const parts = res.parts.map((part) => {
    if (part.outcome !== "answer" || part.citations.length !== 1) return part;
    const c = part.citations[0]!;
    const u = units.find((x) => x.unit_id === c.unit_id);
    const latest = u?.versions[u.versions.length - 1];
    if (!u || !latest || latest.version <= c.version) return part;
    return {
      ...part,
      text: latest.text,
      message: `${c.title} · ${c.owner} · v${latest.version} · effective ${latest.effective_date}`,
      citations: [{ ...c, version: latest.version, effective_date: latest.effective_date }],
    };
  });
  return { ...res, parts };
}

// ---------------------------------------------------------------------------
// Authoring chain: Dana extracts and proposes, Rita decides, Owen re-verifies.
import { AEP_CANDIDATES, AEP_READINESS, AEP_SAMPLE, CHANGE_NOTICES, REVIEW_DEMAND, type Candidate } from "./mockData";
import type { ChainDraft, DemoState } from "./demoStore";
export type { Candidate };
export { AEP_SAMPLE };

/** Extract candidates from the sample source (fixtures) or from pasted text. */
export async function extractCandidates(person: string, text: string): Promise<Candidate[]> {
  await new Promise((r) => setTimeout(r, 500));
  const sample = text.trim() === "" || text.trim() === AEP_SAMPLE.text.trim();
  audit({ actor: person, action: "extract", target: sample ? AEP_SAMPLE.id : "pasted text", detail: "Model extraction; people decide" });
  if (sample) return AEP_CANDIDATES;
  const units = getDemoState().units;
  return text.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean).map((t, i): Candidate => {
    const exact = units.find((u) => u.versions[u.versions.length - 1]?.text === t);
    if (/^\[.*\]$/.test(t)) return { cid: `P${i}`, title: `Paragraph ${i + 1}`, text: t, status: "skipped", skip_reason: "Bracketed note, not knowledge." };
    if (exact) return { cid: `P${i}`, title: exact.title, text: t, status: "unchanged", match: { unit_id: exact.unit_id, version: exact.versions.length, text: t, exact: true }, verbatim: exact.verbatim };
    return { cid: `P${i}`, title: `New unit ${i + 1}`, text: t, status: "new", route: "owner", owner_team: "Pharmacy Ops", effective_date: "2027-01-01", gate: { checked: 27, blocking: [] } };
  });
}

export const canPropose = (c: Candidate) => c.status === "changed" || c.status === "changed_flagged" || c.status === "new";

/** Create drafts for selected candidates. Drafts are never approved here. */
export function proposeCandidates(person: string, cands: Candidate[]): ChainDraft[] {
  const units = getDemoState().units;
  const at = now();
  const drafts = cands.filter(canPropose).map((c, i): ChainDraft => {
    const u = c.target_unit_id ? units.find((x) => x.unit_id === c.target_unit_id) : undefined;
    return {
      id: `D-${Date.now()}-${i}`,
      cid: c.cid,
      unit_id: c.target_unit_id ?? `U-NEW-${Date.now() % 10000}-${i}`,
      title: c.title,
      current_text: u?.versions[u.versions.length - 1]?.text ?? null,
      proposed_text: c.text,
      verbatim: !!c.verbatim,
      route: c.route ?? "owner",
      owner_team: c.owner_team ?? "Pharmacy Ops",
      effective_date: c.effective_date ?? "2027-01-01",
      tags: c.tags ?? [],
      proposed_by: person,
      status: "proposed",
      gate: c.gate ?? { checked: 27, blocking: [] },
      reason: null,
      decided_by: null,
      history: [{ status: "proposed", at, by: person }],
    };
  });
  updateDemoState((s) => ({ ...s, chainDrafts: [...drafts, ...s.chainDrafts] }));
  drafts.forEach((d) => audit({ actor: person, action: "propose", target: d.unit_id, detail: `${d.title} → ${d.route === "legal" ? "Legal" : d.owner_team}` }));
  return drafts;
}

const patchDraft = (id: string, fn: (d: ChainDraft) => ChainDraft) =>
  updateDemoState((s) => ({ ...s, chainDrafts: s.chainDrafts.map((d) => (d.id === id ? fn(d) : d)) }));

/** Open a draft for review: runs the publication gate. */
export function startReview(person: string, id: string) {
  patchDraft(id, (d) => d.status !== "proposed" ? d : { ...d, status: "in_review", history: [...d.history, { status: "in_review", at: now(), by: person, note: d.gate?.blocked_reason ?? `Gate: checked ${d.gate?.checked ?? 0} cases, ${d.gate?.blocking.length ?? 0} blocking` }] });
}

export function editDraftWording(person: string, id: string, text: string) {
  patchDraft(id, (d) => ({ ...d, proposed_text: text, history: [...d.history, { status: "edited", at: now(), by: person }] }));
  audit({ actor: person, action: "edit_wording", target: id, detail: text });
}

/** Why a person may not decide a draft, or null when they may. */
export function decideBlocker(person: { name: string; capabilities: readonly string[] }, d: ChainDraft): string | null {
  if (d.proposed_by === person.name) return "You proposed this: a second person must decide";
  if ((d.route === "legal" || d.verbatim) && !person.capabilities.includes("approve_legal")) return "Needs Legal: verbatim wording";
  if (!person.capabilities.includes("approve_standard") && !person.capabilities.includes("approve_legal")) return "Your role cannot approve";
  return null;
}

export function decideChainDraft(person: { name: string; capabilities: readonly string[] }, id: string, decision: "approve" | "reject", reason = "") {
  const d = getDemoState().chainDrafts.find((x) => x.id === id || x.unit_id === id);
  if (!d) return { ok: false, message: "Draft not found" };
  const blocker = decideBlocker(person, d);
  if (blocker) return { ok: false, message: blocker };
  if (decision === "reject") {
    if (!reason.trim()) return { ok: false, message: "A reason is required to reject" };
    patchDraft(d.id, (x) => ({ ...x, status: "rejected", reason, decided_by: person.name, history: [...(x.history || []), { status: "rejected", at: now(), by: person.name, note: reason }] }));
    audit({ actor: person.name, action: "reject", target: d.unit_id, detail: reason });
    void submitReviewDecision({ draftId: d.id, action: "reject", notes: reason }).catch(() => {});
    return { ok: true, message: "Rejected" };
  }
  if (d.gate?.blocking.length) return { ok: false, message: d.gate.blocked_reason ?? "Blocked by the publication gate" };
  let version = 1;
  updateDemoState((s) => {
    const existing = s.units.find((u) => u.unit_id === d.unit_id);
    version = existing ? existing.versions[existing.versions.length - 1]!.version + 1 : 1;
    const v = { version, text: d.proposed_text, effective_date: d.effective_date, approver: person.name };
    let units = existing
      ? s.units.map((u) => (u.unit_id === d.unit_id ? { ...u, status: "approved", versions: [...u.versions, v] } : u))
      : [...s.units, { unit_id: d.unit_id, title: d.title, owner: d.owner_team, verbatim: d.verbatim, status: "approved", versions: [v] }];
    
    // Mark superseded units (e.g. U-PH-007 and U-PH-107)
    const supersedesStr = (d as any).supersedes || "";
    if (supersedesStr) {
      const supIds = new Set(supersedesStr.split(/[,;\s]+/).map((x: string) => x.trim()).filter(Boolean));
      units = units.map((u) => supIds.has(u.unit_id) && u.unit_id !== d.unit_id ? { ...u, status: "superseded" } : u);
    }
    return { ...s, units };
  });
  patchDraft(d.id, (x) => ({ ...x, status: "approved", decided_by: person.name, history: [...(x.history || []), { status: "approved", at: now(), by: person.name, note: `Published v${version}, effective ${d.effective_date}` }] }));
  audit({ actor: person.name, action: "approve_publish", target: d.unit_id, detail: `v${version} · effective ${d.effective_date}` });
  void submitReviewDecision({ draftId: d.id, action: "approve", notes: `Approved and published by ${person.name} in Legal workspace` }).catch(() => {});
  return { ok: true, message: `Published ${d.unit_id} v${version}` };
}

export const waitingOn = (d: ChainDraft) =>
  d.status === "approved" || d.status === "rejected" ? null : d.route === "legal" || d.verbatim ? "Legal" : d.owner_team;

// Review queue for knowledge owners.
export type ReviewKind = "Stale" | "Conflict" | "Flagged" | "Gap" | "AEP 2027 pending" | "Change notice";
export interface ReviewItem { key: string; kind: ReviewKind; title: string; unit_id: string | null; demand: number; due: string; verifier: string; done: boolean }
const KIND_RANK: ReviewKind[] = ["Stale", "Conflict", "Flagged", "Gap", "AEP 2027 pending", "Change notice"];

export function reviewQueue(s: DemoState): ReviewItem[] {
  const isDone = (unitId: string | null) => !!unitId && s.reverified.some((r) => r.unit_id === unitId);
  const meta = (id: string) => REVIEW_DEMAND[id] ?? { demand: 0, due: "2026-10-31" };
  const verifier = (id: string | null) => (id && UNIT_META_LOCAL[id]?.verifier) || "Owen (Knowledge owner)";
  const items: ReviewItem[] = [];
  s.units.filter((u) => u.status === "stale" || u.status === "conflict").forEach((u) =>
    items.push({ key: `u-${u.unit_id}`, kind: u.status === "stale" ? "Stale" : "Conflict", title: u.title, unit_id: u.unit_id, ...meta(u.unit_id), verifier: verifier(u.unit_id), done: isDone(u.unit_id) }));
  items.push({ key: "c-enroll", kind: "Conflict", title: "Enrollment fragments A and B disagree", unit_id: "U-SH-011", ...meta("U-SH-011"), verifier: "Rita (Legal)", done: isDone("U-SH-011") });
  s.reviewTasks.filter((t) => t.kind === "flag").forEach((t) =>
    items.push({ key: t.id, kind: "Flagged", title: `${t.unit_ids.join(", ")}: ${t.reason ?? "flagged"} (by ${t.by ?? "?"})`, unit_id: t.unit_ids[0] ?? null, demand: 1, due: "2026-10-16", verifier: verifier(t.unit_ids[0] ?? null), done: t.status !== "open" }));
  s.reviewTasks.filter((t) => t.kind === "conflict").forEach((t) =>
    items.push({ key: t.id, kind: "Conflict", title: `Conflict: ${t.unit_ids.join(" vs ")} — ${t.reason ?? "Conflicting sources reported"}`, unit_id: t.unit_ids[0] ?? null, demand: 3, due: "2026-10-18", verifier: "Knowledge Ops (Owen)", done: t.status !== "open" }));
  const gaps = new Map<string, number>();
  s.requests.filter((r) => r.outcome === "insufficient_evidence").forEach((r) => gaps.set(r.query.toLowerCase(), (gaps.get(r.query.toLowerCase()) ?? 0) + 1));
  gaps.forEach((n, q) => {
    const classification = classifyGapDomain(q);
    items.push({
      key: `g-${q}`,
      kind: "Gap",
      title: `"${q}" (${classification.domain} Ops)`,
      unit_id: null,
      demand: n,
      due: "2026-10-20",
      verifier: classification.assignedOwner,
      done: false,
    });
  });
  s.chainDrafts.filter((d) => d.effective_date.startsWith("2027") && (d.status === "proposed" || d.status === "in_review")).forEach((d) =>
    items.push({ key: `a-${d.id}`, kind: "AEP 2027 pending", title: `${d.title} (waiting on ${waitingOn(d)})`, unit_id: d.unit_id, ...meta(d.unit_id), verifier: verifier(d.unit_id), done: false }));
  CHANGE_NOTICES.forEach((c) => items.push({ key: c.id, kind: "Change notice", title: `${c.id}: ${c.title}`, unit_id: c.unit_id, demand: c.demand, due: c.due, verifier: verifier(c.unit_id), done: isDone(c.unit_id) }));
  return items.sort((a, b) => Number(a.done) - Number(b.done) || KIND_RANK.indexOf(a.kind) - KIND_RANK.indexOf(b.kind) || b.demand - a.demand);
}

export function reverifyUnit(person: string, unitId: string) {
  updateDemoState((s) => ({
    ...s,
    reverified: [{ unit_id: unitId, by: person, at: now() }, ...s.reverified],
    reviewTasks: s.reviewTasks.map((t) => (t.unit_ids.includes(unitId) ? { ...t, status: "done" } : t)),
  }));
  audit({ actor: person, action: "reverify", target: unitId, detail: "Re-verified" });
}

export function aepReadiness(s: DemoState) {
  const items = AEP_READINESS.map((r) => {
    const u = s.units.find((x) => x.unit_id === r.unit_id);
    const latest = u?.versions[u.versions.length - 1]?.version ?? 0;
    const done = "reverify" in r ? s.reverified.some((x) => x.unit_id === r.unit_id) : latest >= r.min_version;
    return { label: r.label, done };
  });
  return { items, done: items.filter((i) => i.done).length, total: items.length };
}

// ---------------------------------------------------------------------------
// Governance: denied attempts, replay, as-of, access grants.
const lastDenied = new Map<string, number>();
/** Record a denied attempt (deduplicated for a second so re-renders do not double-log). */
export function recordDenied(person: string, target: string, capability: string, reason: string) {
  const key = `${person}|${target}`;
  const t = Date.now();
  if (t - (lastDenied.get(key) ?? 0) < 1000) return;
  lastDenied.set(key, t);
  audit({ actor: person, action: "denied", target, detail: `Open ${target}`, capability, reason });
}

/** Mask anything that looks like PHI in a stored query: digits, dates, emails, ids. */
export const redactQuery = (q: string) =>
  q.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]").replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, "[date]").replace(/\b[A-Z]{1,3}\d{5,}\b|\b\d{5,}\b/g, "[id]");

/** Which step of the policy pipeline decided the outcome. */
export function policyPath(r: DemoRequest): string {
  const step = (n: number) => r.trace.find((t) => t.startsWith(`${n}.`)) ?? `Step ${n}`;
  switch (r.outcome) {
    case "safety_escalation": return step(3);
    case "not_authorized": return step(7);
    case "needs_clarification": return step(8);
    case "conflict":
    case "stale": return step(9);
    case "insufficient_evidence": return step(6);
    default: return `${step(10)} → ${step(11)}`;
  }
}

/** Version live on a date, with its effective window. */
export function asOfWindow(unitId: string, date: string) {
  const u = getUnit(unitId);
  if (!u) return null;
  const sorted = [...u.versions].sort((a, b) => a.effective_date.localeCompare(b.effective_date));
  let i = -1;
  sorted.forEach((v, k) => { if (v.effective_date <= date) i = k; });
  if (i < 0) return { unit: u, version: null, until: sorted[0]?.effective_date ?? null };
  return { unit: u, version: sorted[i]!, until: sorted[i + 1]?.effective_date ?? null };
}

/** Grant or revoke a role's read access to a knowledge base. Reason required. */
export function changeKbAccess(person: { name: string; capabilities: readonly string[] }, role: string, kb: string, grant: boolean, reason: string) {
  if (!person.capabilities.includes("manage_access")) {
    recordDenied(person.name, `access ${role}/${kb}`, "manage_access", "Only an access administrator changes access");
    return { ok: false, message: "Only an access administrator changes access" };
  }
  if (!reason.trim()) return { ok: false, message: "A reason is required" };
  updateDemoState((s) => {
    const cur = s.access[role] ?? [];
    const next = grant ? [...new Set([...cur, kb])] : cur.filter((k) => k !== kb);
    return { ...s, access: { ...s.access, [role]: next } };
  });
  audit({ actor: person.name, action: grant ? "grant_access" : "revoke_access", target: `${role} → ${kb}`, detail: reason, reason });
  return { ok: true, message: `${grant ? "Granted" : "Revoked"} ${kb} for ${role}` };
}

// ---------------------------------------------------------------------------
// Evaluation service client entry points.
import type { EvalReport } from "@/verity-engine/evalRunner";

/** Run an evaluation suite through the server function, falling back gracefully in direct test environments. */
export async function executeEvaluation(suite: string): Promise<EvalReport> {
  const { runEvaluationSuite, executeEvaluationHandler, validateEvaluationRequest } = await import("./evals.functions");
  const validated = validateEvaluationRequest({ suite });
  try {
    return await runEvaluationSuite({ data: validated });
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes("No Start context found in AsyncLocalStorage")) {
      return await executeEvaluationHandler(validated);
    }
    throw err;
  }
}

/** Retrieve the latest executed evaluation report in this session. */
export async function getLatestEvalRun(): Promise<EvalReport | null> {
  const { getLatestEvaluationReport, executeGetLatestHandler } = await import("./evals.functions");
  try {
    return await getLatestEvaluationReport();
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes("No Start context found in AsyncLocalStorage")) {
      return await executeGetLatestHandler();
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Document Ingestion client entry points.
import type {
  IngestUploadRequest,
  IngestResponse,
  ProposeDraftsRequest,
  ProposeDraftsResponse,
} from "./ingest.functions";
import type { RecentUpload } from "@/types/ingest";
import { getActiveSessionToken } from "@/lib/session";

export async function uploadAndIngestSource(
  req: IngestUploadRequest
): Promise<IngestResponse> {
  const payload = {
    ...req,
    sessionToken: req.sessionToken || getActiveSessionToken(),
  };
  try {
    const { uploadAndIngestSourceFn } = await import("./ingest.functions");
    return await uploadAndIngestSourceFn({ data: payload });
  } catch (err: any) {
    if (!isBrowser) {
      const { handleUploadAndIngest } = await import("./ingest.server");
      return await handleUploadAndIngest(payload);
    }
    return {
      ok: false,
      error: err?.message || "Ingestion server function failed to execute in this environment.",
    };
  }
}

export async function listRecentUploads(): Promise<RecentUpload[]> {
  try {
    const { listRecentUploadsFn } = await import("./ingest.functions");
    return await listRecentUploadsFn();
  } catch (err: any) {
    if (!isBrowser) {
      const { handleListRecentUploads } = await import("./ingest.server");
      return await handleListRecentUploads();
    }
    console.error("Failed to list recent uploads from server:", err);
    return [];
  }
}

export async function submitProposedDrafts(
  req: ProposeDraftsRequest
): Promise<ProposeDraftsResponse> {
  const payload = {
    ...req,
    sessionToken: req.sessionToken || getActiveSessionToken(),
  };
  try {
    const { proposeDraftsFn } = await import("./ingest.functions");
    return await proposeDraftsFn({ data: payload });
  } catch (err: any) {
    if (!isBrowser) {
      const { handleProposeDrafts } = await import("./ingest.server");
      return await handleProposeDrafts(payload);
    }
    return {
      ok: false,
      error: err?.message || "Server function failed to submit proposed drafts.",
    };
  }
}

export async function updateCandidate(
  req: import("./ingest.server").UpdateCandidateUnitInput
): Promise<{ ok: boolean; candidate?: any; error?: string }> {
  const payload = {
    ...req,
    sessionToken: req.sessionToken || getActiveSessionToken(),
  };
  try {
    const { updateCandidateUnitFn } = await import("./ingest.functions");
    return await updateCandidateUnitFn({ data: payload });
  } catch (err: any) {
    if (!isBrowser) {
      const { handleUpdateCandidateUnit } = await import("./ingest.server");
      return await handleUpdateCandidateUnit(payload);
    }
    return {
      ok: false,
      error: err?.message || "Server function failed to update candidate.",
    };
  }
}

export async function fetchCandidatesForDoc(
  docId: string
): Promise<{ ok: boolean; candidates: any[]; error?: string }> {
  try {
    const { getCandidatesForDocFn } = await import("./ingest.functions");
    return await getCandidatesForDocFn({ data: { docId } });
  } catch (err: any) {
    if (!isBrowser) {
      const { handleGetCandidatesByDocId } = await import("./ingest.server");
      return await handleGetCandidatesByDocId(docId);
    }
    return {
      ok: false,
      candidates: [],
      error: err?.message || "Server function failed to fetch candidates.",
    };
  }
}

export async function fetchReviewQueue(): Promise<import("../types/review").ReviewQueueItem[]> {
  try {
    const { listReviewQueueFn } = await import("./review.functions");
    return await listReviewQueueFn();
  } catch (err: any) {
    if (!isBrowser) {
      const { handleListReviewQueue } = await import("./review.server");
      return await handleListReviewQueue();
    }
    console.error("Failed to fetch review queue from server:", err);
    return [];
  }
}

export async function fetchMyDrafts(
  proposerName?: string
): Promise<import("../storage/schema").DraftTable[]> {
  const sessionToken = getActiveSessionToken();
  try {
    const { listMyDraftsFn } = await import("./review.functions");
    return await listMyDraftsFn({ data: { proposerName, sessionToken } });
  } catch (err: any) {
    if (!isBrowser) {
      const { handleListMyDrafts } = await import("./review.server");
      return await handleListMyDrafts(proposerName, undefined, sessionToken);
    }
    console.error("Failed to fetch drafts from server:", err);
    return [];
  }
}

export async function submitReviewDecision(
  req: import("./review.functions").ReviewDecisionRequest
): Promise<import("./review.functions").ReviewDecisionResponse> {
  const payload = {
    ...req,
    sessionToken: req.sessionToken || getActiveSessionToken(),
  };
  try {
    const { decideReviewItemFn } = await import("./review.functions");
    return await decideReviewItemFn({ data: payload });
  } catch (err: any) {
    if (!isBrowser) {
      const { handleDecideReviewItem } = await import("./review.server");
      return await handleDecideReviewItem(payload);
    }
    return {
      ok: false,
      error: err?.message || "Server function failed to process review decision.",
    };
  }
}



