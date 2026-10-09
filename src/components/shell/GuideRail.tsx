import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, PanelRightClose, PanelRightOpen, Play, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GUIDE_STEPS, type GuideAction } from "@/data/guide";
import { guide, useGuide } from "@/lib/guide";
import { useSession } from "@/lib/session";
import { PEOPLE } from "@/lib/rights";
import { resetDemo } from "@/services/verity";

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

export function useRunGuideAction() {
  const navigate = useNavigate();
  const { setPersona } = useSession();
  return (a: GuideAction) => {
    const p = a.person ? PEOPLE.find((x) => x.name === a.person) : undefined;
    if (p) setPersona(p.id);
    if (a.to === "/audit") {
      const id = a.replay ? guide.get().recorded[a.replay] : undefined;
      void navigate({ to: "/audit", search: id ? { id } : {} });
    } else {
      void navigate({ to: a.to });
    }
    if (a.query && p) guide.issue({ personId: p.id, query: a.query, context: a.context, thenPlanYear: a.thenPlanYear, record: a.record });
  };
}

export function useGuideKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "g") return guide.toggle();
      if (!guide.get().open) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); guide.goto(guide.get().step + 1); }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); guide.goto(guide.get().step - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export function GuideRail() {
  const { open, collapsed, step } = useGuide((s) => s);
  const run = useRunGuideAction();
  useEffect(() => {
    document.getElementById(`guide-step-${step}`)?.scrollIntoView({ block: "nearest" });
  }, [step, open]);
  if (!open) return null;
  if (collapsed)
    return (
      <button type="button" onClick={() => guide.setCollapsed(false)} aria-label="Expand demo guide"
        className="fixed right-0 top-1/3 z-40 rounded-l-md border border-r-0 border-border bg-surface px-2 py-3 text-xs font-semibold shadow">
        <PanelRightOpen className="mb-1 h-4 w-4" /> Guide {step + 1}
      </button>
    );
  return (
    <aside aria-label="Demo guide" className="fixed right-0 top-0 z-40 flex h-screen w-80 flex-col border-l border-border bg-surface shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-semibold">Demo guide</p>
        <div className="flex gap-1">
          <Button size="icon-sm" variant="ghost" aria-label="Collapse guide" onClick={() => guide.setCollapsed(true)}><PanelRightClose className="h-4 w-4" /></Button>
          <Button size="icon-sm" variant="ghost" aria-label="Close guide" onClick={guide.close}><X className="h-4 w-4" /></Button>
        </div>
      </div>
      <ol className="flex-1 space-y-2 overflow-y-auto p-3">
        {GUIDE_STEPS.map((s, i) => {
          const current = i === step;
          return (
            <li key={s.title} id={`guide-step-${i}`} aria-current={current ? "step" : undefined}
              onClick={() => guide.goto(i)}
              className={`cursor-pointer rounded-md border p-3 text-sm ${current ? "border-primary bg-accent ring-2 ring-primary" : "border-border"}`}>
              <p className="font-semibold"><span className="mr-2 text-ink-muted">{i + 1}</span>{s.title}</p>
              {current && (
                <>
                  <p className="mt-2"><span className="font-semibold">Say:</span> “{s.say}”</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {s.actions.map((a, j) => (
                      <Button key={j} size="sm" variant={j === 0 ? "default" : "outline"} onClick={(e) => { e.stopPropagation(); run(a); }}>
                        <Play className="h-3.5 w-3.5" /> {a.label ?? "Go"}
                      </Button>
                    ))}
                  </div>
                  {s.actions.filter((a) => a.hint).map((a) => <p key={a.hint} className="mt-2 text-xs text-ink-muted">{a.hint}</p>)}
                </>
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex items-center justify-between gap-2 border-t border-border p-3">
        <Button size="sm" variant="outline" disabled={step === 0} onClick={() => guide.goto(step - 1)}><ChevronLeft className="h-4 w-4" /> Back</Button>
        <Button size="sm" variant="ghost" onClick={() => void resetDemo()}><RotateCcw className="h-4 w-4" /> Reset demo</Button>
        <Button size="sm" variant="outline" disabled={step === GUIDE_STEPS.length - 1} onClick={() => guide.goto(step + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
      </div>
    </aside>
  );
}
