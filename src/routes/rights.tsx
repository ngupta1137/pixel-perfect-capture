import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { RequirePage } from "@/components/shell/Denied";
import { ScopeChips } from "@/components/shell/PersonaPicker";
import { CAPABILITY_TEXT, PEOPLE, type Capability } from "@/lib/rights";

export const Route = createFileRoute("/rights")({
  head: () => ({
    meta: [
      { title: "Rights — Verity" },
      { name: "description", content: "Who can do what in Verity: every person, their capabilities and their knowledge-base scope." },
      { property: "og:title", content: "Rights — Verity" },
      { property: "og:description", content: "Who can do what in Verity: every person, their capabilities and their knowledge-base scope." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequirePage to="/rights">
      <RightsPage />
    </RequirePage>
  ),
});

function RightsPage() {
  const caps = Object.keys(CAPABILITY_TEXT) as Capability[];
  return (
    <section>
      <h1 className="text-2xl font-semibold">Rights</h1>
      <p className="mt-1 text-sm text-ink-muted">Capabilities are what a person may do; scope is where. Read from the policy file.</p>
      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="text-sm">
          <thead className="bg-surface-alt">
            <tr>
              <th className="sticky left-0 bg-surface-alt px-3 py-2 text-left">Person</th>
              {caps.map((c) => (
                <th key={c} title={CAPABILITY_TEXT[c]} className="px-2 py-2 font-mono text-[11px] font-semibold [writing-mode:vertical-rl]">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PEOPLE.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="sticky left-0 min-w-56 bg-surface px-3 py-2">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-ink-muted">{p.label}</p>
                  <div className="mt-1"><ScopeChips kbs={p.kbs} /></div>
                </td>
                {caps.map((c) => (
                  <td key={c} className="px-2 text-center">
                    {p.capabilities.includes(c) ? <Check className="mx-auto h-4 w-4 text-brand-green-dark" aria-label={`${p.name} can ${c}`} /> : <span className="text-ink-muted" aria-hidden>·</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
