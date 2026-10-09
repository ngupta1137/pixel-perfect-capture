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
  plan_year?: 2026 | 2027;
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

/* Fixture-backed UI services. Screens call these, never mockData directly. */
export async function getAepStatus() {
  const { AEP_STATUS } = await import("./mockData");
  return AEP_STATUS;
}
export async function getEscalations() {
  const { ESCALATIONS } = await import("./mockData");
  return ESCALATIONS;
}
export async function browseUnits(scope: string[], planYear: 2026 | 2027) {
  const { unitsInScope } = await import("./mockData");
  return unitsInScope(scope, planYear);
}
export async function getUnit(unitId: string, version?: number) {
  const { findUnit } = await import("./mockData");
  return findUnit(unitId, version) ?? null;
}
export async function recordRead(unitId: string, version: number, person: string) {
  const { recordReadEvent } = await import("./mockData");
  return recordReadEvent(unitId, version, person);
}
export async function flagAnswer(unitId: string | null, reason: string) {
  const m = await import("./mockData");
  return m.flagAnswer(unitId, reason);
}
