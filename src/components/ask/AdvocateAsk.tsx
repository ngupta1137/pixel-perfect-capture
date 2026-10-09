import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { OutcomeCard } from "./OutcomeCard";
import { TraceDrawer } from "./TraceDrawer";
import { ChannelCompare } from "./ChannelCompare";
import { FeedbackRow } from "./FeedbackRow";
import { UnitDrawer } from "./UnitDrawer";
import { BrowsePanel } from "./BrowsePanel";
import { useSession } from "@/lib/session";
import { useBrowserVoice } from "@/hooks/use-browser-voice";
import { getEscalations, recordRead, search, type SearchResponse } from "@/services/verity";
import { toViewPart } from "@/services/mockData";
import type { Escalation } from "@/services/contracts";

const EXAMPLES = [
  "rx pricing disclaimer",
  "how long does mail order take",
  "ID card replacement",
  "how many days supply can I get by mail",
  "is there a copay assistance program",
  "is there a shipping fee for mail order",
];
const STATES = ["KY", "FL", "OH", "TX"];
type PlanYear = 2026 | 2027;
interface Answer { res: SearchResponse; channel: string }

export function AdvocateAsk() {
  const { person, channel, can } = useSession();
  const [query, setQuery] = useState("");
  const [lob, setLob] = useState("MAPD");
  const [state, setState] = useState("");
  const [planYear, setPlanYear] = useState<PlanYear>(2026);
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState<{ unitId: string; version?: number | undefined } | null>(null);
  const [traceOpen, setTraceOpen] = useState(false);
  const [escalations, setEscalations] = useState<Escalation[] | null>(null);
  const scope = `${person.id}:${channel}`;
  const voice = useBrowserVoice(scope);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const pending = useRef(false);
  const supervisorExtras = can("view_trace") && can("view_search_insights");

  useEffect(() => {
    setAnswer(null);
    setLoading(false);
    setError("");
    pending.current = false;
  }, [scope]);
  useEffect(() => {
    if (supervisorExtras) void getEscalations().then(setEscalations);
  }, [supervisorExtras]);

  const run = async (
    q: string,
    opts: { state?: string; planYear?: PlanYear; inputMode?: "typed" | "voice"; openTrace?: boolean } = {},
  ) => {
    if (!q.trim() || pending.current) return;
    voice.stopReading();
    const requestScope = scopeRef.current;
    pending.current = true;
    setLastQuery(q);
    setLoading(true);
    setError("");
    setTraceOpen(Boolean(opts.openTrace));
    try {
      const res = await search({
        query: q,
        role: person.role,
        channel,
        input_mode: opts.inputMode ?? "typed",
        lob,
        state: (opts.state ?? state) || null,
        plan_year: opts.planYear ?? planYear,
      });
      if (scopeRef.current !== requestScope) return;
      setAnswer({ res, channel });
      if (channel === "voice" || res.outcome === "safety_escalation")
        voice.read(res.parts.map((part) => ({ key: `${res.request_id}:${part.part}`, part })));
    } catch {
      if (scopeRef.current === requestScope) setError("Verity could not check this question. Please try again.");
    } finally {
      if (scopeRef.current === requestScope) {
        pending.current = false;
        setLoading(false);
      }
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(query);
  };
  const changePlanYear = (y: PlanYear) => {
    setPlanYear(y);
    if (lastQuery) void run(lastQuery, { planYear: y });
  };
  const chooseState = (s: string) => {
    setState(s);
    void run(lastQuery, { state: s });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <section className="min-w-0">
        <div className="sticky top-0 z-10 -mx-2 mb-6 rounded-lg border border-border bg-surface/95 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-base">
            <label className="flex items-center gap-2">
              Line of business
              <select className="field-select" value={lob} onChange={(e) => setLob(e.target.value)}>
                <option value="MAPD">MAPD</option>
                <option value="PDP">PDP</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              State
              <select
                className={`field-select ${answer?.res.outcome === "needs_clarification" ? "border-outcome-clarify ring-2 ring-outcome-clarify" : ""}`}
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="">Unknown</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <div role="group" aria-label="Plan year" className="flex items-center gap-2">
              <span>Plan year</span>
              <div className="inline-flex overflow-hidden rounded-md border border-border">
                {([2026, 2027] as const).map((y) => (
                  <button key={y} type="button" aria-pressed={planYear === y} onClick={() => changePlanYear(y)}
                    className={`px-3 py-1 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${planYear === y ? "bg-primary font-semibold text-primary-foreground" : "bg-surface"}`}>
                    {y}
                  </button>
                ))}
              </div>
              {planYear === 2027 && (
                <span className="rounded-full border border-outcome-clarify bg-outcome-clarify/10 px-2 py-0.5 text-xs font-semibold text-outcome-clarify">AEP</span>
              )}
            </div>
          </div>
          <p className="mt-1 text-sm text-ink-muted">Answers apply to this context.</p>
        </div>

        <form onSubmit={submit} className="flex items-center gap-2">
          <label htmlFor="ask" className="sr-only">Ask Verity</label>
          <input id="ask" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask Verity..."
            className="h-14 min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 text-lg outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          {channel === "voice" && (
            <Button type="button" size="icon"
              aria-label={voice.listening ? "Stop listening" : "Start voice input"}
              title={voice.listening ? "Stop listening" : "Start voice input"}
              aria-pressed={voice.listening}
              disabled={!voice.supported || loading}
              onClick={() => voice.listening ? voice.stopListening() : voice.startListening(setQuery, (t) => { void run(t, { inputMode: "voice" }); })}
              className={`h-16 w-16 shrink-0 rounded-full [&_svg]:size-7 ${voice.listening ? "bg-destructive text-destructive-foreground motion-safe:animate-pulse" : ""}`}>
              {voice.listening ? <Square /> : <Mic />}
            </Button>
          )}
          <Button type="submit" size="lg" className="h-14 shrink-0 px-4 sm:px-6" disabled={loading || voice.listening || !query.trim()}>
            Ask <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
        {channel === "voice" && (
          <div role="status" className="mt-3 text-sm text-ink-muted">
            {!voice.supported && <p>Voice input needs Chrome</p>}
            {voice.listening && <p className="font-semibold text-outcome-safety">Listening...</p>}
            {voice.transcript && <p className="mt-1 break-words">{voice.transcript}</p>}
          </div>
        )}
        {(voice.error || error) && <p role="alert" className="mt-3 text-base text-outcome-safety">{voice.error || error}</p>}

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Example questions">
          {EXAMPLES.map((ex) => (
            <Button key={ex} type="button" variant="outline" onClick={() => setQuery(ex)}
              className="h-auto whitespace-normal rounded-full bg-surface-alt px-3 py-1 text-left text-sm font-normal">
              {ex}
            </Button>
          ))}
        </div>

        <div className="mt-8 space-y-4" aria-live="polite">
          {loading && <Shimmer>Checking...</Shimmer>}
          {!loading && !answer && !error && (
            <p className="text-base text-ink-muted">Ask a question or pick an example to see an approved answer.</p>
          )}
          {!loading && answer && (
            <>
              {answer.res.parts.map((wire) => {
                const key = `${answer.res.request_id}:${wire.part}`;
                const part = toViewPart(wire);
                const sourceTexts = Object.fromEntries(wire.citations.map((c) => [c.unit_id, c.text ?? ""]));
                return (
                  <OutcomeCard
                    key={key}
                    part={part}
                    channel={answer.channel}
                    sourceTexts={sourceTexts}
                    onOpenUnit={(c) => c.unitId && setUnit({ unitId: c.unitId, version: c.version })}
                    onChooseState={chooseState}
                    onConfirmRead={async (c) => (await recordRead(c.unitId ?? "", c.version ?? 0, person.name)).at}
                    speechSupported={voice.speechSupported}
                    speaking={voice.speakingKey === key}
                    onRead={() => voice.read([{ key, part: wire }])}
                    onStop={voice.stopReading}
                    footer={<FeedbackRow unitId={part.citations[0]?.unitId ?? null} />}
                  />
                );
              })}
              {can("view_trace") && <TraceDrawer key={`${answer.res.request_id}:${traceOpen}`} res={answer.res} defaultOpen={traceOpen} />}
              {can("view_channel_compare") && answer.res.outcome === "answer" && (
                <ChannelCompare query={lastQuery} role={person.role} lob={lob} state={state || null} requestId={answer.res.request_id} />
              )}
            </>
          )}
        </div>
      </section>

      <aside className="space-y-6">
        {supervisorExtras && (
          <section aria-labelledby="esc-title">
            <h2 id="esc-title" className="text-base font-semibold">Escalations from my team</h2>
            {!escalations ? (
              <p role="status" className="mt-2 text-sm text-ink-muted">Loading...</p>
            ) : escalations.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">No escalations right now.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {escalations.map((e) => (
                  <li key={e.id} className="rounded-md border border-border p-3 text-sm">
                    <p className="font-semibold">{e.query}</p>
                    <p className="text-ink-muted">{e.advocate} · {e.kind === "flagged" ? "Flagged" : "Unanswered"} · {e.at}</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => { setQuery(e.query); void run(e.query, { openTrace: true }); }}>
                      Open in trace
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        <section aria-labelledby="browse-title">
          <h2 id="browse-title" className="mb-2 text-base font-semibold">Browse</h2>
          <BrowsePanel scope={person.scope} planYear={planYear} onOpen={(u) => setUnit({ unitId: u.unitId, version: u.version })} />
        </section>
      </aside>
      <UnitDrawer target={unit} onClose={() => setUnit(null)} />
    </div>
  );
}
