// Server-only entry: runs the Verity engine and maps its result to the UI
// contract in src/services/verity.ts (same shape as POST /v1/search in the
// verity repo). Imported only from server functions, so unit bodies, roles
// and rules never ship to the browser.
import unitsRaw from './data/units_seed.json';
import rolesRaw from './data/roles.json';
import lexiconRaw from './data/lexicon.json';
import { Verity } from './pipeline.ts';
import type { SearchRequest, SearchResponse } from '../services/verity.ts';

const AS_OF = '2026-10-06'; // same as-of date as the golden set

let engine: Verity | null = null;
function getEngine(): Verity {
  if (!engine) {
    const raw = unitsRaw as unknown as { units?: unknown[] } | unknown[];
    const units = (Array.isArray(raw) ? raw : raw.units ?? []) as never;
    engine = new Verity({
      units,
      roles: (rolesRaw as unknown as { roles: never }).roles,
      lexicon: (lexiconRaw as unknown as { entries: never }).entries,
      asOf: AS_OF,
    });
  }
  return engine;
}

const ROLES = new Set(['pharmacy_advocate', 'insurance_advocate', 'member_chat']);

export function serveEngine(req: SearchRequest): SearchResponse {
  if (!ROLES.has(req.role)) throw new Error(`unknown role ${req.role}`);
  const e = getEngine();
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
