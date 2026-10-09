import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, FileText, Info, Upload, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequirePage } from "@/components/shell/Denied";
import { Chip, Lifecycle, WordDiff } from "@/components/authoring/Chain";
import { useSession } from "@/lib/session";
import { useDemoStore } from "@/services/demoStore";
import {
  AEP_SAMPLE,
  canPropose,
  extractCandidates,
  proposeCandidates,
  type Candidate,
} from "@/services/verity";

export const Route = createFileRoute("/work")({
  head: () => ({
    meta: [
      { title: "My work — Verity" },
      {
        name: "description",
        content: "Extract knowledge from sources, propose drafts and follow them to approval.",
      },
      { property: "og:title", content: "My work — Verity" },
      {
        property: "og:description",
        content: "Extract knowledge from sources, propose drafts and follow them to approval.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequirePage to="/work">
      <WorkPage />
    </RequirePage>
  ),
});

const STATUS: Record<
  Candidate["status"],
  { label: string; tone: "ok" | "warn" | "bad" | "info" | "muted" }
> = {
  unchanged: { label: "Unchanged", tone: "ok" },
  changed_flagged: { label: "Changed: flagged", tone: "bad" },
  changed: { label: "Changed", tone: "warn" },
  new: { label: "New unit", tone: "info" },
  skipped: { label: "Skipped", tone: "muted" },
};

function WorkPage() {
  const [tab, setTab] = useState("sources");
  return (
    <section>
      <h1 className="text-2xl font-semibold">Ingestion & drafts</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Turn source material into governed knowledge. Publication requires human approval.
      </p>
      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="drafts">My drafts</TabsTrigger>
          <TabsTrigger value="gaps">Gaps</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        <TabsContent value="sources">
          <Sources onProposed={() => setTab("drafts")} />
        </TabsContent>
        <TabsContent value="drafts">
          <MyDrafts />
        </TabsContent>
        <TabsContent value="gaps">
          <Gaps />
        </TabsContent>
        <TabsContent value="insights">
          <Insights />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function Sources({ onProposed }: { onProposed: () => void }) {
  const { person } = useSession();
  const [source, setSource] = useState<"sample" | "paste">("sample");
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cands, setCands] = useState<Candidate[] | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const extract = async () => {
    setBusy(true);
    setError("");
    try {
      const c = await extractCandidates(
        person.name,
        source === "sample" ? AEP_SAMPLE.text : pasted,
      );
      setCands(c);
      setSel(new Set(c.filter(canPropose).map((x) => x.cid)));
    } catch {
      setError("Extraction could not finish. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const toggle = (cid: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(cid)) n.delete(cid);
      else n.add(cid);
      return n;
    });
  return (
    <div className="mt-6 space-y-5">
      <ol className="flex flex-wrap gap-5 border-b border-border pb-4 text-sm">
        {["Source document", "Review candidates", "Submit for review"].map((step, i) => (
          <li
            key={step}
            className={`flex items-center gap-2 ${(!cands && i === 0) || (cands && i === 1) ? "font-semibold text-primary" : "text-ink-muted"}`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">
              {i + 1}
            </span>
            {step}
            {i < 2 && <ArrowRight className="ml-2 h-3 w-3" />}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={source === "sample" ? "default" : "outline"}
          onClick={() => setSource("sample")}
        >
          <FileText className="h-4 w-4" /> {AEP_SAMPLE.title} ({AEP_SAMPLE.id})
        </Button>
        <Button
          variant={source === "paste" ? "default" : "outline"}
          onClick={() => setSource("paste")}
        >
          Paste text
        </Button>
        <Button variant="outline" asChild>
          <label className="cursor-pointer">
            <Upload />
            Import text file
            <input
              type="file"
              accept=".txt,.md"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setSource("paste");
                setPasted(await file.text());
              }}
            />
          </label>
        </Button>
      </div>
      {source === "sample" ? (
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-alt p-3 text-sm">
          {AEP_SAMPLE.text}
        </pre>
      ) : (
        <Textarea
          aria-label="Source text"
          rows={6}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="Paste paragraphs separated by blank lines"
        />
      )}
      <Button onClick={extract} disabled={busy || (source === "paste" && !pasted.trim())}>
        {busy ? "Extracting…" : "Extract"}
      </Button>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="text-xs text-ink-muted">
        Text and Markdown import supported. PDF and Word extraction are not connected.
      </p>
      {cands && (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="text-left text-ink-muted">
                <tr className="border-b border-border">
                  <th className="w-8 py-2" />
                  <th>Candidate</th>
                  <th>Status</th>
                  <th>Matches</th>
                  <th>Route</th>
                </tr>
              </thead>
              <tbody>
                {cands.map((c) => (
                  <tr key={c.cid} className="border-b border-border align-top">
                    <td className="py-3">
                      {canPropose(c) && (
                        <Checkbox
                          checked={sel.has(c.cid)}
                          onCheckedChange={() => toggle(c.cid)}
                          aria-label={`Select ${c.title}`}
                        />
                      )}
                    </td>
                    <td className="space-y-2 py-3 pr-3">
                      <p className="font-semibold">{c.title}</p>
                      {c.match && !c.match.exact ? (
                        <WordDiff from={c.match.text} to={c.text} />
                      ) : (
                        <p className={c.status === "skipped" ? "text-ink-muted line-through" : ""}>
                          {c.text}
                        </p>
                      )}
                      {c.banner && (
                        <p className="flex items-start gap-1.5 rounded-md border border-destructive bg-destructive/5 p-2 text-xs font-semibold text-destructive">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{" "}
                          {c.banner}
                        </p>
                      )}
                      {c.note && <p className="text-xs text-ink-muted">{c.note}</p>}
                      {c.suggestion && (
                        <p className="flex items-start gap-1.5 text-xs">
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{" "}
                          {c.suggestion}
                        </p>
                      )}
                      {c.skip_reason && (
                        <p className="text-xs text-ink-muted">Skipped: {c.skip_reason}</p>
                      )}
                      {c.tags?.map((t) => (
                        <Chip key={t} tone="info">
                          Suggested tag: {t}
                        </Chip>
                      ))}
                    </td>
                    <td className="py-3">
                      <Chip tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Chip>
                    </td>
                    <td className="py-3 text-xs">
                      {c.match && (
                        <p>
                          {c.match.unit_id} v{c.match.version}
                          {c.match.exact ? " · exact" : ""}
                        </p>
                      )}
                      {c.duplicates?.map((d) => (
                        <p key={d.unit_id} className="text-ink-muted">
                          Possible duplicate: {d.unit_id} ({d.similarity.toFixed(2)})
                        </p>
                      ))}
                    </td>
                    <td className="py-3 text-xs">
                      {c.route && (
                        <Chip tone={c.route === "legal" ? "bad" : "warn"}>
                          {c.route === "legal"
                            ? "Route: Needs Legal"
                            : `Route: Needs owner (${c.owner_team})`}
                        </Chip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={sel.size === 0}
              onClick={() => {
                proposeCandidates(
                  person.name,
                  cands.filter((c) => sel.has(c.cid)),
                );
                setCands(null);
                onProposed();
              }}
            >
              Propose selected ({sel.size})
            </Button>
            <p className="text-sm text-ink-muted">
              Proposing creates drafts. A second person approves.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function MyDrafts() {
  const { person } = useSession();
  const all = useDemoStore((s) => s.chainDrafts);
  const drafts = all.filter((d) => d.proposed_by === person.name);
  if (!drafts.length)
    return (
      <p className="mt-4 text-sm text-ink-muted">
        No drafts yet. Extract a source and propose changes.
      </p>
    );
  return (
    <ul className="mt-4 space-y-3">
      {drafts.map((d) => (
        <li key={d.id} className="rounded-lg border border-border bg-background p-4">
          <p className="font-semibold">
            {d.title} <span className="font-mono text-xs text-ink-muted">{d.unit_id}</span>
          </p>
          <p className="mt-1 text-sm">{d.proposed_text}</p>
          <div className="mt-3">
            <Lifecycle d={d} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Gaps() {
  const reqs = useDemoStore((s) => s.requests);
  const gaps = [
    ...new Set(reqs.filter((r) => r.outcome === "insufficient_evidence").map((r) => r.query)),
  ];
  if (!gaps.length)
    return <p className="mt-4 text-sm text-ink-muted">No gaps logged in this demo session yet.</p>;
  return (
    <div className="mt-5 overflow-x-auto rounded-md border border-border bg-surface">
      <table>
        <thead>
          <tr>
            <th>Unanswered question</th>
            <th>Session demand</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {gaps.map((g) => (
            <tr key={g} className="border-t border-border">
              <td>{g}</td>
              <td>{reqs.filter((r) => r.query === g).length}</td>
              <td>
                <Chip tone="warn">Needs knowledge</Chip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Insights() {
  const reqs = useDemoStore((s) => s.requests);
  const counts = new Map<string, number>();
  reqs.forEach((r) =>
    counts.set(r.query.toLowerCase(), (counts.get(r.query.toLowerCase()) ?? 0) + 1),
  );
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (!top.length)
    return (
      <p className="mt-4 text-sm text-ink-muted">No questions asked in this demo session yet.</p>
    );
  return (
    <div className="mt-5 overflow-x-auto rounded-md border border-border bg-surface">
      <table>
        <thead>
          <tr>
            <th>Question</th>
            <th>Requests this session</th>
          </tr>
        </thead>
        <tbody>
          {top.map(([q, n]) => (
            <tr key={q} className="border-t border-border">
              <td>{q}</td>
              <td>{n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
