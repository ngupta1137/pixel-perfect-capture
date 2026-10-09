import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RequirePage } from "@/components/shell/Denied";
import { useDemoStore } from "@/services/demoStore";
import { aepReadiness } from "@/services/verity";

export const Route = createFileRoute("/health")({
  head: () => ({
    meta: [
      { title: "Program health — Verity" },
      { name: "description", content: "Aggregate health of the Verity program: consistency, readiness, backlog age." },
      { property: "og:title", content: "Program health — Verity" },
      { property: "og:description", content: "Aggregate health of the Verity program: consistency, readiness, backlog age." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequirePage to="/health">
      <HealthPage />
    </RequirePage>
  ),
});

function HealthPage() {
  const state = useDemoStore((s) => s);
  const aep = useMemo(() => aepReadiness(state), [state]);
  const tiles = [
    { label: "Verbatim compliance on recorded calls", value: "98.7%" },
    { label: "Cross-channel consistency", value: "100%" },
    { label: "AEP 2027 readiness", value: `${aep.done} of ${aep.total}`, live: true },
    { label: "Oldest unclaimed gap", value: "6 days" },
    { label: "Review time per unit", value: "1.8 days" },
    { label: "Unanswered rate", value: "7.2%" },
  ];
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Program health</h1>
      <p className="rounded border border-border bg-surface-alt px-3 py-2 text-sm text-ink-muted">Aggregates only. No unit text or queries are shown here.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-border p-4">
            <span className="rounded bg-surface-alt px-2 py-0.5 text-xs font-semibold text-ink-muted">Illustrative</span>
            <p className="mt-2 text-3xl font-semibold text-brand-green-dark">{t.value}</p>
            <p className="mt-1 text-sm text-ink-muted">{t.label}{t.live ? " · from the demo data" : ""}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
