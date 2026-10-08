// Server-only entry: runs the Verity engine and maps its result to the UI
// contract in src/services/verity.ts (same shape as POST /v1/search in the
// verity repo). Imported only from server functions, so unit bodies, roles
// and rules never ship to the browser.
import unitsRaw from './data/units_seed.json';
import rolesRaw from './data/roles.json';
import lexiconRaw from './data/lexicon.json';
import sourceDocs from './data/source_docs.json';
import { KnowledgeStore } from './workflow.ts';
import type { SearchRequest, SearchResponse } from '../services/verity.ts';

export const AS_OF = '2026-10-06'; // same as-of date as the golden set

// One in-memory knowledge store per server process: search and authoring share
// it, so a unit approved on the Author page is served on the next Ask query.
// Restarting the server resets the demo to the seed data.
let store: KnowledgeStore | null = null;
export function getStore(): KnowledgeStore {
  if (!store) {
    const raw = unitsRaw as unknown as { units?: unknown[] } | unknown[];
    const units = (Array.isArray(raw) ? raw : raw.units ?? []) as never;
    store = new KnowledgeStore(
      {
        units,
        roles: (rolesRaw as unknown as { roles: never }).roles,
        lexicon: (lexiconRaw as unknown as { entries: never }).entries,
        asOf: AS_OF,
      },
      Object.values(sourceDocs as Record<string, string>),
    );
  }
  return store;
}

export function resetStore(): void {
  store = null;
}

const ROLES = new Set(['pharmacy_advocate', 'insurance_advocate', 'member_chat']);

export function serveEngine(req: SearchRequest): SearchResponse {
  if (!ROLES.has(req.role)) throw new Error(`unknown role ${req.role}`);
  const e = getStore().engine();
  const r = e.serve({
    query: String(req.query ?? '').slice(0, 1000),
    role: req.role,
    channel: req.channel,
    input_mode: req.input_mode ?? 'typed',
    context: { lob: req.lob ?? null, state: req.state ?? null },
  });
  return {
    request_id: r.record.request_id,
    outcome: r.outcome,
    parts: r.parts.map((p) => ({
      part: p.part,
      outcome: p.outcome,
      message: p.message,
      text: p.text,
      owner_team: p.owner_team ?? null,
      citations: p.unit_ids.map((id) => {
        const u = e.unit(id)!;
        return {
          unit_id: u.unit_id, version: u.version, title: u.title, owner: u.owner,
          effective_date: u.effective_date, verbatim: u.verbatim,
          ...(p.outcome === 'conflict' ? { text: u.body } : {}),
        };
      }),
    })),
    trace: r.trace.map((t) => `${t.step}. ${t.name} [${t.kind}]: ${t.detail}`),
    engine: r.record.engine,
  };
}
