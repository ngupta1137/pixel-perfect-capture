import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GUIDE_STEPS } from "@/data/guide";
import { guide } from "@/lib/guide";
import { useRunGuideAction } from "@/components/shell/GuideRail";

export const Route = createFileRoute("/story")({
  head: () => ({
    meta: [
      { title: "Why this exists — Verity" },
      { name: "description", content: "Same question, three answers: why contact centers need one approved truth." },
      { property: "og:title", content: "Why this exists — Verity" },
      { property: "og:description", content: "Same question, three answers: why contact centers need one approved truth." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StoryPage,
});

const CHANNEL_ANSWERS = [
  { channel: "Phone IVR script", answer: "5 to 7 days", note: "Last edited 2024" },
  { channel: "Web chat bot", answer: "Up to 2 weeks", note: "No source" },
  { channel: "Agent cheat sheet", answer: "7 to 10 business days", note: "Review date passed" },
];
const FACTS = ["Annual Election Period opens Oct 15, 2026", "2027 content differs from 2026 content", "Legal wording must be read exactly"];

function StoryPage() {
  const run = useRunGuideAction();
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-8 lg:px-10">
      <section className="space-y-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Why this exists</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Same question, three answers</h1>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">Illustrative, synthetic</p>
          <p className="mb-3 text-lg font-medium text-ink">“How long does mail order take?”</p>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {CHANNEL_ANSWERS.map((c) => (
              <article key={c.channel} className="flex flex-col justify-between rounded-lg border border-border bg-background p-4 shadow-sm transition hover:border-ink/20">
                <div>
                  <p className="text-sm font-semibold text-ink-muted">{c.channel}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{c.answer}</p>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden /> {c.note}
                </p>
              </article>
            ))}
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {FACTS.map((f) => (
            <div key={f} className="flex items-center rounded-lg border-2 border-destructive/60 bg-destructive/5 p-4 text-sm font-semibold text-ink shadow-sm">
              {f}
            </div>
          ))}
        </div>
        <div>
          <Button size="lg" className="font-semibold shadow-sm" onClick={() => { guide.open(1); run(GUIDE_STEPS[1]!.actions[0]!); }}>
            See what Verity does
          </Button>
        </div>
      </section>
    </div>
  );
}
