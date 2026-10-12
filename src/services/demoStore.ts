// Shared in-memory demo store: one module-level state for the whole app,
// NOT per person. Switching person never resets it; only resetDemoStore() does.
import { createContext, createElement, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { Outcome } from "./verity";
import { seedDemoState, registerDemoStoreGetter } from "./mockData";

export interface CitedUnit { unit_id: string; version: number; title: string; approver: string | null }
export interface DemoRequest {
  id: string;
  at: string;
  query: string;
  person: string;
  context: { role: string; channel: string; lob: string | null; state: string | null; plan_year?: string | null; input_mode: string };
  outcome: Outcome;
  trace: string[];
  cited: CitedUnit[];
}
export interface DemoUnitVersion { version: number; text: string; effective_date: string; approver: string; supersedes?: string | undefined }
export interface DemoUnit { unit_id: string; title: string; owner: string; verbatim: boolean; status: string; versions: DemoUnitVersion[] }
export interface DemoDraft { draft_id: string; unit_id: string; title: string; status: string; proposed_by: string; decided_by: string | null }
export interface PublishSignal {
  unit_id: string;
  version: number;
  from_version?: number;
  title: string;
  at: string;
  by: string;
  channels: string[];
}

export interface DemoReviewTask {
  id: string;
  kind: string;
  unit_ids: string[];
  owner: string;
  status: string;
  request_id?: string;
  reason?: string;
  by?: string;
  versions?: number[];
  query?: string;
  role?: string;
  at?: string;
}
export interface DemoAudit {
  at: string;
  actor: string;
  action: string;
  target?: string;
  detail?: string;
  capability?: string;
  reason?: string;
}

export interface DemoReadEvent { at: string; person: string; request_id: string | null; unit_id: string }
export interface DemoFeedback { at: string; request_id: string; person: string; rating: "up" | "down" | "flag"; note: string | null }

/** Authoring chain (Dana → Rita → Owen). */
export type ChainStatus = "proposed" | "in_review" | "approved" | "rejected";
export interface GateCase { case: string; was: string; now: string }
export interface GateResult { checked: number; blocking: GateCase[]; blocked_reason?: string }
export interface ChainDraft {
  id: string;
  cid: string;
  unit_id: string;
  title: string;
  current_text: string | null;
  proposed_text: string;
  verbatim: boolean;
  route: "legal" | "owner";
  owner_team: string;
  effective_date: string;
  tags: string[];
  proposed_by: string;
  status: ChainStatus;
  gate: GateResult | null;
  reason: string | null;
  decided_by: string | null;
  history: { status: ChainStatus | "edited"; at: string; by: string; note?: string }[];
}

export interface SynonymEntry {
  id: string;
  term: string;
  expansion: string;
  category: "acronym" | "humana_speak" | "spelling";
  enabled: boolean;
  created_at: string;
  updated_at?: string;
  updated_by?: string;
  suggested_from?: string;
}

export interface CandidateSynonym {
  id: string;
  term: string;
  suggested_expansion: string;
  evidence: string;
  status: "candidate" | "approved" | "dismissed";
}

export interface GapDispositionRecord {
  disposition: "unit_created" | "process_fix";
  reason: string;
  system_note?: string | undefined;
  by: string;
  at: string;
}

export interface MergeProposal {
  id: string;
  source_unit_id: string;
  target_unit_id: string;
  similarity: number;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  proposed_at: string;
  decided_by?: string;
  decided_at?: string;
  draft_id?: string;
}

export interface SplitSuggestion {
  id: string;
  source_unit_id: string;
  reason: string;
  candidate_splits: Array<{ title: string; span: string }>;
  status: "pending" | "accepted" | "rejected";
}

export interface DemoState {
  /** Increments on every reset so screens can reload. */
  epoch: number;
  requests: DemoRequest[];
  readEvents: DemoReadEvent[];
  drafts: DemoDraft[];
  units: DemoUnit[];
  audit: DemoAudit[];
  reviewTasks: DemoReviewTask[];
  feedback: DemoFeedback[];
  chainDrafts: ChainDraft[];
  reverified: { unit_id: string; by: string; at: string }[];
  /** Entitlements: role → knowledge bases it may read. */
  access: Record<string, string[]>;
  latestPublishSignal?: PublishSignal | null;
  publishSignals?: PublishSignal[];
  synonyms: SynonymEntry[];
  candidateSynonyms?: CandidateSynonym[];
  gapDispositions?: Record<string, GapDispositionRecord>;
  mergeProposals?: MergeProposal[];
  splitSuggestions?: SplitSuggestion[];
}

let state: DemoState = seedDemoState();
const listeners = new Set<() => void>();

export const getDemoState = () => state;
registerDemoStoreGetter(getDemoState);
export function updateDemoState(fn: (s: DemoState) => DemoState) {
  state = fn(state);
  listeners.forEach((l) => l());
}
export function resetDemoStore() {
  updateDemoState((s) => ({ ...seedDemoState(), epoch: s.epoch + 1 }));
}
export function subscribeDemoStore(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

const DemoStoreContext = createContext<{ reset: () => void } | null>(null);

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  return createElement(DemoStoreContext.Provider, { value: { reset: resetDemoStore } }, children);
}

/** Read the shared store; re-renders on every change. */
export function useDemoStore<T>(select: (s: DemoState) => T): T {
  if (!useContext(DemoStoreContext)) throw new Error("useDemoStore must be used within DemoStoreProvider");
  return useSyncExternalStore(subscribeDemoStore, () => select(state), () => select(state));
}
