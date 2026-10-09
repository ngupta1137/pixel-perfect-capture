import { BadgeCheck, Clock, GitCompare } from "lucide-react";

const META = {
  approved: { label: "Approved", icon: BadgeCheck, cls: "border-outcome-answer text-outcome-answer" },
  stale: { label: "Stale", icon: Clock, cls: "border-outcome-stale text-outcome-stale bg-surface-alt" },
  conflict: { label: "Conflict", icon: GitCompare, cls: "border-outcome-conflict text-outcome-conflict" },
} as const;

/** How much to trust the source content, shown next to the outcome pill. */
export function TrustBadge({ trust }: { trust: keyof typeof META }) {
  const m = META[trust];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold ${m.cls}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" /> Trust · {m.label}
    </span>
  );
}
