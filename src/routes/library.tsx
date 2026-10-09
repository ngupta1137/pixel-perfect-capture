import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  BookOpen,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  GitCompare,
  Archive,
  Lock,
} from "lucide-react";
import { RequirePage } from "@/components/shell/Denied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useSession } from "@/lib/session";
import { scopedLibrary } from "@/lib/library";
import { personaDef } from "@/lib/rights";
import { pageHead } from "@/lib/page-head";
import { useDemoStore, type DemoUnit } from "@/services/demoStore";
import { listUnits, UNIT_META } from "@/services/verity";
export const Route = createFileRoute("/library")({
  head: () =>
    pageHead(
      "Knowledge library",
      "Browse permission-scoped knowledge, source information, approval status and version history.",
    ),
  component: () => (
    <RequirePage to="/library">
      <LibraryPage />
    </RequirePage>
  ),
});
const statusIcon = (status: string) =>
  status === "stale"
    ? Clock
    : status === "conflict"
      ? GitCompare
      : status === "retired"
        ? Archive
        : ShieldCheck;
function LibraryPage() {
  const { person, can } = useSession();
  const showOwner = personaDef(person.persona).sees_internal_owner;
  useDemoStore((s) => s.units);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [kb, setKb] = useState("");
  const [selected, setSelected] = useState<DemoUnit | null>(null);
  const units = scopedLibrary(listUnits(), person);
  const rows = units.filter(
    (u) =>
      (!query ||
        `${u.title} ${u.unit_id} ${showOwner ? u.owner : ""}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (!status || u.status === status) &&
      (!kb || UNIT_META[u.unit_id]?.kb === kb),
  );
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold">Knowledge library</h1>
          <p className="mt-2 text-sm text-ink-muted">Approved knowledge and its lifecycle.</p>
        </div>
        {can("ingest_source") && (
          <Button asChild>
            <Link to="/work">
              Ingest source <ArrowUpRight />
            </Link>
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-ink-muted" />
          <Input
            aria-label="Search knowledge"
            className="h-10 bg-surface pl-9"
            placeholder="Search units, titles, or owners…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          aria-label="Knowledge status"
          className="field-select h-10"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {[...new Set(units.map((u) => u.status))].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Knowledge base"
          className="field-select h-10"
          value={kb}
          onChange={(e) => setKb(e.target.value)}
        >
          <option value="">All knowledge bases</option>
          {person.kbs.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr>
              <th>Knowledge unit</th>
              <th>Status</th>
              {showOwner && <th>Owner</th>}
              <th>Version</th>
              <th>Effective</th>
              <th>Review date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const v = u.versions.at(-1);
              const Icon = statusIcon(u.status);
              return (
                <tr key={u.unit_id} className="border-t border-border">
                  <td>
                    <Button
                      variant="link"
                      className="h-auto justify-start whitespace-normal p-0 text-left text-ink"
                      onClick={() => setSelected(u)}
                    >
                      <BookOpen className="text-ink-muted" />
                      {u.title}
                    </Button>
                    <p className="mt-1 pl-6 font-mono text-[11px] text-ink-muted">
                      {u.unit_id} · {UNIT_META[u.unit_id]?.kb}
                    </p>
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-xs ${u.status === "approved" ? "bg-primary/5 text-primary" : "text-ink-muted"}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {u.status}
                    </span>
                  </td>
                  {showOwner && <td>{u.owner}</td>}
                  <td>v{v?.version ?? "—"}</td>
                  <td className="whitespace-nowrap">{v?.effective_date ?? "—"}</td>
                  <td className="whitespace-nowrap">
                    {UNIT_META[u.unit_id]?.review_date ?? "Not recorded"}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-ink-muted">
                  {person.kbs.length
                    ? "No knowledge units match these filters."
                    : "No knowledge bases are assigned to this person."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-muted">
        {rows.length} of {units.length} units · within your knowledge-base scope
      </p>
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{selected?.title}</SheetTitle>
            <SheetDescription>Knowledge unit details & history</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-6 px-4 pb-8">
              <div className="flex gap-2 text-xs">
                <span className="rounded border border-border px-2 py-1">{selected.status}</span>
                {selected.verbatim && (
                  <span className="flex items-center gap-1 text-primary">
                    <Lock className="h-3 w-3" />
                    Verbatim
                  </span>
                )}
              </div>
              <dl className="grid grid-cols-[7rem_1fr] gap-2 text-sm">
                <dt className="text-ink-muted">Unit ID</dt>
                <dd>{selected.unit_id}</dd>
                {showOwner && (
                  <>
                    <dt className="text-ink-muted">Owner</dt>
                    <dd>{selected.owner}</dd>
                  </>
                )}
                <dt className="text-ink-muted">Knowledge base</dt>
                <dd>{UNIT_META[selected.unit_id]?.kb}</dd>
                <dt className="text-ink-muted">Applies to</dt>
                <dd>{UNIT_META[selected.unit_id]?.applies_to ?? "Not recorded"}</dd>
              </dl>
              <h2 className="font-semibold">Version history</h2>
              {[...selected.versions].reverse().map((v) => (
                <div key={v.version} className="border-l-2 border-primary/30 pl-4">
                  <p className="text-sm font-semibold">
                    Version {v.version} · {v.effective_date}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">Approved by {v.approver}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{v.text}</p>
                </div>
              ))}
              <p className="text-xs text-ink-muted">
                Original source-document preview is not connected. Stored unit versions are shown
                above.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
