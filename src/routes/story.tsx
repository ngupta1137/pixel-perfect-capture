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
    <section className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-ink-muted">Why this exists</p>
        <h1 className="mt-1 text-3xl font-semibold">Same question, three answers</h1>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">Illustrative, synthetic</p>
        <p className="mb-3 text-lg">“How long does mail order take?”</p>
        <div className="grid gap-4 md:grid-cols-3">
          {CHANNEL_ANSWERS.map((c) => (
            <article key={c.channel} className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm font-semibold text-ink-muted">{c.channel}</p>
              <p className="mt-2 text-2xl font-semibold">{c.answer}</p>
              <p className="mt-2 flex items-center gap-1 text-sm text-ink-muted"><AlertTriangle className="h-4 w-4" aria-hidden /> {c.note}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {FACTS.map((f) => (
          <div key={f} className="rounded-lg border-2 border-destructive bg-destructive/5 p-4 font-semibold">{f}</div>
        ))}
      </div>
      <Button size="lg" onClick={() => { guide.open(1); run(GUIDE_STEPS[1]!.actions[0]!); }}>See what Verity does</Button>
    </section>
  );
}
