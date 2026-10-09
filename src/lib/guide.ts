// Module-level demo guide state. The app works without it; the rail only reads/writes here.
import { useSyncExternalStore } from "react";
import { GUIDE_STEPS, type GuideAction } from "@/data/guide";

export interface AskCommand {
  id: number;
  personId: string;
  query: string;
  context?: GuideAction["context"] | undefined;
  thenPlanYear?: string | undefined;
  record?: string | undefined;
}

interface GuideState {
  open: boolean;
  collapsed: boolean;
  step: number; // 0-based
  command: AskCommand | null;
  recorded: Record<string, string>;
}

let state: GuideState = { open: false, collapsed: false, step: 0, command: null, recorded: {} };
const listeners = new Set<() => void>();
const set = (patch: Partial<GuideState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const guide = {
  get: () => state,
  toggle: () => set({ open: !state.open, collapsed: false }),
  open: (step?: number) => set({ open: true, collapsed: false, ...(step !== undefined ? { step } : {}) }),
  close: () => set({ open: false }),
  setCollapsed: (collapsed: boolean) => set({ collapsed }),
  goto: (step: number) => set({ step: Math.max(0, Math.min(GUIDE_STEPS.length - 1, step)) }),
  issue: (c: Omit<AskCommand, "id">) => set({ command: { ...c, id: Date.now() } }),
  consume: (id: number) => {
    if (state.command?.id === id) set({ command: null });
  },
  record: (key: string, requestId: string) => set({ recorded: { ...state.recorded, [key]: requestId } }),
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useGuide<T>(select: (s: GuideState) => T): T {
  return useSyncExternalStore(guide.subscribe, () => select(state), () => select(state));
}
