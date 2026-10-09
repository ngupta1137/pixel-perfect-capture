import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, UserRound, Search, FileInput, ClipboardCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findPerson, homeRoute } from "@/lib/rights";
import { DEMO_ROLES, peopleForRole, type DemoRole } from "@/lib/roles";
import { useSession } from "@/lib/session";
import { ScopeChips } from "@/components/shell/PersonaPicker";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/onboarding")({
  head: () =>
    pageHead(
      "Choose your role",
      "Pick a demo role and person to explore Verity as an advocate, author, approver or administrator.",
    ),
  component: OnboardingPage,
});

const ICONS: Record<DemoRole["id"], typeof Search> = {
  consumer: Search,
  author: FileInput,
  reviewer: ClipboardCheck,
  admin: ShieldCheck,
};

function OnboardingPage() {
  const { setPersona } = useSession();
  const navigate = useNavigate();
  const [role, setRole] = useState<DemoRole | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const people = role ? peopleForRole(role) : [];

  const enter = () => {
    const next = findPerson(selected ?? people[0]?.id);
    if (!next) return;
    setPersona(next.id);
    void navigate({ to: homeRoute(next) });
  };

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-xs font-semibold text-primary">STEP {role ? 2 : 1} OF 2 · DEMO WORKSPACE</p>
      <h1 className="mt-3 text-3xl font-semibold">{role ? "Who are you working as?" : "Choose your role"}</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {role
          ? "Each synthetic person carries their own permissions and knowledge scope."
          : "Your role shapes the demo navigation. It never grants extra permissions."}
      </p>

      {!role ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {DEMO_ROLES.map((r) => {
            const Icon = ICONS[r.id];
            const count = peopleForRole(r).length;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRole(r);
                  setSelected(peopleForRole(r)[0]?.id ?? null);
                }}
                className="group rounded-lg border border-border bg-surface p-6 text-left transition hover:border-primary hover:shadow-sm focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Icon className="h-6 w-6 text-primary" />
                <h2 className="mt-4 text-lg font-semibold">{r.title}</h2>
                <p className="mt-1 text-sm text-ink-muted">{r.purpose}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {r.tasks.map((t) => (
                    <li key={t} className="rounded bg-muted px-2 py-0.5 text-[11px] text-ink-muted">
                      {t}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 flex items-center gap-1 text-xs font-medium text-primary">
                  {count} demo {count === 1 ? "person" : "people"}
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => (
              <Button
                key={p.id}
                variant="outline"
                aria-pressed={selected === p.id}
                onClick={() => setSelected(p.id)}
                className={`h-auto min-h-28 flex-col items-stretch whitespace-normal p-4 text-left ${selected === p.id ? "border-primary bg-primary/5" : ""}`}
              >
                <span className="flex items-center gap-2">
                  <UserRound className="text-primary" />
                  <strong className="flex-1">{p.name}</strong>
                  {selected === p.id && <Check className="text-primary" />}
                </span>
                <span className="text-xs font-normal text-ink-muted">{p.label}</span>
                <ScopeChips kbs={p.kbs} />
              </Button>
            ))}
          </div>
          <div className="sticky bottom-0 mt-8 flex justify-between border-t border-border bg-surface py-4">
            <Button variant="ghost" onClick={() => setRole(null)}>
              <ArrowLeft /> Change role
            </Button>
            <Button onClick={enter} disabled={!people.length}>
              Enter workspace <ArrowRight />
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
