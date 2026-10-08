import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutcomeCard } from "@/components/ask/OutcomeCard";
import { TraceDrawer } from "@/components/ask/TraceDrawer";
import { OutcomePill } from "@/components/ask/outcomeMeta";
import { PERSONAS, useSession } from "@/lib/session";
import { search, type Outcome, type SearchResponse } from "@/services/verity";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ask — Verity" },
      { name: "description", content: "Verity: one approved truth, in every channel. Governed knowledge search for advocates." },
      { property: "og:title", content: "Ask — Verity" },
      { property: "og:description", content: "One approved truth, in every channel." },
    ],
  }),
  component: AskPage,
});

const EXAMPLES = [
  "Rx pricing disclaimer",
  "closing statement",
  "how many days supply can I get by mail",
  "is there a copay assistance program",
  "is there a shipping fee for mail order",
  "I have chest pain, can you rush my heart pills",
];

interface HistoryItem { id: string; query: string; personaId: string; personaName: string; outcome: Outcome }

function AskPage() {
  const { persona, channel, setPersona } = useSession();
  const [query, setQuery] = useState("");
  const [lob, setLob] = useState("MAPD");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<SearchResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const run = async (q: string, p = persona) => {
    if (!q.trim()) return;
    setLoading(true);
    const r = await search({ query: q, role: p.role, channel: p.role === "member_chat" && channel === "advocate_view" ? "member_chat" : channel, input_mode: "typed", lob, state: state || null });
    setRes(r);
    setLoading(false);
    setHistory((h) => [{ id: r.request_id, query: q, personaId: p.id, personaName: p.name, outcome: r.outcome }, ...h].slice(0, 8));
  };

  const submit = (e: FormEvent) => { e.preventDefault(); run(query); };
  const safety = res?.outcome === "safety_escalation";
  const clarify = res?.outcome === "needs_clarification";

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_16rem]">
      <section className="min-w-0">
        <form onSubmit={submit} className="flex gap-2">
          <label htmlFor="ask" className="sr-only">Ask Verity</label>
          <input
            id="ask"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask Verity..."
            className="h-14 flex-1 rounded-lg border border-border bg-surface px-4 text-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" size="lg" className="h-14 px-6" disabled={loading}>
            Ask <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2 text-ink-muted">
            Line of business
            <select className="field-select" value={lob} onChange={(e) => setLob(e.target.value)}>
              <option value="MAPD">MAPD</option>
              <option value="PDP">PDP</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-ink-muted">
            State
            <select
              className={`field-select ${clarify ? "ring-2 ring-outcome-clarify border-outcome-clarify" : ""}`}
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="">Unknown</option>
              <option value="KY">KY</option>
              <option value="FL">FL</option>
              <option value="OH">OH</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setQuery(ex)}
              className="rounded-full border border-border bg-surface-alt px-3 py-1 text-sm text-ink hover:border-brand-green-dark"
            >
              {ex}
            </button>
          ))}
        </div>

        <div className="mt-10 space-y-4" aria-live="polite">
          {loading && (
            <div className="animate-pulse rounded-lg border border-border p-6">
              <div className="h-6 w-28 rounded-full bg-surface-alt" />
              <div className="mt-5 h-5 w-full rounded bg-surface-alt" />
              <div className="mt-2 h-5 w-2/3 rounded bg-surface-alt" />
            </div>
          )}
          {!loading && res && (
            <>
              {res.parts.map((p) => <OutcomeCard key={p.part} part={p} />)}
              <TraceDrawer res={res} />
            </>
          )}
        </div>
      </section>

      {!safety && (
        <aside>
          <h2 className="text-sm font-semibold text-ink-muted">Session history</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">No questions yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {history.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => { setPersona(h.personaId); setQuery(h.query); run(h.query, PERSONAS.find((x) => x.id === h.personaId) ?? persona); }}
                    className="w-full rounded-md border border-border p-3 text-left hover:bg-surface-alt"
                  >
                    <p className="truncate text-sm font-semibold">{h.query}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-xs text-ink-muted">{h.personaName}</span>
                      <OutcomePill outcome={h.outcome} size="sm" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}
    </div>
  );
}
