import { createFileRoute } from "@tanstack/react-router";
import { Info } from "lucide-react";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Agents — Verity" },
      { name: "description", content: "Same rules for agents: Verity MCP tools and call log." },
      { property: "og:title", content: "Agents — Verity" },
      { property: "og:description", content: "Same rules for agents: Verity MCP tools and call log." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentsPage,
});

const TOOLS = [
  { name: "search_knowledge", desc: "Ask a question and get the same governed outcome a human advocate gets." },
  { name: "get_unit", desc: "Fetch one approved knowledge unit by ID, if the caller's role allows it." },
  { name: "report_gap", desc: "Log a question Verity could not answer for the knowledge team." },
  { name: "list_changes", desc: "List units that changed, were retired or flagged since a given time." },
];

const LOG = [
  { time: "09:14:02", iface: "MCP", principal: "agent:agent-assist-demo", role: "insurance_advocate", tool: "get_unit U-IN-002", outcome: "not_authorized" },
  { time: "09:15:37", iface: "MCP", principal: "agent:agent-assist-demo", role: "pharmacy_advocate", tool: 'search_knowledge "rx pricing disclaimer"', outcome: "answer" },
  { time: "09:17:10", iface: "REST", principal: "svc:ivr-gateway", role: "pharmacy_advocate", tool: 'search "how many days supply"', outcome: "conflict" },
];

function AgentsPage() {
  return (
    <section className="space-y-8">
      <h1 className="text-2xl font-semibold">Same rules for agents (MCP)</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TOOLS.map((t) => (
          <div key={t.name} className="rounded-lg border border-border p-4">
            <p className="font-mono font-semibold text-brand-green-dark">{t.name}</p>
            <p className="mt-2 text-sm text-ink-muted">{t.desc}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <h2 className="border-b border-border px-4 py-3 font-semibold">Call log</h2>
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-alt text-ink-muted">
            <tr>{["Time", "Interface", "Principal", "Role", "Tool", "Outcome"].map((h) => <th key={h} className="px-4 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {LOG.map((r) => (
              <tr key={r.time} className="border-t border-border">
                <td className="px-4 py-2 font-mono">{r.time}</td>
                <td className="px-4 py-2">{r.iface}</td>
                <td className="px-4 py-2 font-mono">{r.principal}</td>
                <td className="px-4 py-2">{r.role}</td>
                <td className="px-4 py-2 font-mono">{r.tool}</td>
                <td className="px-4 py-2 font-semibold">{r.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex items-start gap-2 rounded-md bg-surface-alt p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        The agent's role comes from its connection, never from a tool argument. PHI is redacted before anything is logged.
      </p>
    </section>
  );
}
