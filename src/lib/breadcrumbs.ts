import { useSyncExternalStore } from "react";

let crumbs: string[] = [];
const listeners = new Set<() => void>();

export function setBreadcrumbs(items: string[]) {
  crumbs = items;
  listeners.forEach((l) => l());
}

export function useBreadcrumbs() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => crumbs,
    () => crumbs,
  );
}
