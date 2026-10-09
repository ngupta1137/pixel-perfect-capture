import { mockSearch, UNIT_META as UNIT_META_LOCAL } from "./mockData";
import personasFile from "@/data/personas.json";
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
  // Fixtures are the answer source; VITE_VERITY_ENGINE=engine runs src/verity-engine instead.
  if (import.meta.env["VITE_VERITY_ENGINE"] !== "engine") {
    await new Promise((r) => setTimeout(r, 400));
    return mockSearch(req);
  }
  try {
    const { runSearch } = await import("./engine.functions");
    return await runSearch({ data: req });
  } catch (err) {
    console.error("Verity engine unavailable, using fixtures", err);
    const r = mockSearch(req);
    return { ...r, engine: "fixtures (engine unavailable)" };
  }
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
  try {
    syncAuthoring((await (await fns()).resetDemoFn()).state);
  } catch (err) {
    console.error("Engine reset unavailable", err);
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
  const d = getDemoState().chainDrafts.find((x) => x.id === id);
  if (!d) return { ok: false, message: "Draft not found" };
  const blocker = decideBlocker(person, d);
  if (blocker) return { ok: false, message: blocker };
  if (decision === "reject") {
    if (!reason.trim()) return { ok: false, message: "A reason is required to reject" };
    patchDraft(id, (x) => ({ ...x, status: "rejected", reason, decided_by: person.name, history: [...x.history, { status: "rejected", at: now(), by: person.name, note: reason }] }));
    audit({ actor: person.name, action: "reject", target: d.unit_id, detail: reason });
    return { ok: true, message: "Rejected" };
  }
  if (d.gate?.blocking.length) return { ok: false, message: d.gate.blocked_reason ?? "Blocked by the publication gate" };
  let version = 1;
  updateDemoState((s) => {
    const existing = s.units.find((u) => u.unit_id === d.unit_id);
    version = existing ? existing.versions[existing.versions.length - 1]!.version + 1 : 1;
    const v = { version, text: d.proposed_text, effective_date: d.effective_date, approver: person.name };
    const units = existing
      ? s.units.map((u) => (u.unit_id === d.unit_id ? { ...u, status: "approved", versions: [...u.versions, v] } : u))
      : [...s.units, { unit_id: d.unit_id, title: d.title, owner: d.owner_team, verbatim: d.verbatim, status: "approved", versions: [v] }];
    return { ...s, units };
  });
  patchDraft(id, (x) => ({ ...x, status: "approved", decided_by: person.name, history: [...x.history, { status: "approved", at: now(), by: person.name, note: `Published v${version}, effective ${d.effective_date}` }] }));
  audit({ actor: person.name, action: "approve_publish", target: d.unit_id, detail: `v${version} · effective ${d.effective_date}` });
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
  const gaps = new Map<string, number>();
  s.requests.filter((r) => r.outcome === "insufficient_evidence").forEach((r) => gaps.set(r.query.toLowerCase(), (gaps.get(r.query.toLowerCase()) ?? 0) + 1));
  gaps.forEach((n, q) => items.push({ key: `g-${q}`, kind: "Gap", title: `"${q}"`, unit_id: null, demand: n, due: "2026-10-20", verifier: "Unassigned", done: false }));
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
