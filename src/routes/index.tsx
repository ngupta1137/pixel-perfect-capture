import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RequirePage } from "@/components/shell/Denied";
import { canOpen, homeRoute } from "@/lib/rights";
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
  Contact,
  Lock,
  PhoneCall,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { AnswerDetailsView } from "@/components/ask/AnswerDetailsView";
import { setBreadcrumbs } from "@/lib/breadcrumbs";
import {
  getReadBeforeBenefits,
  recordRead,
  listUnits,
  type Choice,
  type Citation,
  searchAs,
  type SearchResponse,
} from "@/services/verity";


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

interface SuggestedQuestion {
  query: string;
  label: string;
  description?: string;
  icon: any;
  restricted?: boolean;
}

const INSURANCE_SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  {
    query: "replace id card",
    label: "Replacement member ID card",
    description: "Insurance Happy Path · Member Services (KB-INS)",
    icon: Contact,
  },
  {
    query: "pcp change",
    label: "Change primary care provider (PCP)",
    description: "Insurance Happy Path · Benefits Ops (KB-INS)",
    icon: Stethoscope,
  },
  {
    query: "what do i say at the start of the call",
    label: "Call opening & recorded line notice",
    description: "Shared Verbatim · Compliance (KB-SHARED)",
    icon: ShieldCheck,
  },
  {
    query: "closing statement",
    label: "Call closing statement",
    description: "Shared Verbatim · Compliance (KB-SHARED)",
    icon: PhoneCall,
  },
  {
    query: "Rx pricing disclaimer",
    label: "Rx pricing disclaimer",
    description: "Pharmacy domain · Restricted (Transfer to Pharmacy)",
    icon: Lock,
    restricted: true,
  },
  {
    query: "how many days supply can I get by mail",
    label: "Mail order days supply",
    description: "Pharmacy domain · Restricted (Transfer to Pharmacy)",
    icon: Lock,
    restricted: true,
  },
];

const PHARMACY_SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  {
    query: "Rx pricing disclaimer",
    label: "Rx pricing disclaimer",
    description: "Pharmacy Happy Path · Verbatim (KB-PHARM)",
    icon: Paperclip,
  },
  {
    query: "how long does mail order delivery take",
    label: "Mail order delivery turnaround",
    description: "Pharmacy Happy Path · Standard 7–10 days (KB-PHARM)",
    icon: Truck,
  },
  {
    query: "how many days supply can I get by mail",
    label: "Days supply by mail (90 vs 100 days)",
    description: "Conflict demo · Dual-source conflict routing",
    icon: CalendarDays,
  },
  {
    query: "is there a copay assistance program",
    label: "Copay assistance program",
    description: "Applicability demo · State-specific clarification (KY)",
    icon: ShieldCheck,
  },
  {
    query: "is there a shipping fee for mail order",
    label: "Mail order shipping cost",
    description: "Stale review demo · Expired review flag",
    icon: Clock,
  },
  {
    query: "replace id card",
    label: "Replacement member ID card",
    description: "Insurance domain · Restricted (Transfer to Insurance)",
    icon: Lock,
    restricted: true,
  },
];

const MEMBER_SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  {
    query: "how long does mail order delivery take",
    label: "Mail order delivery time",
    description: "Prescription delivery arrival estimates",
    icon: Truck,
  },
  {
    query: "how many days supply can I get by mail",
    label: "Days supply by mail",
    description: "Prescription maintenance supply allowance",
    icon: CalendarDays,
  },
  {
    query: "replace id card",
    label: "How do I get a replacement ID card?",
    description: "Order a replacement member card",
    icon: Contact,
  },
  {
    query: "closing statement",
    label: "Call closing statement",
    description: "Plan membership reassurance",
    icon: PhoneCall,
  },
];

const DEFAULT_RECENT_SEARCHES_INSURANCE = [
  { query: "replace id card", time: "2 mins ago" },
  { query: "pcp change", time: "15 mins ago" },
  { query: "what do i say at the start of the call", time: "35 mins ago" },
  { query: "closing statement", time: "1 hour ago" },
  { query: "Rx pricing disclaimer", time: "3 hours ago" },
];

const DEFAULT_RECENT_SEARCHES_PHARMACY = [
  { query: "is there a copay assistance program", time: "2 mins ago" },
  { query: "I have chest pain, can you rush my heart pills", time: "12 mins ago" },
  { query: "how many days supply can I get by mail", time: "24 mins ago" },
  { query: "is there a shipping fee for mail order", time: "1 hour ago" },
  { query: "Rx pricing disclaimer", time: "3 hours ago" },
];

const DEFAULT_BROWSE_KNOWLEDGE_INSURANCE = [
  { unit_id: "U-IN-001", title: "Replacement member ID card" },
  { unit_id: "U-IN-002", title: "Change primary care provider (PCP)" },
  { unit_id: "U-IN-003", title: "Filing a grievance for a denied claim" },
  { unit_id: "U-SH-001", title: "Call opening: recorded line" },
  { unit_id: "U-SH-002", title: "Call closing: no impact on membership" },
];

const DEFAULT_BROWSE_KNOWLEDGE_PHARMACY = [
  { unit_id: "U-PH-003", title: "Pricing disclaimer (Rx)" },
  { unit_id: "U-PH-006", title: "Mail order delivery time" },
  { unit_id: "U-PH-007", title: "Days supply by mail (90-day)" },
  { unit_id: "U-PH-008", title: "Mail order shipping cost" },
  { unit_id: "U-SH-002", title: "Call closing: no impact on membership" },
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

function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins === 1) return "1 min ago";
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    return "1 day ago";
  } catch {
    return "Recently";
  }
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
  const latestPublishSignal = useDemoStore((s) => s.latestPublishSignal);
  const userRequests = storedRequests.filter((r) => r.person === persona.name);
  const sessionHistory = userRequests.slice(0, showHistory ? 12 : 5);

  const isInsuranceRole =
    persona.role === "insurance_advocate" ||
    (persona.kbs?.includes("KB-INS") && !persona.kbs?.includes("KB-PHARM"));

  const browseList = isInsuranceRole
    ? DEFAULT_BROWSE_KNOWLEDGE_INSURANCE
    : DEFAULT_BROWSE_KNOWLEDGE_PHARMACY;

  const defaultRecentSearches = isInsuranceRole
    ? DEFAULT_RECENT_SEARCHES_INSURANCE
    : DEFAULT_RECENT_SEARCHES_PHARMACY;

  const isChat = channel === "member_chat" || persona.role === "member_chat";

  const suggestedQuestions = isChat
    ? MEMBER_SUGGESTED_QUESTIONS
    : isInsuranceRole
    ? INSURANCE_SUGGESTED_QUESTIONS
    : PHARMACY_SUGGESTED_QUESTIONS;

  const scope = `${persona.id}:${channel}`;
  const voice = useBrowserVoice(scope);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const pending = useRef(false);

  useEffect(() => {
    setAnswer(null);
    setLoading(false);
    pending.current = false;
    setError("");
    setBreadcrumbs([]);
  }, [scope]);

  useEffect(() => {
    if (answer && !isChat) {
      setBreadcrumbs(["Ask", "Answer"]);
    } else {
      setBreadcrumbs([]);
    }
  }, [answer, isChat]);


  const run = async (
    q: string,
    p = persona,
    inputMode: "typed" | "voice" = "typed",
    ctx = { lob, state, planYear },
  ): Promise<SearchResponse | null> => {
    if (!q.trim() || pending.current) return null;
    voice.stopReading();
    const requestScope = scopeRef.current;
    const requestChannel = channel;
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

  // Changing call context re-runs last advocate search.
  const ctxKey = `${lob}|${state}|${planYear}`;
  const lastCtx = useRef(ctxKey);
  useEffect(() => {
    if (lastCtx.current === ctxKey) return;
    lastCtx.current = ctxKey;
    if (!isChat && lastQuery) void run(lastQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxKey]);

  // Demo guide: run queued query once right person signed in
  const command = useGuide((s) => s.command);
  useEffect(() => {
    if (!command || command.personId !== persona.id) return;
    if (!guide.consume(command.id)) return;
    const ctx = {
      lob: command.context?.lob ?? lob,
      state: command.context && "state" in command.context ? (command.context.state ?? "") : (command.context?.state ?? state),
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
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
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

  if (!isChat && answer) {
    return (
      <AnswerDetailsView
        question={lastQuery || query || "Is there a copay assistance program?"}
        response={answer.res}
        lob={lob}
        setLob={setLob}
        state={state}
        setState={setState}
        planYear={planYear}
        setPlanYear={setPlanYear}
        onBack={() => {
          setAnswer(null);
          setBreadcrumbs([]);
        }}
        onSelectQuestion={(q) => {
          setQuery(q);
          void run(q);
        }}
        onChoose={choose}
      />
    );
  }

  return (
    <div
      className={
        isChat
          ? `mx-auto max-w-3xl ${textSize === 2 ? "[&_p]:text-[22px]" : textSize === 1 ? "[&_p]:text-xl" : ""}`
          : "ask-workspace relative grid gap-8 min-[1180px]:grid-cols-[minmax(0,1fr)_340px]"
      }
    >
      {/* Decorative subtle organic wave background behind heading area */}
      {!isChat && (
        <div className="pointer-events-none absolute right-0 top-0 -z-10 h-72 w-full max-w-2xl overflow-hidden opacity-90">
          <svg
            viewBox="0 0 700 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full object-cover"
            preserveAspectRatio="none"
          >
            <path
              d="M320 0C440 130 580 170 700 70V0H320Z"
              fill="url(#paint0_linear)"
              fillOpacity="0.45"
            />
            <path
              d="M180 0C300 170 510 230 700 130V0H180Z"
              fill="url(#paint1_linear)"
              fillOpacity="0.3"
            />
            <path
              d="M380 0C490 210 610 260 700 210V0H380Z"
              fill="url(#paint2_linear)"
              fillOpacity="0.18"
            />
            <defs>
              <linearGradient
                id="paint0_linear"
                x1="700"
                y1="0"
                x2="320"
                y2="150"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#86EFAC" />
                <stop offset="1" stopColor="#DCFCE7" stopOpacity="0" />
              </linearGradient>
              <linearGradient
                id="paint1_linear"
                x1="700"
                y1="0"
                x2="180"
                y2="200"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#4ADE80" />
                <stop offset="1" stopColor="#F0FDF4" stopOpacity="0" />
              </linearGradient>
              <linearGradient
                id="paint2_linear"
                x1="700"
                y1="0"
                x2="380"
                y2="250"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#22C55E" />
                <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}

      {/* Main Column */}
      <section className="min-w-0">
        {!isChat && (
          <div className="ask-intro pb-4 pt-1">
            <p className="text-sm font-normal text-ink-muted">Good morning, {persona.name}</p>
            <h1 className="mt-1.5 text-[38px] font-bold tracking-tight text-ink leading-tight">
              Ask with confidence
            </h1>
            <p className="mt-2.5 max-w-xl text-[14.5px] leading-relaxed text-ink-muted">
              Get accurate, approved answers from trusted knowledge. Verity uses only verified
              content and shows you the source.
            </p>
          </div>
        )}

        {!isChat && latestPublishSignal && (
          <div
            role="status"
            className="mb-2 mt-2 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/90 p-3.5 text-xs text-emerald-950 shadow-sm animate-in fade-in slide-in-from-top-1"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-white font-bold text-xs shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold text-emerald-950">
                  Recently approved by {latestPublishSignal.by}: {latestPublishSignal.unit_id} v{latestPublishSignal.version} — “{latestPublishSignal.title}”
                </p>
                <p className="text-emerald-800 text-[11px]">
                  Published into live search. Channels notified: {latestPublishSignal.channels.join(", ")}. Cache invalidated.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const q = latestPublishSignal.title.toLowerCase().includes("supply")
                  ? "how many days supply can I get by mail"
                  : latestPublishSignal.title.toLowerCase().includes("pricing")
                  ? "Rx pricing disclaimer"
                  : latestPublishSignal.title;
                setQuery(q);
                void run(q);
              }}
              className="h-8 border-emerald-300 bg-white text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              Test re-query →
            </Button>
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
                <Phone className="h-4 w-4" />
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
            {/* Search Box Card */}
            <div className="ask-search mt-6 rounded-2xl border border-border bg-surface p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] sm:p-5">
              <form
                onSubmit={submit}
                className="flex items-center gap-3"
              >
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted/80" />
                  <label htmlFor="ask" className="sr-only">
                    Ask a question about member benefits, pharmacy, claims or policies...
                  </label>
                  <input
                    id="ask"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ask a question about member benefits, pharmacy, claims or policies..."
                    className="h-12 w-full min-w-0 rounded-lg border-0 bg-transparent pl-11 pr-3 text-sm text-ink placeholder:text-ink-muted/70 outline-none focus:ring-0"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={
                      voice.listening
                        ? "Stop listening"
                        : voice.supported
                          ? "Start voice input"
                          : "Voice input unavailable in this browser"
                    }
                    title={
                      voice.listening
                        ? "Stop listening"
                        : voice.supported
                          ? "Start voice input"
                          : "Speech recognition is not supported in this browser"
                    }
                    aria-pressed={voice.listening}
                    disabled={loading}
                    onClick={() => {
                      if (!voice.supported) {
                        setError(
                          "Speech recognition is not supported in this browser. Please type your question.",
                        );
                        return;
                      }
                      if (voice.listening) {
                        voice.stopListening();
                      } else {
                        voice.startListening(
                          (text) => setQuery(text),
                          (finalText) => {
                            setQuery(finalText);
                            if (channel === "voice") {
                              void run(finalText, persona, "voice");
                            }
                          },
                        );
                      }
                    }}
                    className={`h-11 w-11 shrink-0 rounded-lg text-ink-muted hover:text-ink ${
                      voice.listening
                        ? "bg-destructive text-destructive-foreground motion-safe:animate-pulse"
                        : ""
                    }`}
                  >
                    {voice.listening ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Mic className={`h-4 w-4 ${!voice.supported ? "opacity-40" : ""}`} />
                    )}
                  </Button>
                  <Button
                    type="submit"
                    className="h-11 rounded-lg bg-[#2E7D32] px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#256629]"
                    disabled={loading || voice.listening || !query.trim()}
                  >
                    <Send className="h-4 w-4" />
                    <span>Ask</span>
                  </Button>
                </div>
              </form>

              {/* Context Filters Row */}
              <div className="mt-3 border-t border-border/60 pt-3">
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
            </div>
          </>
        )}

        {(channel === "voice" || voice.listening || voice.transcript) && (
          <div role="status" className="mt-3 space-y-1.5 text-sm text-ink-muted">
            {!voice.supported && channel === "voice" && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                Speech recognition is not supported in this browser. You can type questions below to receive spoken audio synthesis, or use Chrome / Edge for microphone input.
              </p>
            )}
            {voice.listening && (
              <div className="flex items-center gap-2 font-semibold text-emerald-700">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                </span>
                Listening... Speak your question clearly
              </div>
            )}
            {voice.transcript && (
              <p className="break-words rounded-lg border border-border bg-surface p-2.5 text-xs font-mono text-ink">
                <strong>Heard:</strong> {voice.transcript}
              </p>
            )}
          </div>
        )}
        {(voice.error || error) && (
          <p role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
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
                className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/4 px-5 py-6 shadow-sm"
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

        {/* Suggested Questions Section */}
        <section
          className="mt-8"
          aria-label={answer && !isChat ? "Related questions" : "Suggested questions"}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-ink">
              {answer && !isChat ? "Related questions" : "Suggested questions"}
            </h2>
            {isInsuranceRole && !isChat && (
              <span className="text-xs font-medium text-ink-muted">
                Insurance workspace &amp; restricted boundary scenarios
              </span>
            )}
            {!isInsuranceRole && !isChat && (
              <span className="text-xs font-medium text-ink-muted">
                Pharmacy workspace &amp; scenario test queries
              </span>
            )}
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            {suggestedQuestions
              .filter((ex) => !answer || ex.query !== lastQuery)
              .slice(0, answer || isChat ? 4 : 6)
              .map((ex) => (
                <button
                  key={ex.query + ex.label}
                  type="button"
                  onClick={() => {
                    setQuery(ex.query);
                    void run(ex.query);
                  }}
                  className={cn(
                    "ask-suggestion flex min-h-[68px] items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    ex.restricted
                      ? "border-amber-200/90 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50/70"
                      : "border-border bg-surface hover:border-border/80"
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        ex.restricted
                          ? "bg-amber-100 text-amber-800"
                          : "bg-[#EAF7EE] text-[#1E5E2E]"
                      )}
                    >
                      <ex.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 text-[13px] font-medium leading-snug text-ink truncate">
                          {ex.label}
                        </span>
                        {ex.restricted && (
                          <span className="inline-flex shrink-0 items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                            Restricted
                          </span>
                        )}
                      </div>
                      {ex.description && (
                        <p className="mt-0.5 text-[11px] text-ink-muted truncate">
                          {ex.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted/80" />
                </button>
              ))}
          </div>
        </section>
      </section>

      {/* Right Column / Rail */}
      {!isChat && (
        <aside className="ask-rail min-w-0 space-y-4">
          {/* Recent Searches Card */}
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-ink">Recent searches</h2>
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1 text-xs font-semibold text-[#2E7D32] transition-colors hover:underline focus:outline-none"
              >
                <span>{showHistory ? "Show less" : "View all"}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <ul className="mt-3 divide-y divide-border/60">
              {sessionHistory.length > 0 ? (
                sessionHistory.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(item.query);
                        void run(item.query);
                      }}
                      className="group flex w-full items-start justify-between gap-3 py-3 text-left transition-colors hover:bg-muted/50 rounded-lg px-1.5 -mx-1.5 focus:outline-none"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-normal text-ink group-hover:text-primary leading-snug">
                            {item.query}
                          </p>
                          <span className="mt-0.5 block text-[11px] text-ink-muted">
                            {formatRelativeTime(item.at)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 self-center text-ink-muted group-hover:text-ink" />
                    </button>
                  </li>
                ))
              ) : (
                defaultRecentSearches.map((item, idx) => (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(item.query);
                        void run(item.query);
                      }}
                      className="group flex w-full items-start justify-between gap-3 py-3 text-left transition-colors hover:bg-muted/50 rounded-lg px-1.5 -mx-1.5 focus:outline-none"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-xs font-normal text-ink group-hover:text-primary leading-snug">
                            {item.query}
                          </p>
                          <span className="mt-0.5 block text-[11px] text-ink-muted">
                            {item.time}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 self-center text-ink-muted group-hover:text-ink" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>

          {/* Browse Knowledge Card */}
          {can("get_unit") && (
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-ink">Browse knowledge</h2>
                <Link
                  to="/library"
                  className="flex items-center gap-1 text-xs font-semibold text-[#2E7D32] transition-colors hover:underline focus:outline-none"
                >
                  <span>View all</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="mt-3 divide-y divide-border/60">
                {browseList.map((u) => (
                  <Link
                    key={u.unit_id}
                    to="/library"
                    className="group flex items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-muted/50 rounded-lg px-1.5 -mx-1.5"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="h-4 w-4 shrink-0 text-ink-muted" />
                      <span className="truncate text-xs font-normal text-ink group-hover:text-primary leading-snug">
                        {u.title}
                      </span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-muted group-hover:text-ink" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      )}
    </div>
  );
}

function GuardedAskPage() {
  const { person } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!canOpen(person, "/")) {
      const target = homeRoute(person);
      if (target && target !== "/") {
        void navigate({ to: target });
      }
    }
  }, [person, navigate]);

  return (
    <RequirePage to="/">
      <AskPage />
    </RequirePage>
  );
}
