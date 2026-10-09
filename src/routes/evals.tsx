import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RequirePage } from "@/components/shell/Denied";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { CheckCircle2, Circle } from "lucide-react";
import { ACCURACY, FAILURES, GATE, SETS, STATS } from "@/data/evals";

export const Route = createFileRoute("/evals")({
  head: () => ({
    meta: [
      { title: "Evals — Verity" },
      { name: "description", content: "Verity evaluation results, release gate and failure log." },
      { property: "og:title", content: "Evals — Verity" },
      {
        property: "og:description",
        content: "Verity evaluation results, release gate and failure log.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GuardedEvalsPage,
});

function EvalsPage() {
  const [filter, setFilter] = useState("all");
  const open = FAILURES.filter((f) => f.status === "Open").length;
  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Quality & evaluations</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Compare evaluation sets and investigate outstanding failures.
        </p>
      </div>
      <p className="rounded border border-border bg-surface-alt px-3 py-2 text-sm text-ink-muted">
        Synthetic data. These are smoke tests, not a launch gate.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SETS.map((s) => (
          <div key={s.name} className="rounded-md border border-border bg-surface p-5">
            <p className="font-semibold">
              {s.name} <span className="text-sm font-normal text-ink-muted">({s.cases} cases)</span>
            </p>
            <p className="text-xs text-ink-muted">{s.note}</p>
            <p className="mt-2 text-lg font-semibold text-brand-green-dark">{s.result}</p>
            <p
              className={`mt-1 text-sm font-semibold ${s.critical ? "text-destructive" : "text-brand-green-dark"}`}
            >
              {s.critical} critical {s.critical ? "open" : ""}
            </p>
            {s.extra && <p className="mt-1 text-sm text-ink-muted">{s.extra}</p>}
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-md border border-border bg-surface p-5">
            <p className="text-3xl font-semibold text-brand-green-dark">{s.value}</p>
            <p className="mt-1 text-sm text-ink-muted">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="border-y border-border py-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Outcome accuracy (%)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ACCURACY}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="value" label={{ position: "top" }}>
                  {ACCURACY.map((a) => (
                    <Cell key={a.name} fill={a.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-md border border-border bg-surface p-5">
          <h2 className="mb-4 font-semibold">Release gate (golden set)</h2>
          <ul className="space-y-2">
            {GATE.map((g) => (
              <li key={g} className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-brand-green-dark" aria-label="Pass" /> {g}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded bg-surface-alt px-3 py-2 font-bold text-brand-green-dark">
            Release gates: PASS
          </p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="font-semibold">
            Failure log <span className="text-sm font-normal text-ink-muted">({open} open)</span>
          </h2>
          <select
            aria-label="Failure status"
            className="field-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All failures</option>
            <option value="Open">Open</option>
            <option value="Fixed">Fixed</option>
          </select>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-alt text-ink-muted">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Symptom</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {FAILURES.filter((f) => filter === "all" || f.status === filter).map((f) => (
              <tr key={f.id} className="border-t border-border">
                <td className="px-4 py-2 font-mono">{f.id}</td>
                <td className="px-4 py-2">{f.symptom}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${f.status === "Fixed" ? "text-brand-green-dark" : "text-outcome-insufficient"}`}
                  >
                    {f.status === "Fixed" ? (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Circle className="h-4 w-4" aria-hidden="true" />
                    )}{" "}
                    {f.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GuardedEvalsPage() {
  return (
    <RequirePage to="/evals">
      <EvalsPage />
    </RequirePage>
  );
}
