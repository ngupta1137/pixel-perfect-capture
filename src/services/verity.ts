import { mockSearch } from "./mockData";

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
}

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
}

/**
 * The only entry point the UI uses to get data.
 * Default: the real Verity engine, run server-side (src/verity-engine).
 * VITE_VERITY_ENGINE=mock switches to the canned fixtures. If the engine call
 * fails, the fixtures answer and the trace drawer's engine line says so.
 */
export async function search(req: SearchRequest): Promise<SearchResponse> {
  if (import.meta.env["VITE_VERITY_ENGINE"] === "mock") {
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
  const res = await search(req);
  const units = getDemoState().units;
  const record: DemoRequest = {
    id: res.request_id,
    at: now(),
    query: req.query,
    person,
    context: { role: req.role, channel: req.channel, lob: req.lob ?? null, state: req.state ?? null, input_mode: req.input_mode ?? "typed" },
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
      reviewTasks: a.reviews.map((r) => ({ id: r.item_id, kind: r.kind, unit_ids: r.unit_ids, owner: r.owner, status: r.status })),
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
