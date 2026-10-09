import { useEffect, useRef, useState } from "react";
import { Headset, Mic, ShieldCheck, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { MemberReply } from "./MemberReply";
import { useSession } from "@/lib/session";
import { useBrowserVoice } from "@/hooks/use-browser-voice";
import { search, type SearchResponse } from "@/services/verity";
import { toViewPart } from "@/services/mockData";

const SIZES = [
  { id: "A", label: "A", cls: "text-lg", name: "Normal text" },
  { id: "A+", label: "A+", cls: "text-xl", name: "Large text" },
  { id: "A++", label: "A++", cls: "text-2xl", name: "Largest text" },
] as const;

interface Turn { id: string; question: string; answer: { res: SearchResponse; channel: string } | null }

export function MemberChat() {
  const { person, channel } = useSession();
  const [query, setQuery] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [size, setSize] = useState<(typeof SIZES)[number]["id"]>("A");
  const [handoff, setHandoff] = useState(false);
  const [state, setState] = useState<string | null>(null);
  const scope = `${person.id}:${channel}`;
  const voice = useBrowserVoice(scope);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const pending = useRef(false);
  useEffect(() => {
    setTurns([]);
    setLoading(false);
    pending.current = false;
  }, [scope]);

  const run = async (q: string, inputMode: "typed" | "voice" = "typed", st = state) => {
    if (!q.trim() || pending.current) return;
    voice.stopReading();
    const requestScope = scopeRef.current;
    const id = crypto.randomUUID();
    pending.current = true;
    setLoading(true);
    setError("");
    setQuery("");
    setTurns((t) => [...t, { id, question: q, answer: null }]);
    try {
      const res = await search({ query: q, role: person.role, channel, input_mode: inputMode, state: st });
      if (scopeRef.current !== requestScope) return;
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer: { res, channel } } : x)));
      if (channel === "voice" || res.outcome === "safety_escalation")
        voice.read(res.parts.map((part) => ({ key: `${res.request_id}:${part.part}`, part })));
    } catch {
      if (scopeRef.current === requestScope) {
        setError("Sorry, something went wrong. Please try again or talk to a person.");
        setTurns((t) => t.filter((x) => x.id !== id));
      }
    } finally {
      if (scopeRef.current === requestScope) {
        pending.current = false;
        setLoading(false);
      }
    }
  };

  const sizeCls = SIZES.find((s) => s.id === size)?.cls ?? "text-lg";
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <h1 className="text-2xl font-semibold">Chat with Verity</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Text size" className="inline-flex overflow-hidden rounded-md border border-border">
            {SIZES.map((s) => (
              <button key={s.id} type="button" aria-pressed={size === s.id} aria-label={s.name} onClick={() => setSize(s.id)}
                className={`min-w-11 px-2 py-1 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${size === s.id ? "bg-primary text-primary-foreground" : "bg-surface"}`}>
                {s.label}
              </button>
            ))}
          </div>
          <Button onClick={() => setHandoff(true)}><Headset /> Talk to a person</Button>
        </div>
      </div>
      <p className="mb-3 flex items-center gap-1.5 text-sm text-ink-muted">
        <ShieldCheck className="h-4 w-4 text-brand-green-dark" aria-hidden="true" /> Answers come from plan-approved information.
      </p>
      {handoff && (
        <p role="status" className="mb-3 rounded-md border border-brand-green-dark bg-surface-alt px-3 py-2 text-base">
          An advocate will join this chat shortly. You can also ask for a call-back.
        </p>
      )}

      <div className={sizeCls}>
        <Conversation className="h-[28rem] max-h-[58vh] min-h-48">
          <ConversationContent className="gap-5 px-0 py-3">
            {turns.length === 0 && (
              <p className="text-ink-muted">Ask me about your prescriptions, mail order or your ID card.</p>
            )}
            {turns.map((turn) => (
              <div key={turn.id} className="space-y-4">
                <Message from="user">
                  <MessageContent className="leading-relaxed group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
                    <p className="whitespace-pre-wrap break-words">{turn.question}</p>
                  </MessageContent>
                </Message>
                <Message from="assistant" className="max-w-full">
                  <span className="text-sm font-semibold text-brand-green-dark">Verity</span>
                  <MessageContent className="w-full overflow-visible">
                    {turn.answer ? (
                      turn.answer.res.parts.map((wire) => {
                        const key = `${turn.answer?.res.request_id}:${wire.part}`;
                        return (
                          <MemberReply
                            key={key}
                            part={toViewPart(wire)}
                            channel={turn.answer?.channel ?? channel}
                            onChooseState={(s) => { setState(s); void run(turn.question, "typed", s); }}
                            onTalk={() => setHandoff(true)}
                            speechSupported={voice.speechSupported}
                            speaking={voice.speakingKey === key}
                            onRead={() => voice.read([{ key, part: wire }])}
                            onStop={voice.stopReading}
                          />
                        );
                      })
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

        <PromptInput onSubmit={() => run(query)} className="mt-4">
          <PromptInputTextarea aria-label="Type your question" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Type your question..." className="min-h-20 text-[1em] md:text-[1em]" />
          <PromptInputFooter className="justify-between">
            <Button type="button" variant="outline" size="icon"
              aria-label={voice.listening ? "Stop listening" : "Start voice input"}
              aria-pressed={voice.listening}
              disabled={!voice.supported || loading}
              onClick={() => voice.listening ? voice.stopListening() : voice.startListening(setQuery, (t) => { void run(t, "voice"); })}
              className={`h-10 w-10 rounded-full ${voice.listening ? "bg-destructive text-destructive-foreground motion-safe:animate-pulse" : ""}`}>
              {voice.listening ? <Square /> : <Mic />}
            </Button>
            <PromptInputSubmit status={loading ? "submitted" : "ready"} disabled={loading || !query.trim()}
              aria-label="Send question" title="Send question" className="h-10 w-10" />
          </PromptInputFooter>
        </PromptInput>
        <div role="status" className="mt-2 text-sm text-ink-muted">
          {!voice.supported && <p>Voice input needs Chrome</p>}
          {voice.listening && <p className="font-semibold text-outcome-safety">Listening...</p>}
        </div>
        {(voice.error || error) && <p role="alert" className="mt-2 text-base text-outcome-safety">{voice.error || error}</p>}
      </div>
    </div>
  );
}
