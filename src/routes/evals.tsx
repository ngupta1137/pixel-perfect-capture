import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { CheckCircle2, Circle } from "lucide-react";
import { ACCURACY, FAILURES, GATE, STATS } from "@/data/evals";

export const Route = createFileRoute("/evals")({
  head: () => ({
    meta: [
      { title: "Evals — Verity" },
      { name: "description", content: "Verity evaluation results, release gate and failure log." },
      { property: "og:title", content: "Evals — Verity" },
      { property: "og:description", content: "Verity evaluation results, release gate and failure log." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EvalsPage,
});

function EvalsPage() {
  return (
    <section className="space-y-8">
      <h1 className="text-2xl font-semibold">Evals</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-lg border border-border p-4">
            <p className="text-3xl font-semibold text-brand-green-dark">{s.value}</p>
            <p className="mt-1 text-sm text-ink-muted">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border p-4 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Outcome accuracy (%)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ACCURACY}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="value" label={{ position: "top" }}>
                  {ACCURACY.map((a) => <Cell key={a.name} fill={a.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <h2 className="mb-4 font-semibold">Release gate</h2>
          <ul className="space-y-2">
            {GATE.map((g) => (
              <li key={g} className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-brand-green-dark" aria-label="Pass" /> {g}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded bg-surface-alt px-3 py-2 font-bold text-brand-green-dark">Release: PASS</p>
        </div>
      </div>
      <div className="rounded-lg border border-border">
        <h2 className="border-b border-border px-4 py-3 font-semibold">Failure log</h2>
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-alt text-ink-muted">
            <tr><th className="px-4 py-2">ID</th><th className="px-4 py-2">Symptom</th><th className="px-4 py-2">Status</th></tr>
          </thead>
          <tbody>
            {FAILURES.map((f) => (
              <tr key={f.id} className="border-t border-border">
                <td className="px-4 py-2 font-mono">{f.id}</td>
                <td className="px-4 py-2">{f.symptom}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center gap-1 font-semibold ${f.status === "Fixed" ? "text-brand-green-dark" : "text-outcome-insufficient"}`}>
                    {f.status === "Fixed" ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />} {f.status}
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
