import { createFileRoute, Link } from "@tanstack/react-router";
import { RequirePage } from "@/components/shell/Denied";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { guide, useGuide } from "@/lib/guide";
import {
  ArrowRight,
  Mic,
  Square,
  Phone,
  Search,
  Send,
  ChevronRight,
  FileText,
  Clock,
  Paperclip,
  Truck,
  CalendarDays,
  ShieldCheck,
  Stethoscope,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutcomeCard } from "@/components/ask/OutcomeCard";
import { TraceDrawer } from "@/components/ask/TraceDrawer";
import { AnswerDetails } from "@/components/ask/AnswerDetails";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { useSession } from "@/lib/session";
import { useBrowserVoice } from "@/hooks/use-browser-voice";
import { ChannelCompare } from "@/components/ask/ChannelCompare";
import {
  ContextBar,
  DisclosureStep,
  FeedbackRow,
  RequestIdChip,
  UnitDrawer,
} from "@/components/ask/AdvocateExtras";
import { useDemoStore } from "@/services/demoStore";
import { scopedLibrary } from "@/lib/library";
import {
  getReadBeforeBenefits,
  recordRead,
  listUnits,
  type Choice,
  type Citation,
} from "@/services/verity";
import { searchAs, type Outcome, type SearchResponse } from "@/services/verity";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ask — Verity" },
      {
        name: "description",
        content: "Ask Verity for approved answers in advocate view, member chat, or voice.",
      },
      { property: "og:title", content: "Ask — Verity" },
      { property: "og:description", content: "One approved truth, in every channel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GuardedAskPage,
});

const EXAMPLES = [
  { query: "Rx pricing disclaimer", label: "Rx pricing disclaimer", icon: Paperclip },
  { query: "how long does mail order delivery take", label: "Mail order delivery", icon: Truck },
  {
    query: "how many days supply can I get by mail",
    label: "How many days supply can I get by mail?",
    icon: CalendarDays,
  },
  { query: "ID card replacement", label: "How do I get a replacement ID card?", icon: CreditCard },
  {
    query: "is there a copay assistance program",
    label: "Is there a copay assistance program?",
    icon: ShieldCheck,
  },
  { query: "closing statement", label: "Call closing statement", icon: Stethoscope },
];
interface Answer {
  res: SearchResponse;
  channel: string;
}
interface ChatTurn {
  id: string;
  question: string;
  personaId: string;
  answer: Answer | null;
}

export function AskPage() {
  const { persona, channel, can } = useSession();
  const [query, setQuery] = useState("");
  const [lob, setLob] = useState("MAPD");
  const [state, setState] = useState("");
  const [planYear, setPlanYear] = useState("2026");
  const [openCite, setOpenCite] = useState<Citation | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [error, setError] = useState("");
  const [textSize, setTextSize] = useState(0);
  const [handoff, setHandoff] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const storedRequests = useDemoStore((s) => s.requests);
  const sessionHistory = storedRequests
    .filter((r) => r.person === persona.name)
    .slice(0, showHistory ? 12 : 5);
  useDemoStore((s) => s.units);
  const browse = scopedLibrary(listUnits(), persona).slice(0, 5);
  const scope = `${persona.id}:${channel}`;
  const voice = useBrowserVoice(scope);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const pending = useRef(false);
  const isChat = persona.memberAudience && channel === "member_chat";
  useEffect(() => {
    setAnswer(null);
    setLoading(false);
    pending.current = false;
    setError("");
  }, [scope]);

  const run = async (
    q: string,
    p = persona,
    inputMode: "typed" | "voice" = "typed",
    ctx = { lob, state, planYear },
  ): Promise<SearchResponse | null> => {
    if (!q.trim() || pending.current) return null;
    voice.stopReading();
    const requestScope = scopeRef.current;
    const requestChannel =
      p.memberAudience && channel === "advocate_view" ? "member_chat" : channel;
    const id = crypto.randomUUID();
    setLastQuery(q);
    pending.current = true;
    setLoading(true);
    setError("");
    if (isChat) {
      setTurns((items) => [...items, { id, question: q, personaId: p.id, answer: null }]);
      setQuery("");
    }
    try {
      const res = await searchAs(p.name, {
        query: q,
        role: p.role,
        channel: requestChannel,
        input_mode: inputMode,
        lob: ctx.lob,
        state: ctx.state || null,
        plan_year: ctx.planYear || null,
      });
      if (scopeRef.current !== requestScope) return null;
      const next = { res, channel: requestChannel };
      setAnswer(next);
      if (isChat)
        setTurns((items) =>
          items.map((turn) => (turn.id === id ? { ...turn, answer: next } : turn)),
        );
      if (requestChannel === "voice")
        voice.read(res.parts.map((part) => ({ key: `${res.request_id}:${part.part}`, part })));
      return res;
    } catch {
      if (scopeRef.current === requestScope) {
        setError("Verity could not check this question. Please try again.");
        setTurns((items) => items.filter((turn) => turn.id !== id));
      }
    } finally {
      if (scopeRef.current === requestScope) {
        pending.current = false;
        setLoading(false);
      }
    }
    return null;
  };

  // Changing the call context re-runs the last advocate search.
  const ctxKey = `${lob}|${state}|${planYear}`;
  const lastCtx = useRef(ctxKey);
  useEffect(() => {
    if (lastCtx.current === ctxKey) return;
    lastCtx.current = ctxKey;
    if (!isChat && lastQuery) void run(lastQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxKey]);
  // Demo guide: run a queued query once the right person is signed in.
  const command = useGuide((s) => s.command);
  useEffect(() => {
    if (!command || command.personId !== persona.id) return;
    if (!guide.consume(command.id)) return;
    const ctx = {
      lob: command.context?.lob ?? lob,
      state: command.context?.state ?? state,
      planYear: command.context?.planYear ?? planYear,
    };
    setLob(ctx.lob);
    setState(ctx.state);
    setPlanYear(ctx.planYear);
    lastCtx.current = `${ctx.lob}|${ctx.state}|${ctx.planYear}`;
    setQuery(isChat ? "" : command.query);
    pending.current = false;
    void run(command.query, persona, "typed", ctx).then((res) => {
      if (!res) return;
      if (command.record) guide.record(command.record, res.request_id);
      const nextYear = command.thenPlanYear;
      if (nextYear) setTimeout(() => setPlanYear(nextYear), 1200);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command, persona.id]);
  const choose = (c: Choice) => {
    if (c.set.plan_year !== undefined) setPlanYear(c.set.plan_year);
    if (c.set.state !== undefined) setState(c.set.state);
    if (isChat && lastQuery)
      void run(lastQuery, persona, "typed", {
        lob,
        state: c.set.state ?? state,
        planYear: c.set.plan_year ?? planYear,
      });
  };
  const disclosure = isChat ? null : getReadBeforeBenefits(persona.role);
  const readDone = useDemoStore(
    (s) =>
      !!disclosure &&
      s.readEvents.some((e) => e.person === persona.name && e.unit_id === disclosure.unit_id),
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(query);
  };
  const clarify = answer?.res.outcome === "needs_clarification";
  const renderAnswer = (item: Answer, compact = false) => (
    <>
      {item.res.parts.map((part) => {
        const key = `${item.res.request_id}:${part.part}`;
        return (
          <OutcomeCard
            key={key}
            part={part}
            channel={item.channel}
            compact={compact}
            speechSupported={voice.speechSupported}
            speaking={voice.speakingKey === key}
            onRead={() => voice.read([{ key, part }])}
            onStop={voice.stopReading}
            onCite={compact ? undefined : setOpenCite}
            onChoose={choose}
            held={
              !compact &&
              !!disclosure &&
              !readDone &&
              part.outcome === "answer" &&
              !part.citations.some((c) => c.verbatim)
            }
          />
        );
      })}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FeedbackRow
            key={item.res.request_id}
            person={persona.name}
            requestId={item.res.request_id}
            unitIds={item.res.parts.flatMap((p) => p.citations.map((c) => c.unit_id))}
          />
          <RequestIdChip id={item.res.request_id} />
        </div>
      )}
      {can("view_trace") && <TraceDrawer res={item.res} compact={compact} />}
    </>
  );

  return (
    <div
      className={
        isChat
          ? `mx-auto max-w-3xl ${textSize === 2 ? "[&_p]:text-[22px]" : textSize === 1 ? "[&_p]:text-xl" : ""}`
          : "ask-workspace grid gap-8 min-[1100px]:grid-cols-[minmax(0,1fr)_260px]"
      }
    >
      <section className="min-w-0">
        {!isChat && (
          <div className="ask-intro pb-8 pt-5">
            <p className="mb-3 text-sm text-ink-muted">Welcome back, {persona.name}</p>
            <h1 className="font-semibold">Ask with confidence</h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
              Get accurate, approved answers from trusted knowledge. Verity only uses verified
              content and shows you the source.
            </p>
          </div>
        )}
        {isChat && (
          <>
            <div className="mb-4 flex items-baseline justify-between border-b border-border pb-3">
              <h1 className="text-2xl font-semibold">Verity</h1>
              <span className="text-sm text-ink-muted">Member chat · {persona.name}</span>
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1" aria-label="Text size">
                {["A", "A+", "A++"].map((label, i) => (
                  <Button
                    key={label}
                    size="sm"
                    variant={textSize === i ? "secondary" : "ghost"}
                    aria-pressed={textSize === i}
                    onClick={() => setTextSize(i)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => setHandoff(!handoff)}>
                <Phone />
                Talk to a person
              </Button>
            </div>
            {handoff && (
              <p role="status" className="mb-4 border-l-2 border-primary bg-surface p-4 text-sm">
                Live transfer is not connected in this prototype. Contact Member Services using the
                number on your member ID card.
              </p>
            )}
            <Conversation className="h-[28rem] max-h-[55vh] min-h-48">
              <ConversationContent className="gap-5 px-0 py-3">
                {turns
                  .filter((turn) => turn.personaId === persona.id)
                  .map((turn) => (
                    <div key={turn.id} className="space-y-4">
                      <Message from="user">
                        <MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground text-lg leading-relaxed">
                          <p className="whitespace-pre-wrap break-words">{turn.question}</p>
                        </MessageContent>
                      </Message>
                      <Message from="assistant" className="max-w-full">
                        <span className="text-sm font-semibold text-brand-green-dark">Verity</span>
                        <MessageContent className="w-full overflow-visible text-lg">
                          {turn.answer ? (
                            renderAnswer(turn.answer, true)
                          ) : (
                            <Shimmer>Checking...</Shimmer>
                          )}
                        </MessageContent>
                      </Message>
                    </div>
                  ))}
              </ConversationContent>
              <ConversationScrollButton aria-label="Latest messages" />
            </Conversation>
          </>
        )}

        {isChat ? (
          <PromptInput
            onSubmit={() => {
              void run(query);
            }}
            className="mt-4"
          >
            <PromptInputTextarea
              aria-label="Ask Verity"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask Verity..."
              className="min-h-20 text-lg md:text-lg"
            />
            <PromptInputFooter className="justify-between">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                aria-label={voice.listening ? "Stop listening" : "Start voice input"}
                title="Voice input"
                disabled={!voice.supported || loading}
                onClick={() =>
                  voice.listening
                    ? voice.stopListening()
                    : voice.startListening(setQuery, (text) => {
                        void run(text, persona, "voice");
                      })
                }
              >
                {voice.listening ? <Square /> : <Mic />}
              </Button>
              <PromptInputSubmit
                status={loading ? "submitted" : "ready"}
                disabled={loading || !query.trim()}
                aria-label="Send question"
                title="Send question"
                className="h-10 w-10"
              />
            </PromptInputFooter>
          </PromptInput>
        ) : (
          <>
            <div className="ask-search sticky top-3 z-20 rounded-lg border border-border bg-surface p-3 sm:p-4">
              <form
                onSubmit={submit}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
              >
                <div className="relative min-w-0">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-primary" />
                  <label htmlFor="ask" className="sr-only">
                    Ask Verity
                  </label>
                  <input
                    id="ask"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ask about member benefits, pharmacy, claims or policies…"
                    className="h-12 w-full min-w-0 rounded-md border border-border bg-surface pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {channel === "voice" && (
                    <Button
                      type="button"
                      size="icon"
                      aria-label={voice.listening ? "Stop listening" : "Start voice input"}
                      title={voice.listening ? "Stop listening" : "Start voice input"}
                      aria-pressed={voice.listening}
                      disabled={!voice.supported || loading}
                      onClick={() =>
                        voice.listening
                          ? voice.stopListening()
                          : voice.startListening(setQuery, (text) => {
                              void run(text, persona, "voice");
                            })
                      }
                      className={`h-12 w-12 shrink-0 rounded-full ${voice.listening ? "bg-destructive text-destructive-foreground motion-safe:animate-pulse" : ""}`}
                    >
                      {voice.listening ? <Square /> : <Mic />}
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className="h-12 px-4 sm:px-5"
                    disabled={loading || voice.listening || !query.trim()}
                  >
                    <Send /> <span className="hidden sm:inline">Ask</span>
                  </Button>
                </div>
              </form>
              <ContextBar
                lob={lob}
                setLob={setLob}
                state={state}
                setState={setState}
                planYear={planYear}
                setPlanYear={setPlanYear}
                highlight={clarify}
              />
            </div>
          </>
        )}

        {(channel === "voice" || isChat) && (
          <div role="status" className="mt-3 text-sm text-ink-muted">
            {!voice.supported && <p>Voice input needs Chrome</p>}
            {voice.listening && <p className="font-semibold text-outcome-safety">Listening...</p>}
            {voice.transcript && <p className="mt-1 break-words">{voice.transcript}</p>}
          </div>
        )}
        {(voice.error || error) && (
          <p role="alert" className="mt-3 text-sm text-outcome-safety">
            {voice.error || error}
          </p>
        )}

        {isChat && (
          <p className="mt-4 text-center text-xs text-ink-muted">
            Answers come from plan-approved information
          </p>
        )}
        {isChat && (
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2 text-ink-muted">
              Line of business
              <select
                className="field-select"
                value={lob}
                onChange={(event) => setLob(event.target.value)}
              >
                <option value="MAPD">MAPD</option>
                <option value="PDP">PDP</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-ink-muted">
              State
              <select
                className={`field-select ${clarify ? "ring-2 ring-outcome-clarify border-outcome-clarify" : ""}`}
                value={state}
                onChange={(event) => setState(event.target.value)}
              >
                <option value="">Unknown</option>
                <option value="KY">KY</option>
                <option value="FL">FL</option>
                <option value="OH">OH</option>
              </select>
            </label>
          </div>
        )}
        {!isChat && (
          <div className="mt-6 space-y-4" aria-live="polite">
            {disclosure && answer && (
              <DisclosureStep
                title={disclosure.title}
                text={disclosure.text}
                done={readDone}
                onDone={() =>
                  recordRead(persona.name, answer?.res.request_id ?? null, disclosure.unit_id)
                }
              />
            )}
            {loading && (
              <div
                role="status"
                className="flex items-center gap-3 border-l-2 border-primary px-5 py-6"
              >
                <ShieldCheck className="h-5 w-5 text-primary" />
                <Shimmer>Checking approved knowledge...</Shimmer>
              </div>
            )}
            {!loading && answer && renderAnswer(answer)}
            {!loading && answer && can("get_unit") && (
              <AnswerDetails res={answer.res} onCite={setOpenCite} />
            )}
            {!loading &&
              can("view_channel_compare") &&
              answer?.res.outcome === "answer" &&
              lastQuery && (
                <ChannelCompare
                  query={lastQuery}
                  role={persona.role}
                  lob={lob}
                  state={state || null}
                  requestId={answer.res.request_id}
                />
              )}
            <UnitDrawer citation={openCite} onClose={() => setOpenCite(null)} />
          </div>
        )}
        <section
          className="mt-8"
          aria-label={answer && !isChat ? "Related questions" : "Suggested questions"}
        >
          <h2 className="mb-4 text-sm font-semibold">
            {answer && !isChat ? "Related questions" : "Suggested questions"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {EXAMPLES.filter((ex) => !answer || ex.query !== lastQuery)
              .slice(0, answer || isChat ? 4 : 6)
              .map((ex) => (
                <Button
                  key={ex.query}
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setQuery(ex.query);
                    void run(ex.query);
                  }}
                  className="ask-suggestion h-auto min-h-[68px] justify-start gap-3 whitespace-normal bg-surface px-3 py-3 text-left text-[13px] font-normal shadow-none"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/6 text-primary">
                    <ex.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1 leading-relaxed">{ex.label}</span>
                  <ChevronRight className="h-4 w-4 text-ink-muted" />
                </Button>
              ))}
          </div>
        </section>
      </section>
      {!isChat && (
        <aside className="ask-rail min-w-0 space-y-4 min-[1100px]:-mr-4 min-[1100px]:-mt-7 min-[1100px]:border-l min-[1100px]:border-border min-[1100px]:bg-surface min-[1100px]:px-4 min-[1100px]:pt-5 lg:min-[1100px]:-mr-7">
          <section className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Recent searches</h2>
              {storedRequests.some((r) => r.person === persona.name) && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-[11px]"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {showHistory ? "Show less" : "View all"}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>
            {sessionHistory.length === 0 ? (
              <div className="flex items-start gap-3 py-6 text-ink-muted">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm">No recent searches</p>
                  <p className="mt-1 text-xs leading-relaxed">Your searches will appear here.</p>
                </div>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {sessionHistory.map((item) => (
                  <li key={item.id}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setQuery(item.query);
                        void run(item.query);
                      }}
                      className="h-auto min-h-16 w-full justify-start gap-3 whitespace-normal rounded-none px-0 py-3 text-left"
                    >
                      <Clock className="h-4 w-4 text-ink-muted" />
                      <span className="min-w-0 flex-1 text-xs font-normal leading-relaxed">
                        {item.query}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-ink-muted" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {can("get_unit") && (
            <section className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Browse knowledge</h2>
                <Button variant="link" size="sm" asChild className="h-auto p-0 text-[11px]">
                  <Link to="/library">
                    View all
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
              <div className="mt-3 divide-y divide-border">
                {browse.map((u) => (
                  <Link
                    key={u.unit_id}
                    to="/library"
                    className="flex min-h-12 items-center gap-3 py-3 text-xs text-ink-muted hover:text-primary"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 leading-relaxed">{u.title}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  </Link>
                ))}
                {!browse.length && (
                  <p className="py-4 text-xs text-ink-muted">No knowledge in your scope.</p>
                )}
              </div>
            </section>
          )}
        </aside>
      )}
    </div>
  );
}

function GuardedAskPage() {
  return (
    <RequirePage to="/">
      <AskPage />
    </RequirePage>
  );
}
