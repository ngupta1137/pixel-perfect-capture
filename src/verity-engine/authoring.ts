// Server-only authoring entry: source ingest, approval queue, gap proposals.
// Maps the engine's KnowledgeStore (copied from the verity repo) to the
// browser contract in src/services/authoring.ts.
import sourceDocs from "./data/source_docs.json";
import gapReport from "./data/gap_report.json";
import unitsSeed from "./data/units_seed.json";
import { getStore, resetStore, AS_OF } from "./server.ts";
import type {
  ActionResult, AuthoringState, CandidateView, DecideRequest, DraftView, GapCluster, IngestView, SampleSource, UnitRow,
} from "../services/authoring.ts";

const docs = sourceDocs as Record<string, string>;
const RX = docs["rx_education_script_A.md"] ?? "";

// Demo sources. Synthetic. The "revised" script changes two lines; the v4
// script is a new document that repeats the opening, rewords the legal
// disclaimer and adds one new talking point.
const SAMPLES: SampleSource[] = [
  {
    id: "rx-current",
    label: "Rx education script (as approved)",
    hint: "Re-ingest the current script: nothing changed, so nothing is flagged.",
    text: RX,
  },
  {
    id: "rx-revised",
    label: "Rx education script, revised",
    hint: "Two edits: delivery time, and one word in the legal pricing disclaimer.",
    text: RX.replace("7 to 10 business days", "5 to 7 business days").replace(
      "based on your current plan and may change.",
      "based on your current plan and will not change.",
    ).replace("Last edited: 03/14/2026", "Last edited: 10/06/2026"),
  },
  {
    id: "outreach-v4",
    label: "Outreach script v4 (new document)",
    hint: "A new script that copies the opening, rewords the disclaimer and adds a talking point.",
    text: [
      "PHARMACY OUTREACH SCRIPT v4   (SYNTHETIC - FOR PROTOTYPE ONLY)",
      "Doc ID: KB-PHARM-0099 | Owner: Outbound Pharmacy Team | Last edited: 10/01/2026 | Effective: 10/01/2026",
      "",
      'Intro (read as written): "Thank you for calling. This call is on a recorded line and may be monitored for quality and training purposes. My name is [Advocate Name]. May I have your full name and date of birth?"',
      "",
      "Talking points:",
      "- Members can set up automatic refills for maintenance medications delivered by mail",
      "- Members can get up to a 100-day supply of maintenance medications by mail",
      "",
      'Pricing disclaimer - Verbatim (Legal): "The prices I give you today are estimates based on your current plan and might change. Your final cost will be confirmed once your prescription is processed."',
    ].join("\n"),
  },
];

const CONFLICT = new Set(["U-PH-107", "U-PH-007"]);
// Versions as seeded, so "Updated" marks only what changed in this session.
const SEED_VERSION = new Map(
  ((unitsSeed as unknown as { units: { unit_id: string; version: number }[] }).units ?? []).map((u) => [u.unit_id, u.version]),
);

function units(): UnitRow[] {
  return getStore()
    .units()
    .filter((u) => u.status !== "duplicate_candidate")
    .map((u) => ({
      unit_id: u.unit_id,
      title: u.title,
      owner: u.owner,
      version: u.version,
      verbatim: u.verbatim,
      status: u.status,
      updated: u.version > (SEED_VERSION.get(u.unit_id) ?? 0),
      badge: u.status === "retired" ? "retired" : u.review_date < AS_OF ? "stale" : CONFLICT.has(u.unit_id) ? "conflict" : null,
    }));
}

function draftView(d: ReturnType<ReturnType<typeof getStore>["queue"]>[number]): DraftView {
  return {
    draft_id: d.draft_id,
    kind: d.kind,
    status: d.status,
    unit_id: d.unit.unit_id,
    title: d.unit.title,
    body: d.unit.body,
    verbatim: d.unit.verbatim,
    knowledge_base: d.unit.knowledge_base,
    owner: d.unit.owner,
    route_to: d.route_to,
    reason: d.reason,
    diff: d.diff,
    previous_body: d.previous_body,
    proposed_by: d.proposed_by,
    decided_by: d.decided_by ?? null,
    decided_role: d.decided_role ?? null,
    comment: d.comment ?? null,
    published_version: d.published_version ?? null,
  };
}

const gapDrafts = new Map<string, string>(); // cluster_id -> draft_id

function gaps(): GapCluster[] {
  const report = gapReport as unknown as {
    clusters: {
      cluster_id: string; demand: number; questions: { id: string; text: string }[]; gap_type: string;
      nearest_existing_unit: { unit_id: string; title: string; owner: string } | null;
      draft_unit: { title: string | null; synonyms: string[] };
    }[];
  };
  const live = getStore().units();
  return report.clusters.map((c) => {
    const near = c.nearest_existing_unit ? live.find((u) => u.unit_id === c.nearest_existing_unit!.unit_id) : undefined;
    const first = c.questions[0]?.text ?? c.cluster_id;
    return {
      cluster_id: c.cluster_id,
      demand: c.demand,
      questions: c.questions,
      gap_type: c.gap_type,
      nearest: c.nearest_existing_unit ? { unit_id: c.nearest_existing_unit.unit_id, title: c.nearest_existing_unit.title, owner: c.nearest_existing_unit.owner } : null,
      suggested_title: c.draft_unit.title ?? first.charAt(0).toUpperCase() + first.slice(1),
      knowledge_base: near?.knowledge_base ?? "KB-PHARM",
      owner: near?.owner ?? "Knowledge Ops",
      synonyms: c.draft_unit.synonyms ?? c.questions.map((q) => q.text),
      proposed_draft: gapDrafts.get(c.cluster_id) ?? null,
    };
  });
}

export function authoringState(): AuthoringState {
  const s = getStore();
  return {
    units: units(),
    queue: s.queue().map(draftView).reverse(),
    audit: s.log().reverse(),
    gaps: gaps(),
    samples: SAMPLES,
    as_of: AS_OF,
  };
}

const clip = (t: unknown) => String(t ?? "").slice(0, 20000);

export function ingestSource(text: string): IngestView {
  const r = getStore().ingest(clip(text));
  return {
    doc_id: r.doc_id,
    title: r.title,
    owner: r.owner,
    effective_date: r.effective_date,
    extractor: r.extractor,
    skipped: r.skipped,
    notes: r.lifecycle_notes,
    candidates: r.candidates.map(
      (c): CandidateView => ({
        cid: c.cid,
        title: c.title,
        type: c.type,
        body: c.body,
        verbatim: c.verbatim,
        knowledge_base: c.knowledge_base,
        owner: c.owner,
        source_section: c.source_section,
        status: c.match.status,
        unit_id: c.match.unit_id,
        unit_title: c.match.unit_title,
        similarity: c.match.similarity,
        diff: c.match.drift?.diff ?? [],
        impact: c.match.drift?.impact ?? null,
        route_to: c.route_to,
      }),
    ),
  };
}

const ok = (message: string): ActionResult => ({ ok: true, error: null, message, state: authoringState() });
const fail = (e: unknown): ActionResult => ({ ok: false, error: (e as Error).message, message: null, state: authoringState() });

/** Re-extracts on the server and queues the chosen candidates; the browser never supplies unit content. */
export function proposeCandidates(text: string, cids: string[]): ActionResult {
  try {
    const s = getStore();
    const r = s.ingest(clip(text));
    const chosen = r.candidates.filter((c) => cids.includes(c.cid) && c.match.status !== "unchanged");
    const drafts = chosen.map((c) => s.proposeFromCandidate(c, "agent:extraction (rules-v0)")).filter(Boolean);
    return ok(drafts.length ? `${drafts.length} sent to the review queue` : "Nothing to send: no changed or new units selected");
  } catch (e) {
    return fail(e);
  }
}

export function decide(req: DecideRequest): ActionResult {
  try {
    const s = getStore();
    const who = { name: String(req.approver?.name ?? ""), role: req.approver?.role === "legal" ? ("legal" as const) : ("author" as const) };
    if (req.action === "approve") {
      const edits = req.body !== null && req.body !== undefined ? { body: clip(req.body) } : undefined;
      const u = s.approve(req.draft_id, who, edits);
      return ok(`Published ${u.unit_id} v${u.version}. It is live on the Ask page now.`);
    }
    s.reject(req.draft_id, who, String(req.reason ?? ""));
    return ok(`Rejected ${req.draft_id}. The approved version stays live.`);
  } catch (e) {
    return fail(e);
  }
}

export function proposeGap(input: { cluster_id: string; title: string; body: string }): ActionResult {
  try {
    const c = gaps().find((g) => g.cluster_id === input.cluster_id);
    if (!c) throw new Error(`unknown cluster ${input.cluster_id}`);
    if (!String(input.body ?? "").trim()) throw new Error("Write the answer first: the gap analyst groups the questions, a person supplies the content");
    const d = getStore().proposeGapUnit(
      {
        title: clip(input.title) || c.suggested_title,
        body: clip(input.body),
        knowledge_base: c.knowledge_base,
        owner: c.owner,
        synonyms: c.synonyms,
        evidence: c.questions.map((q) => q.id),
      },
      "Dana (Knowledge author), from gap analyst cluster " + c.cluster_id,
    );
    gapDrafts.set(c.cluster_id, d.draft_id);
    return ok(`${d.draft_id} sent to the review queue (${d.route_to})`);
  } catch (e) {
    return fail(e);
  }
}

export function resetDemo(): ActionResult {
  resetStore();
  gapDrafts.clear();
  return ok("Demo reset to the seed data");
}
