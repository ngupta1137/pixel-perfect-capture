import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScopeChips, isDemoVisiblePerson } from "@/components/shell/PersonaPicker";
import { useSession } from "@/lib/session";
import { CAPABILITY_TEXT, GROUPS, NEVER_TOGETHER, PEOPLE, personaDef, type Capability, type Person } from "@/lib/rights";

export const Route = createFileRoute("/rights")({
  head: () => ({
    meta: [
      { title: "Rights — Verity" },
      { name: "description", content: "Who can do what in Verity: every persona by capability, with separation-of-duties rules." },
      { property: "og:title", content: "Rights — Verity" },
      { property: "og:description", content: "Who can do what in Verity: every persona by capability, with separation-of-duties rules." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RightsPage,
});

const CAP_GROUPS: { label: string; caps: string[] }[] = [
  { label: "Search", caps: ["search", "get_unit", "list_changes", "report_gap", "give_feedback", "view_trace", "view_channel_compare", "view_provenance"] },
  { label: "Author", caps: ["ingest_source", "propose_unit", "accept_merge_split", "view_review_queue", "view_gaps", "claim_gap", "view_search_insights", "create_change_notice"] },
  { label: "Approve", caps: ["approve_standard", "approve_legal", "view_owner_queue", "resolve_owner_item", "reverify_unit"] },
];

function groupedCaps() {
  const all = Object.keys(CAPABILITY_TEXT) as Capability[];
  const known = new Set(CAP_GROUPS.flatMap((g) => g.caps));
  return [
    ...CAP_GROUPS.map((g) => ({ label: g.label, caps: g.caps.filter((c) => all.includes(c as Capability)) as Capability[] })),
    { label: "Govern", caps: all.filter((c) => !known.has(c)) },
  ].filter((g) => g.caps.length);
}

function RightsPage() {
  const { person } = useSession();
  const [open, setOpen] = useState<Person | null>(null);
  const groups = groupedCaps();
  const caps = groups.flatMap((g) => g.caps);
  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Rights</h1>
        <p className="mt-1 text-sm text-ink-muted">Generated from the policy file. Your row is highlighted. Click a person to see what they can't see and what happens when they try.</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="text-sm">
          <thead className="bg-surface-alt">
            <tr>
              <th className="sticky left-0 bg-surface-alt" />
              {groups.map((g, i) => (
                <th key={g.label} colSpan={g.caps.length} className={`px-2 pt-2 text-left text-xs font-bold uppercase ${i ? "border-l border-border" : ""}`}>{g.label}</th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 bg-surface-alt px-3 py-2 text-left">Person</th>
              {groups.flatMap((g, gi) => g.caps.map((c, ci) => (
                <th key={c} title={CAPABILITY_TEXT[c]} className={`px-2 py-2 font-mono text-[11px] font-semibold [writing-mode:vertical-rl] ${gi && !ci ? "border-l border-border" : ""}`}>{c}</th>
              )))}
            </tr>
          </thead>
          {GROUPS.map((grp) => (
            <tbody key={grp}>
              <tr className="border-t border-border bg-surface-alt"><td colSpan={caps.length + 1} className="sticky left-0 px-3 py-1 text-xs font-bold uppercase text-ink-muted">{grp}</td></tr>
              {PEOPLE.filter((p) => p.group === grp && isDemoVisiblePerson(p)).map((p) => {
                const me = p.id === person.id;
                return (
                  <tr key={p.id} className={`border-t border-border ${me ? "bg-accent ring-2 ring-inset ring-primary" : ""}`} aria-current={me ? "true" : undefined}>
                    <td className={`sticky left-0 min-w-56 px-3 py-2 ${me ? "bg-accent" : "bg-surface"}`}>
                      <button type="button" className="text-left" onClick={() => setOpen(p)}>
                        <span className="font-semibold underline-offset-2 hover:underline">{p.name}</span>{me && <span className="ml-1 text-xs font-semibold text-primary">(you)</span>}
                        <span className="block text-xs text-ink-muted">{p.label}</span>
                      </button>
                      <div className="mt-1"><ScopeChips kbs={p.kbs} /></div>
                    </td>
                    {caps.map((c) => (
                      <td key={c} className="px-2 text-center">
                        {p.capabilities.includes(c) ? <Check className="mx-auto h-4 w-4 text-brand-green-dark" aria-label={`${p.name} can ${c}`} /> : <span className="text-ink-muted" aria-hidden>·</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Separation of duties</h2>
        <p className="mt-1 text-sm text-ink-muted">No one may hold both capabilities in a pair.</p>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {NEVER_TOGETHER.map(([a, b]) => {
            const breaking = PEOPLE.filter((p) => p.capabilities.includes(a) && p.capabilities.includes(b));
            return (
              <li key={`${a}-${b}`} className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-green-dark" aria-hidden />
                <span><code className="font-mono">{a}</code> never with <code className="font-mono">{b}</code>
                  <span className="block text-xs text-ink-muted">{breaking.length ? `Held together by: ${breaking.map((p) => p.name).join(", ")}` : "Held together by no one"}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent>
          {open && (() => {
            const d = personaDef(open.persona);
            return (
              <>
                <SheetHeader>
                  <SheetTitle>{open.name}</SheetTitle>
                  <SheetDescription>{open.label}</SheetDescription>
                </SheetHeader>
                <dl className="space-y-4 px-4 text-sm">
                  <div><dt className="font-semibold">Who</dt><dd>{d.who}</dd></div>
                  <div><dt className="font-semibold">Goal</dt><dd>{d.goal}</dd></div>
                  <div><dt className="font-semibold">Cannot see</dt><dd>{d.cannot_see}</dd></div>
                  <div><dt className="font-semibold">What happens when they try</dt><dd>{d.denied_example}</dd></div>
                </dl>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </section>
  );
}
