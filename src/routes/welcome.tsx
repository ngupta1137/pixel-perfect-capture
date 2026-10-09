import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ShieldCheck,
  FileInput,
  Search,
  Users,
  CheckCircle2,
  Quote,
  Clock,
  UserCheck,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/welcome")({
  head: () =>
    pageHead(
      "Governed enterprise knowledge",
      "Verity brings permission-aware search, approved cited answers and human-controlled knowledge governance together.",
    ),
  component: WelcomePage,
});

const FEATURES = [
  { icon: ShieldCheck, title: "Governance", text: "Every proposal, decision, access change and denial is recorded and replayable." },
  { icon: Users, title: "Permission-aware search", text: "Answers are scoped to the knowledge bases a role is entitled to read." },
  { icon: Quote, title: "Citations", text: "Each answer names the approved unit, its version and who approved it." },
  { icon: Clock, title: "Knowledge freshness", text: "Stale and conflicting content is flagged, never served as approved." },
  { icon: UserCheck, title: "Human approval", text: "Agents read and propose. Named people approve, including Legal for verbatim text." },
];

function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xl" aria-label="Verity product preview">
      <div className="flex items-center gap-1.5 border-b border-border bg-surface-alt px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="ml-3 text-[11px] text-ink-muted">Verity · Ask</span>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-ink-muted">
          <Search className="h-4 w-4" /> Is a 90-day mail-order supply covered for this plan?
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              <CheckCircle2 className="h-3 w-3" /> Approved answer
            </span>
            <span className="text-[11px] text-ink-muted">2026 plan year · Synthetic</span>
          </div>
          <p className="mt-3 text-sm leading-6">
            Yes. Members on this plan can fill up to a 90-day supply of maintenance medications
            through mail order.
          </p>
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-[11px] text-ink-muted">
            <FileText className="h-3.5 w-3.5" /> Mail-order supply rules · v3 · Approved by Knowledge owner
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
          {["Cited", "In scope", "Current"].map((t) => (
            <span key={t} className="rounded bg-surface-alt py-1.5 text-ink-muted">
              ✓ {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function WelcomePage() {
  return (
    <>
      <section className="border-b border-border px-6 py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-primary">
              <ShieldCheck className="h-4 w-4" /> GOVERNED ENTERPRISE KNOWLEDGE
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-tight lg:text-5xl">
              Trusted answers.
              <br />
              Accountable knowledge.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-ink-muted">
              Verity gives employees and AI agents answers grounded only in approved information,
              with citations, permission scoping and named human approval.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/sign-in">
                  Request a demo <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/sign-in">Sign in</Link>
              </Button>
            </div>
            <p className="mt-5 text-xs text-ink-muted">Concept prototype · Synthetic data</p>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <p className="text-xs font-semibold text-primary">HOW VERITY WORKS</p>
        <h2 className="mt-3 text-3xl font-semibold">From source document to cited answer.</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: FileInput, title: "Ingest & propose", text: "Extract candidate units from source documents and flag changes, duplicates and conflicts." },
            { icon: UserCheck, title: "Review & approve", text: "Compare wording, check impact and record a named human decision before publishing." },
            { icon: Search, title: "Ask & cite", text: "Deliver a scoped, cited answer, or clearly explain why an answer cannot be given." },
          ].map((s, i) => (
            <li key={s.title} className="rounded-lg border border-border bg-surface p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-5 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border bg-surface-alt px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold text-primary">BUILT FOR ACCOUNTABILITY</p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold">Every answer can be traced back to a decision.</h2>
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <f.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 text-sm font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold">One knowledge system. Every responsibility.</h2>
            <p className="mt-2 text-sm text-ink-muted">Advocates · Authors · Approvers · Administrators · AI agents</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to="/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/sign-in">
                Request a demo <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
