// Shared in-memory demo store: one module-level state for the whole app,
// NOT per person. Switching person never resets it; only resetDemoStore() does.
import { createContext, createElement, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { Outcome } from "./verity";
import { seedDemoState } from "./mockData";

export interface CitedUnit { unit_id: string; version: number; title: string; approver: string | null }
export interface DemoRequest {
  id: string;
  at: string;
  query: string;
  person: string;
  context: { role: string; channel: string; lob: string | null; state: string | null; input_mode: string };
  outcome: Outcome;
  trace: string[];
  cited: CitedUnit[];
}
export interface DemoUnitVersion { version: number; text: string; effective_date: string; approver: string }
export interface DemoUnit { unit_id: string; title: string; owner: string; verbatim: boolean; status: string; versions: DemoUnitVersion[] }
export interface DemoDraft { draft_id: string; unit_id: string; title: string; status: string; proposed_by: string; decided_by: string | null }
export interface DemoAudit { at: string; actor: string; action: string; target: string; detail: string }
export interface DemoReviewTask { id: string; kind: string; unit_ids: string[]; owner: string; status: string }
export interface DemoFeedback { at: string; request_id: string; person: string; rating: "up" | "down" | "flag"; note: string | null }

export interface DemoState {
  /** Increments on every reset so screens can reload. */
  epoch: number;
  requests: DemoRequest[];
  drafts: DemoDraft[];
  units: DemoUnit[];
  audit: DemoAudit[];
  reviewTasks: DemoReviewTask[];
  feedback: DemoFeedback[];
}

let state: DemoState = seedDemoState();
const listeners = new Set<() => void>();

export const getDemoState = () => state;
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
