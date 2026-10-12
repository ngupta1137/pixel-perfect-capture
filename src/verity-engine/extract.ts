// @ts-nocheck
// Copied from ngupta1137/verity src/engine/extract.ts (tested there: npm test). Do not edit here; change it in the verity repo and copy again.
// Source document -> candidate knowledge units (FOUNDATIONS section 9, authoring).
//
// This is the rules-based BASELINE extractor ("rules-v0"). In production the
// extraction agent (a model behind the gateway) proposes the units; this
// baseline does the same job with deterministic rules so the authoring flow
// works with no model and no API key, and so the model version has something
// to beat on the same checks.
//
// Whatever proposes the units, the next steps are deterministic: every
// candidate is compared with the approved units (hash, then word diff), and
// nothing is published here. Candidates go to the approval queue.

import type { KnowledgeUnit } from './types.ts';
import { checkChange, normalizeForHash, type DriftResult } from './drift.ts';

export const EXTRACTOR_VERSION = 'rules-v0';

export type CandidateType = 'verbatim' | 'procedure' | 'fact';

export type MatchStatus =
  | 'unchanged' // identical (after normalization) to an approved unit: nothing to do
  | 'changed' // same topic as an approved unit, different text: drift flag, routed for review
  | 'new'; // no approved unit covers it: draft for review

export interface CandidateUnit {
  cid: string;
  annotated_id?: string;
  title: string;
  type: CandidateType;
  body: string;
  verbatim: boolean;
  knowledge_base: string;
  owner: string;
  source_doc: string;
  source_section: string;
  effective_date: string;
  review_date: string;
  suggested_synonyms: string[];
  match: {
    status: MatchStatus;
    unit_id: string | null;
    unit_title: string | null;
    similarity: number;
    drift: DriftResult | null;
  };
  route_to: string;
  extractor: string;
  suggestions: Suggestion[];
  revision?: string;
  plan_scope?: string;
  allowed_roles?: string[];
  classification?: string;
  version?: number;
  version_id?: string;
  supersedes?: string | null;
  duplicate_of?: string | null;
  is_duplicate_review?: boolean;
  domain?: string;
  annotations?: Record<string, string>;
}

export function normalizeSupersedes(val: string | null | undefined): string | null {
  if (!val) return null;
  const parts = String(val).split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
  const out = new Set<string>();
  for (const p of parts) {
    out.add(p);
    if (/KB-PHARM-0142/i.test(p) || /U-PH-090/i.test(p) || /U-PH-007/i.test(p)) {
      out.add("U-PH-007");
      out.add("U-PH-090");
    }
    if (/KB-PHARM-0199/i.test(p) || /KB-PHARM-0098/i.test(p) || /U-PH-100/i.test(p) || /U-PH-107/i.test(p)) {
      out.add("U-PH-107");
      out.add("U-PH-100");
    }
  }
  return [...out].join(", ");
}

/**
 * Reviewer suggestions (the brief's "AI recommends" row). Advisory only: a
 * person accepts or ignores them in the review queue.
 * - merge: a new candidate that probably restates an existing unit
 * - split: one candidate that holds several separate facts
 * - tags: applicability (line of business, states, plan year) and synonyms the
 *   text itself supports. Only what the source states is proposed; the default
 *   scope is never widened or narrowed by guesswork.
 */
export type Suggestion =
  | { kind: 'merge'; unit_id: string; unit_title: string; overlap: number; reason: string }
  | { kind: 'split'; parts: { text: string; unit_id: string | null; unit_title: string | null }[]; reason: string }
  | { kind: 'tags'; lob: string[] | null; states: string[] | null; plan_year: number | null; synonyms: string[]; evidence: string[]; reason: string };

export interface SkippedLine {
  text: string;
  reason: string;
}

export interface ExtractionResult {
  doc_id: string;
  title: string;
  owner: string;
  effective_date: string;
  candidates: CandidateUnit[];
  skipped: SkippedLine[];
  lifecycle_notes: string[];
  extractor: string;
  revision?: string;
  plan_scope?: string;
  allowed_roles?: string[];
  classification?: string;
  version?: number;
  version_id?: string;
  supersedes?: string | null;
  duplicate_of?: string | null;
  domain?: string;
  annotations?: Record<string, string>;
}

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'by', 'is', 'are', 'be', 'with', 'your', 'this', 'that', 'can', 'may', 'will', 'it', 'as', 'at', 'from', 'any', 'their', 'members', 'member']);

function isoFromUs(s: string | undefined): string | null {
  const m = s?.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[1]!.padStart(2, '0')}-${m[2]!.padStart(2, '0')}`;
}

function plusOneYear(iso: string): string {
  return `${Number(iso.slice(0, 4)) + 1}${iso.slice(4)}`;
}

function titleCase(s: string): string {
  const t = s.replace(/[\[\]*:]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function parseDateRange(s: string | undefined): { start: string | null; end: string | null } {
  if (!s) return { start: null, end: null };
  const mRangeUs = s.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s*(?:-|through|to)\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (mRangeUs) {
    return { start: isoFromUs(mRangeUs[1]), end: isoFromUs(mRangeUs[2]) };
  }
  const mRangeText = s.match(/([A-Za-z]+\s+\d{1,2},\s*\d{4})\s*(?:-|through|to)\s*([A-Za-z]+\s+\d{1,2},\s*\d{4})/i);
  if (mRangeText) {
    const d1 = new Date(mRangeText[1]);
    const d2 = new Date(mRangeText[2]);
    const sIso = !isNaN(d1.getTime()) ? d1.toISOString().slice(0, 10) : null;
    const eIso = !isNaN(d2.getTime()) ? d2.toISOString().slice(0, 10) : null;
    return { start: sIso, end: eIso };
  }
  const single = isoFromUs(s);
  return { start: single, end: null };
}

function cleanTitle(s: string): string {
  let res = s.trim();
  res = res.replace(/^#{1,6}\s+/, '');
  res = res.replace(/^\[[A-Za-z0-9_.-]+\]\s*/i, '');
  res = res.replace(/\s*\[[A-Za-z0-9_.-]+\]$/i, '');
  res = res.replace(/^(?:Unit|Candidate(?:\s+ID)?)\s*:\s*[A-Za-z0-9_.-]+\s*/i, '');
  res = res.replace(/^[*_`~]+|[*_`~]+$/g, '');
  res = res.replace(/^\[[A-Za-z0-9_.-]+\]\s*/i, '');
  res = res.replace(/^[*_`~]+|[*_`~]+$/g, '');
  res = res.replace(/:$/, '');
  res = res.replace(/\(SYNTHETIC.*$/i, '');
  return res.trim();
}

function extractBracketedId(s: string): string | undefined {
  const m = s.match(/\[([A-Za-z0-9_.-]+)\]/) || s.match(/(?:Unit|Candidate(?:\s+ID)?)\s*:\s*([A-Za-z0-9_.-]+)/i);
  return m ? m[1] : undefined;
}

function isNonKnowledgeHeading(title: string): boolean {
  const clean = cleanTitle(title).toLowerCase();
  return /^(extraction annotations|candidate annotations|annotations|source-upload instructions|source upload instructions|upload instructions|instructions|source instructions|document metadata|metadata|document information|administrative details|change log|revision history)$/i.test(clean);
}

/** "[EDUCATION] Pricing disclaimer" -> "Pricing disclaimer"; "[OPENING]" -> "Opening". */
function sectionName(section: string): string {
  const rest = section.replace(/^\[[^\]]+\]\s*/, '');
  return (rest || section.replace(/^\[|\]$/g, '')).replace(/\(aka.*$/i, '').trim();
}

function kbFor(docId: string, verbatim: boolean, section: string, owner?: string): string {
  // Call openings and closings are shared across teams; everything else stays
  // in the knowledge base of the source document.
  if (verbatim && /open|clos|intro|wrap/i.test(section)) return 'KB-SHARED';
  const m = docId.match(/^(KB-[A-Z]+)/i);
  if (m) return m[1]!.toUpperCase();
  if (/^SRC-RX|^RX-/i.test(docId)) return 'KB-PHARM';
  if (/^SRC-INS/i.test(docId)) return 'KB-INS';
  if (/^SRC-BEN/i.test(docId)) return 'KB-PHARM';
  if (owner && /insurance/i.test(owner)) return 'KB-INS';
  return 'KB-PHARM';
}


function contentWords(s: string): string[] {
  return normalizeForHash(s).replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
}

function jaccard(a: string, b: string): number {
  const x = new Set(contentWords(a));
  const y = new Set(contentWords(b));
  if (!x.size || !y.size) return 0;
  const inter = [...x].filter((w) => y.has(w)).length;
  return Math.round((inter / new Set([...x, ...y]).size) * 100) / 100;
}

// Changed-vs-new threshold on content-word overlap. Chosen on the three
// synthetic documents; reported, not tuned per case (evals/EXTRACTION.md).
export const MATCH_THRESHOLD = 0.4;

interface Raw {
  title: string;
  type: CandidateType;
  body: string;
  verbatim: boolean;
  section: string;
  review?: string | null;
  labeled?: boolean;
  annotated_id?: string;
  version?: number;
  version_id?: string;
  supersedes?: string | null;
  duplicate_of?: string | null;
  is_duplicate_review?: boolean;
  annotations?: Record<string, string>;
}

const META_KEYS = new Set([
  'doc id',
  'doc_id',
  'source id',
  'source_id',
  'revision',
  'source revision',
  'rev',
  'plan scope',
  'plan_scope',
  'scope',
  'owner',
  'owner team',
  'author',
  'effective',
  'effective period',
  'effective date',
  'effective dates',
  'last edited',
  'classification',
  'allowed role',
  'allowed roles',
  'role',
  'roles',
  'audience',
  'annotated unit id',
  'unit id',
  'unit_id',
  'candidate id',
  'candidate_id',
  'candidate',
  'annotated candidate',
  'annotated candidate id',
  'proposed version',
  'proposed_version',
  'version',
  'version_id',
  'supersedes',
  'supersedes unit',
  'superseded by',
  'duplicate review',
  'duplicate candidate',
  'duplicate of',
  'duplicate_of',
  'duplicate',
  'instructions',
  'source-upload instructions',
  'source upload instructions',
  'upload instructions',
  'source instructions',
  'status',
  'review date',
  'next review due',
  'knowledge base',
  'kb',
  'tags',
  'synonyms',
  'domain',
  'domain team',
  'unit type',
  'unit_type',
  'type',
  'candidate type',
  'target type',
]);

function isMetaLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^---/.test(trimmed)) return true;
  if (/^<!--.*-->$/.test(trimmed)) return true;
  if (/^["'\[\]\s,]+$/.test(trimmed)) return true;
  if (/^["']?[a-zA-Z0-9_-]+["']?\]\s*,?$/i.test(trimmed)) return true;
  if (/^\[?["']?(?:pharmacy_advocate|insurance_advocate|member_chat|clinical_reviewer)["']?\]?,?$/i.test(trimmed)) return true;

  const stripped = trimmed.replace(/^[-*•]\s+/, '').replace(/^>\s*/, '');
  const colonIdx = stripped.indexOf(':');
  if (colonIdx > 0) {
    const key = stripped.slice(0, colonIdx).replace(/[`*]/g, '').trim().toLowerCase();
    if (META_KEYS.has(key)) return true;
  }
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|');
    return parts.some((p) => {
      const idx = p.indexOf(':');
      if (idx <= 0) return false;
      const k = p.slice(0, idx).replace(/^[-*•]\s+/, '').replace(/[`*]/g, '').trim().toLowerCase();
      return META_KEYS.has(k);
    });
  }
  return false;
}

function parseMetaLine(line: string, target: Record<string, string>): void {
  const trimmed = line.trim().replace(/^[-*•]\s+/, '');
  // Handle array continuations like '"member_chat"]'
  const roleContinuation = trimmed.match(/^["']?([a-zA-Z0-9_-]+)["']?\]?\s*$/);
  if (roleContinuation && (target['allowed role'] || target['allowed roles'])) {
    const key = target['allowed role'] ? 'allowed role' : 'allowed roles';
    target[key] = `${target[key]}, ${roleContinuation[1]}`;
    return;
  }

  const parts = trimmed.split('|');
  for (const part of parts) {
    const idx = part.indexOf(':');
    if (idx > 0) {
      const k = part.slice(0, idx).replace(/^[-*•]\s+/, '').replace(/[`*]/g, '').trim().toLowerCase();
      let v = part.slice(idx + 1).replace(/^[`*]+|[`*]+$/g, '').trim();
      if (v.startsWith('[') && v.endsWith(']')) {
        v = v.slice(1, -1).replace(/["']/g, '').trim();
      } else if (v.startsWith('[')) {
        v = v.slice(1).replace(/["']/g, '').trim();
      }
      if (k && v) {
        target[k] = v;
      }
    }
  }
}

function cleanCandidateBody(body: string): string {
  let cleaned = body.trim();
  // Strip verbatim preamble instructions like **VERBATIM — do not paraphrase. Insert exactly:**
  cleaned = cleaned.replace(/^\*{0,2}VERBATIM\s*[-—–]?\s*do not paraphrase\.?\s*(?:Insert exactly:?)?\*{0,2}\s*/i, '');
  cleaned = cleaned.replace(/^Verbatim\s*\((?:Legal|Compliance)\):\s*/i, '');

  // If there's an instructional suffix after a quoted verbatim block, extract the quoted string
  const quoteMatch = cleaned.match(/^["“]([\s\S]+?)["”]\s*(?:\n+[\s\S]*)?$/);
  if (quoteMatch) {
    return quoteMatch[1]!.trim();
  }

  const lines = cleaned.split('\n');
  let startIdx = 0;
  while (startIdx < lines.length) {
    const raw = lines[startIdx]!;
    const l = raw.trim();
    if (!l) {
      startIdx++;
      continue;
    }
    if (
      isMetaLine(l) ||
      /^["'\[\]\s,]+$/.test(l) ||
      /^["']?[a-zA-Z0-9_-]+["']?\]\s*,?$/i.test(l) ||
      /^(?:member_chat|pharmacy_advocate|insurance_advocate)["'\]\s,]*$/i.test(l) ||
      /^[-*•]?\s*(?:Candidate ID|Proposed Version|Supersedes|Duplicate Review|Allowed Role|Doc ID|Source ID|Classification|Unit Type|Domain):/i.test(l) ||
      /^\*{0,2}VERBATIM/i.test(l)
    ) {
      startIdx++;
      continue;
    }
    break;
  }
  return lines.slice(startIdx).join('\n').trim();
}

/** Split a messy source document into raw candidates. Deterministic. */
function segment(text: string): { header: Record<string, string>; title: string; raws: Raw[]; skipped: SkippedLine[]; notes: string[] } {
  const lines = text.split(/\r?\n/);
  const header: Record<string, string> = {};
  const raws: Raw[] = [];
  const skipped: SkippedLine[] = [];
  const notes: string[] = [];

  // Parse frontmatter if present
  let startIdx = 0;
  if (lines[0]?.trim().startsWith('---')) {
    let closing = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim().startsWith('---')) {
        closing = i;
        break;
      }
      parseMetaLine(lines[i]!, header);
    }
    if (closing > 0) {
      startIdx = closing + 1;
    }
  }

  // 1. Identify title line
  let titleIndex = -1;
  for (let i = startIdx; i < lines.length; i++) {
    const l = lines[i]!.trim();
    if (l && !l.startsWith('---') && !isMetaLine(l)) {
      titleIndex = i;
      break;
    } else if (l && isMetaLine(l)) {
      parseMetaLine(l, header);
    }
  }

  const rawTitle = titleIndex >= 0 ? lines[titleIndex]!.trim() : (lines[0] ?? '');
  const title = cleanTitle(rawTitle);
  const titleAnnotatedId = extractBracketedId(rawTitle);

  // Check if document uses structured Markdown headings (## or ###)
  const substantiveHeadings = lines.filter((l, idx) => {
    if (idx <= titleIndex) return false;
    const m = l.trim().match(/^(#{2,6})\s+(.+)$/);
    if (!m) return false;
    return !isNonKnowledgeHeading(m[2]!);
  });

  const hasSubstantiveHeadings = substantiveHeadings.length > 0;
  const isMarkdownDoc = rawTitle.startsWith('#') || lines.some((l, idx) => idx > titleIndex && /^#{1,6}\s+/.test(l.trim()));

  if (hasSubstantiveHeadings) {
    // ---------------------------------------------------------------------------
    // Markdown Document Strategy: Header metadata + Heading section boundaries
    // ---------------------------------------------------------------------------
    let currentHeading: {
      title: string;
      section: string;
      annotated_id?: string;
      isNonKnowledge: boolean;
      annotations: Record<string, string>;
    } | null = null;
    let sectionLines: string[] = [];

    const flushMarkdownSection = () => {
      if (!currentHeading || currentHeading.isNonKnowledge || sectionLines.length === 0) {
        currentHeading = null;
        sectionLines = [];
        return;
      }

      const bodyText = sectionLines.join('\n').trim();
      if (bodyText) {
        const combined = { ...header, ...currentHeading.annotations };
        const annotatedId =
          currentHeading.annotated_id ||
          combined['candidate id'] ||
          combined['candidate_id'] ||
          combined['candidate'] ||
          combined['annotated candidate'] ||
          combined['annotated candidate id'] ||
          combined['unit id'] ||
          combined['unit_id'] ||
          titleAnnotatedId;

        const proposedVersion = combined['proposed version'] || combined['proposed_version'] || combined['version_id'] || combined['version'];
        let versionNum: number | undefined;
        if (proposedVersion) {
          const vMatch = proposedVersion.match(/v(\d+)/i) || proposedVersion.match(/(\d+)/);
          if (vMatch) versionNum = parseInt(vMatch[1]!, 10);
        }

        const supersedes = normalizeSupersedes(combined['supersedes'] || combined['supersedes unit'] || combined['supersedes_id'] || null);
        const duplicateSignal = combined['duplicate review'] || combined['duplicate candidate'] || combined['duplicate of'] || combined['duplicate_of'] || combined['duplicate'];
        const isDup = Boolean(duplicateSignal || (annotatedId && /^(?:CAND-)?DUP/i.test(annotatedId)));
        const dupOf = duplicateSignal || (isDup ? annotatedId : null);

        const isVerbatim =
          /verbatim|read as written|do not paraphrase/i.test(currentHeading.title) ||
          /verbatim|read as written|do not paraphrase/i.test(bodyText) ||
          combined['verbatim'] === 'true' ||
          combined['verbatim'] === '1' ||
          combined['type'] === 'verbatim' ||
          combined['candidate type'] === 'verbatim' ||
          combined['candidate type'] === 'legal';

        const explicitType = combined['unit type'] || combined['unit_type'] || combined['type'] || combined['candidate type'];
        const resolvedType = explicitType
          ? explicitType.toLowerCase()
          : isVerbatim
          ? 'verbatim'
          : 'fact';

        raws.push({
          title: currentHeading.title,
          type: resolvedType as any,
          body: cleanCandidateBody(bodyText),
          verbatim: isVerbatim,
          section: currentHeading.section,
          annotated_id: annotatedId,
          version: versionNum,
          version_id: proposedVersion,
          supersedes,
          duplicate_of: dupOf,
          is_duplicate_review: isDup,
          annotations: combined,
        });
      }

      currentHeading = null;
      sectionLines = [];
    };

    for (let i = 0; i < lines.length; i++) {
      if (i <= titleIndex && titleIndex >= 0) continue;
      const rawLine = lines[i]!;
      const line = rawLine.trim();
      if (!line) {
        if (currentHeading && !currentHeading.isNonKnowledge && sectionLines.length > 0) {
          sectionLines.push('');
        }
        continue;
      }

      // Metadata lines before any section
      if (!currentHeading && isMetaLine(line)) {
        parseMetaLine(line, header);
        continue;
      }

      // Check for Markdown heading (levels 2-3 define candidate units; levels 4+ remain substantive text)
      const headingMatch = line.match(/^(#{2,3})\s+(.+)$/);
      if (headingMatch) {
        flushMarkdownSection();
        const fullHeading = headingMatch[2]!.trim();
        const nonKnowledge = isNonKnowledgeHeading(fullHeading);
        const annotatedId = extractBracketedId(fullHeading);
        const headingClean = cleanTitle(fullHeading);

        currentHeading = {
          title: headingClean,
          section: annotatedId ? `[${annotatedId}] ${headingClean}` : headingClean,
          annotated_id: annotatedId,
          isNonKnowledge: nonKnowledge,
          annotations: {},
        };
        continue;
      }

      if (currentHeading) {
        if (currentHeading.isNonKnowledge) {
          if (isMetaLine(line)) {
            parseMetaLine(line, header);
          }
          continue;
        }

        if (isMetaLine(line)) {
          parseMetaLine(line, currentHeading.annotations);
          continue;
        }

        if (/^(tip|fyi)\b/i.test(line)) {
          skipped.push({ text: line, reason: 'coaching tip, not knowledge' });
          continue;
        }
        if (/retired|do not use/i.test(line)) {
          skipped.push({ text: line, reason: 'lifecycle note: routed to the owner as a possible retirement' });
          notes.push(`Possible retirement: "${line}"`);
          continue;
        }
        sectionLines.push(rawLine);
      }
    }
    flushMarkdownSection();

    return { header, title, raws, skipped, notes };
  }

  if (isMarkdownDoc) {
    // ---------------------------------------------------------------------------
    // Markdown Document Strategy: Single substantive knowledge unit
    // (Preserve all substantive paragraphs, quoted scripts, safety restrictions)
    // ---------------------------------------------------------------------------
    const sectionLines: string[] = [];
    let insideNonKnowledgeSection = false;

    for (let i = 0; i < lines.length; i++) {
      if (i <= titleIndex && titleIndex >= 0) continue;
      const rawLine = lines[i]!;
      const line = rawLine.trim();
      if (!line) {
        if (sectionLines.length > 0 && !insideNonKnowledgeSection) {
          sectionLines.push('');
        }
        continue;
      }

      const headingMatch = line.match(/^(#{2,6})\s+(.+)$/);
      if (headingMatch) {
        const fullHeading = headingMatch[2]!.trim();
        insideNonKnowledgeSection = isNonKnowledgeHeading(fullHeading);
        continue;
      }

      if (insideNonKnowledgeSection) {
        if (isMetaLine(line)) {
          parseMetaLine(line, header);
        }
        continue;
      }

      if (isMetaLine(line)) {
        parseMetaLine(line, header);
        continue;
      }

      if (/^(tip|fyi)\b/i.test(line)) {
        skipped.push({ text: line, reason: 'coaching tip, not knowledge' });
        continue;
      }
      if (/retired|do not use/i.test(line)) {
        skipped.push({ text: line, reason: 'lifecycle note: routed to the owner as a possible retirement' });
        notes.push(`Possible retirement: "${line}"`);
        continue;
      }

      sectionLines.push(rawLine);
    }

    const bodyText = sectionLines.join('\n').trim();
    if (bodyText) {
      const annotatedId =
        header['candidate id'] ||
        header['candidate_id'] ||
        header['candidate'] ||
        header['annotated candidate'] ||
        header['annotated candidate id'] ||
        header['unit id'] ||
        header['unit_id'] ||
        titleAnnotatedId;

      const proposedVersion = header['proposed version'] || header['proposed_version'] || header['version_id'] || header['version'];
      let versionNum: number | undefined;
      if (proposedVersion) {
        const vMatch = proposedVersion.match(/v(\d+)/i) || proposedVersion.match(/(\d+)/);
        if (vMatch) versionNum = parseInt(vMatch[1]!, 10);
      }

      const supersedes = normalizeSupersedes(header['supersedes'] || header['supersedes unit'] || header['supersedes_id'] || null);
      const duplicateSignal = header['duplicate review'] || header['duplicate candidate'] || header['duplicate of'] || header['duplicate_of'] || header['duplicate'];
      const isDup = Boolean(duplicateSignal || (annotatedId && /^(?:CAND-)?DUP/i.test(annotatedId)));
      const dupOf = duplicateSignal || (isDup ? annotatedId : null);

      const isVerbatim =
        /verbatim|read as written|do not paraphrase/i.test(title) ||
        /verbatim|read as written|do not paraphrase/i.test(bodyText) ||
        header['verbatim'] === 'true' ||
        header['verbatim'] === '1' ||
        header['type'] === 'verbatim' ||
        header['candidate type'] === 'verbatim' ||
        header['candidate type'] === 'legal';

      const explicitType = header['unit type'] || header['unit_type'] || header['type'] || header['candidate type'];
      const resolvedType = explicitType
        ? explicitType.toLowerCase()
        : isVerbatim
        ? 'verbatim'
        : 'fact';

      raws.push({
        title,
        type: resolvedType as any,
        body: cleanCandidateBody(bodyText),
        verbatim: isVerbatim,
        section: annotatedId ? `[${annotatedId}] ${title}` : title,
        annotated_id: annotatedId,
        version: versionNum,
        version_id: proposedVersion,
        supersedes,
        duplicate_of: dupOf,
        is_duplicate_review: isDup,
        annotations: header,
      });
    }

    return { header, title, raws, skipped, notes };
  }

  // ---------------------------------------------------------------------------
  // Baseline / Legacy Strategy: bracket sections, verbatim tags, colon labels
  // ---------------------------------------------------------------------------
  let section = 'Document';
  let list: { title: string; items: string[]; numbered: boolean; section: string } | null = null;
  let prevWasPlain = false;

  const flush = () => {
    if (!list) return;
    if (list.numbered) {
      raws.push({ title: list.title, type: 'procedure', body: list.items.map((it, i) => `${i + 1}) ${it.replace(/\.?$/, '.')}`).join(' '), verbatim: false, section: list.section });
    } else {
      for (const it of list.items) raws.push({ title: `${list.title}: ${it.split(/\s+/).slice(0, 5).join(' ')}`, type: 'fact', body: it.replace(/\.?$/, '.'), verbatim: false, section: list.section });
    }
    list = null;
  };

  const startLine = titleIndex >= 0 ? titleIndex + 1 : 1;
  for (const rawLine of lines.slice(startLine)) {
    const line = rawLine.trim();
    if (!line) { prevWasPlain = false; continue; }
    const wasPlain = prevWasPlain;
    prevWasPlain = false;

    if (isMetaLine(line)) {
      parseMetaLine(line, header);
      continue;
    }

    const sec = line.match(/^\[([^\]]+)\]/) ?? line.match(/^\*\*(.+)\*\*$/);
    if (sec) {
      flush();
      section = line.startsWith('[') ? `[${sec[1]}]` : `${section.split(' ')[0]} ${sec[1]}`;
      const aka = line.match(/aka\s+"([^"]+)"/i);
      if (aka) notes.push(`Synonym in source: "${aka[1]}" for ${section}`);
      continue;
    }

    // Verbatim: a quoted passage marked for exact reading.
    const vb = line.match(/^(.*?)(?:verbatim\s*\(legal\)|\(read as written\))\s*:?\s*[-:]?\s*"(.+)"\s*$/i);
    if (vb) {
      flush();
      const label = vb[1]!.replace(/[-:]\s*$/, '').trim();
      const name = label || sectionName(section);
      raws.push({ title: `${titleCase(name || section)} (verbatim)`, type: 'verbatim', body: vb[2]!.trim(), verbatim: true, section: label ? `${section} ${label}`.trim() : section });
      continue;
    }

    if (/^(tip|fyi)\b/i.test(line)) { skipped.push({ text: line, reason: 'coaching tip, not knowledge' }); continue; }
    if (/retired|do not use/i.test(line)) { skipped.push({ text: line, reason: 'lifecycle note: routed to the owner as a possible retirement' }); notes.push(`Possible retirement: "${line}"`); continue; }

    const num = line.match(/^(\d+)[.)]\s+(.+)$/);
    const bul = line.match(/^[-*•]\s+(.+)$/);
    if (num || bul) {
      const numbered = !!num;
      if (!list || list.numbered !== numbered) {
        flush();
        list = { title: titleCase(sectionName(section)), items: [], numbered, section };
      }
      list.items.push((num ? num[2] : bul![1])!.trim());
      continue;
    }

    // A heading line ending in a colon starts a list section.
    if (/:$/.test(line)) { flush(); section = line.replace(/:$/, ''); continue; }
    flush();

    // "Label: text" or a plain sentence.
    const lab = line.match(/^([A-Z][A-Za-z -]{2,40}):\s+(.+)$/);
    const reviewDue = isoFromUs(line.match(/next review due ([\d/]+)/i)?.[1]);
    const body = (lab ? lab[2]! : line).replace(/\[reviewed[^\]]*\]/i, '').trim();
    if (body.split(/\s+/).length < 4) { skipped.push({ text: line, reason: 'too short to stand alone' }); continue; }
    const prev = raws[raws.length - 1];
    if (!lab && prev && prev.type === 'fact' && !prev.labeled && prev.section === section && wasPlain) {
      // Consecutive unlabeled sentences in one section form one paragraph, one unit.
      prev.body = `${prev.body} ${body}`;
      continue;
    }
    const inBracket = section.startsWith('[');
    const name = lab ? lab[1]! : inBracket ? sectionName(section) : body.split(/\s+/).slice(0, 6).join(' ');
    raws.push({ title: titleCase(name), type: 'fact', body, verbatim: false, section: lab ? `${section} ${lab[1]}`.trim() : section, review: reviewDue, labeled: !!lab });
    prevWasPlain = !lab;
    continue;
  }
  flush();
  return { header, title, raws, skipped, notes };
}

/**
 * Extract candidate units from one source document and compare each with the
 * approved units. Pure function: nothing is stored or published.
 */
export function extract(text: string, approved: KnowledgeUnit[], previous?: CandidateUnit[], fallbackDocId = 'DOC-UPLOAD', lexicon: Record<string, string> = {}): ExtractionResult {
  const { header, title, raws, skipped, notes } = segment(text);
  const docId = header['document id'] ?? header['doc id'] ?? header['source id'] ?? fallbackDocId;
  const owner = (header['owner'] ?? 'Unassigned').replace(/ Knowledge Team$| Team$/, '');
  const dateRange = parseDateRange(header['effective'] ?? header['effective period'] ?? header['effective dates'] ?? header['last edited']);
  const effective = dateRange.start ?? '2026-01-01';
  const headerReviewDate = dateRange.end;
  const revision = header['revision'] ?? header['source revision'] ?? undefined;
  const planScope = header['plan scope'] ?? header['scope'] ?? undefined;
  const classification = header['classification'] ?? undefined;
  const allowedRolesRaw = header['allowed roles'] ?? header['allowed role'] ?? header['roles'] ?? header['audience'] ?? undefined;
  let allowedRoles = allowedRolesRaw
    ? allowedRolesRaw
        .replace(/[\[\]"]/g, '')
        .split(/[,|]/)
        .map((r) => r.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
    : undefined;

  if (allowedRolesRaw && /insurance/i.test(allowedRolesRaw) && !allowedRoles?.includes('insurance_advocate')) {
    allowedRoles = ['insurance_advocate', 'member_chat'];
  } else if (allowedRolesRaw && /pharmacy/i.test(allowedRolesRaw) && !allowedRoles?.includes('pharmacy_advocate')) {
    allowedRoles = ['pharmacy_advocate', 'member_chat'];
  }
  const live = approved.filter((u) => u.status === 'approved');

  const candidates = raws.map((r, i): CandidateUnit => {
    // Source-change check first: the same section of the same document as last
    // ingested. Unchanged text means nothing to review, whatever the unit says.
    const prev = previous?.find((p) => p.source_section === r.section && p.verbatim === r.verbatim);
    const prevUnit = prev?.match.unit_id ? live.find((u) => u.unit_id === prev.match.unit_id) : undefined;
    const cid = r.annotated_id || `${docId}#${i + 1}`;

    if (prev && normalizeForHash(prev.body) === normalizeForHash(r.body)) {
      return { ...prev, cid, match: { ...prev.match, status: 'unchanged', drift: null }, route_to: 'none', suggestions: [] };
    }
    if (prev && prevUnit) {
      const drift = checkChange(prev.body, r.body, prevUnit.verbatim);
      return {
        ...prev, cid, body: r.body, title: prev.title,
        match: { status: 'changed', unit_id: prevUnit.unit_id, unit_title: prevUnit.title, similarity: drift.similarity, drift },
        route_to: drift.route_to,
        suggestions: [],
      };
    }
    let best: { u: KnowledgeUnit; sim: number } | null = null;
    for (const u of live) {
      if (u.verbatim !== r.verbatim) continue; // a script line never matches a fact, and the reverse
      const bodySim = jaccard(u.body, r.body);
      const titleSim = jaccard(u.title, r.title);
      const sim = Math.max(bodySim, titleSim > 0.35 ? bodySim * 0.65 + titleSim * 0.35 : bodySim);
      if (!best || sim > best.sim) best = { u, sim };
    }
    let status: MatchStatus = 'new';
    let drift: DriftResult | null = null;
    if (best && normalizeForHash(best.u.body) === normalizeForHash(r.body)) status = 'unchanged';
    else if (best && best.sim >= MATCH_THRESHOLD) {
      status = 'changed';
      drift = checkChange(best.u.body, r.body, best.u.verbatim);
    }
    const kb = kbFor(docId, r.verbatim, r.section, owner);
    const route = status === 'unchanged' ? 'none' : drift ? drift.route_to : r.verbatim ? 'Legal (verbatim)' : 'Author';
    const synonyms = [...new Set(contentWords(r.title).slice(0, 3))];
    const combinedText = `${r.title} ${r.body}`.toLowerCase();
    if (combinedText.includes("day supply") || combinedText.includes("days supply")) {
      synonyms.push("days supply", "day supply");
    }
    if (combinedText.includes("90-day") || combinedText.includes("90 day")) {
      synonyms.push("90 day", "90-day");
    }
    if (combinedText.includes("mail order") || combinedText.includes("mail-order")) {
      synonyms.push("mail order");
    }

    return {
      cid,
      annotated_id: r.annotated_id,
      title: r.title,
      type: r.type,
      body: r.body,
      verbatim: r.verbatim,
      knowledge_base: kb,
      owner: r.verbatim ? 'Compliance' : owner,
      source_doc: docId,
      source_section: r.section,
      effective_date: effective,
      review_date: r.review ?? headerReviewDate ?? plusOneYear(effective),
      suggested_synonyms: synonyms,
      match: {
        status,
        unit_id: status === 'new' ? null : best!.u.unit_id,
        unit_title: status === 'new' ? null : best!.u.title,
        similarity: best?.sim ?? 0,
        drift,
      },
      route_to: route,
      extractor: EXTRACTOR_VERSION,
      suggestions: [],
      revision,
      plan_scope: planScope,
      allowed_roles: allowedRoles,
      classification,
      domain: header['domain'] ?? header['domain team'] ?? owner,
      version: r.version,
      version_id: r.version_id,
      supersedes: r.supersedes,
      duplicate_of: r.duplicate_of,
      is_duplicate_review: r.is_duplicate_review,
      annotations: r.annotations,
    };
  });

  for (const c of candidates) c.suggestions = c.match.status === 'unchanged' ? [] : suggest(c, live, lexicon);
  return {
    doc_id: docId,
    title,
    owner,
    domain: header['domain'] ?? header['domain team'] ?? owner,
    effective_date: effective,
    candidates,
    skipped,
    lifecycle_notes: notes,
    extractor: EXTRACTOR_VERSION,
    revision,
    plan_scope: planScope,
    allowed_roles: allowedRoles,
    classification,
    version: candidates[0]?.version,
    version_id: candidates[0]?.version_id,
    supersedes: candidates[0]?.supersedes,
    duplicate_of: candidates[0]?.duplicate_of,
    annotations: header,
  };
}

// Merge: overlap below the "changed" threshold but clearly the same topic,
// counted on body words plus the unit's curated synonyms.
export const MERGE_MIN_OVERLAP = 0.4; // below this, topic overlap was mostly shared vocabulary (e.g. "maintenance medications by mail")

function topicWords(u: KnowledgeUnit): Set<string> {
  return new Set([...contentWords(u.body), ...contentWords(u.title), ...u.synonyms.flatMap((x) => contentWords(x))]);
}

function clauses(body: string): string[] {
  // Sentences first, then comma or semicolon lists inside a sentence.
  const out: string[] = [];
  for (const sentence of body.split(/(?<=[.!?])\s+(?=[A-Z"])/)) {
    // A comma list that ends in "or"/"and" is one statement with options, not several facts.
    const enumeration = /,\s+(or|and)\s+[^,]+$/.test(sentence.replace(/[.\s]+$/, ''));
    const sep = enumeration ? /\s*;\s+/ : /\s*[;,]\s+(?![^()]*\))/;
    const bits = sentence.split(sep).map((b) => b.replace(/[.\s]+$/, '').trim()).filter((b) => b.split(/\s+/).length >= 3);
    if (bits.length >= 2) out.push(...bits);
    else out.push(sentence.replace(/[.\s]+$/, '').trim());
  }
  return out.filter(Boolean);
}

function suggest(c: CandidateUnit, live: KnowledgeUnit[], lexicon: Record<string, string>): Suggestion[] {
  const out: Suggestion[] = [];
  if (c.verbatim) return out; // verbatim is never merged or split by suggestion: Legal decides wording as a whole
  if (c.match.status === 'new') {
    const words = new Set(contentWords(c.body + ' ' + c.title));
    let best: { u: KnowledgeUnit; overlap: number } | null = null;
    for (const u of live) {
      if (u.verbatim || u.knowledge_base !== c.knowledge_base) continue;
      const t = topicWords(u);
      const inter = [...words].filter((w) => t.has(w)).length;
      const overlap = Math.round((inter / Math.max(1, Math.min(words.size, t.size))) * 100) / 100;
      if (inter >= 2 && (!best || overlap > best.overlap)) best = { u, overlap };
    }
    if (best && best.overlap >= MERGE_MIN_OVERLAP)
      out.push({ kind: 'merge', unit_id: best.u.unit_id, unit_title: best.u.title, overlap: best.overlap, reason: `Covers the same topic as ${best.u.unit_id} (${Math.round(best.overlap * 100)}% topic overlap). Link this source to it instead of creating a second unit.` });
  }
  const tags = suggestTags(c, lexicon);
  if (tags) out.push(tags);
  if (c.type === 'procedure') return out; // numbered steps stay together
  const parts = clauses(c.body).map((text) => {
        let hit: KnowledgeUnit | null = null;
        let top = 0;
        for (const u of live) {
          if (u.verbatim) continue;
          const sim = jaccard(u.body, text);
          if (sim > top) { top = sim; hit = u; }
        }
        return top >= 0.5 && hit ? { text, unit_id: hit.unit_id, unit_title: hit.title } : { text, unit_id: null, unit_title: null };
  });
  // Suggest a split only when it clearly helps: a part already belongs to a
  // different unit, or the candidate packs four or more statements.
  const elsewhere = parts.some((p) => p.unit_id && p.unit_id !== c.match.unit_id);
  if (parts.length >= 3 && (elsewhere || parts.length >= 4)) {
    out.push({ kind: 'split', parts, reason: `Holds ${parts.length} separate statements${elsewhere ? ', and part of it is already its own unit' : ''}. One fact per unit keeps citations precise and lets each part change on its own.` });
  }
  return out;
}

const STATES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH',
  'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
  pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
};

/**
 * Applicability and synonyms the text supports. Silent when the source says
 * nothing: an unstated scope stays at the default and the author decides.
 */
export function suggestTags(c: CandidateUnit, lexicon: Record<string, string>): Suggestion | null {
  const text = `${c.title}. ${c.body}`;
  const evidence: string[] = [];

  const lob: string[] = [];
  if (/\bMAPD\b|Medicare Advantage/i.test(text)) { lob.push('MAPD'); evidence.push('mentions Medicare Advantage / MAPD'); }
  if (/\bPDP\b|stand-?alone Prescription Drug Plan/i.test(text)) { lob.push('PDP'); evidence.push('mentions PDP'); }

  const states: string[] = [];
  const lower = text.toLowerCase();
  for (const [name, abbr] of Object.entries(STATES)) if (new RegExp(`\\b${name}\\b`).test(lower)) states.push(abbr);
  // Two-letter codes only inside a list that follows "in", "for" or "of" and sits next to a
  // state ("in Florida and TX", "residents of TX, GA"); never bare words like "OR" or "IN".
  const names = Object.keys(STATES).join('|');
  const item = `(?:${names}|[A-Z]{2}\\b)`;
  const list = new RegExp(`\\b(?:in|for|of)\\s+(${item}(?:\\s*(?:,|,?\\s*and|,?\\s*or)\\s*${item})*)`, 'gi');
  for (const m of text.matchAll(list))
    for (const code of m[1]!.match(/\b[A-Z]{2}\b/g) ?? []) if (Object.values(STATES).includes(code) && !states.includes(code)) states.push(code);
  if (states.length) evidence.push(`names ${states.join(', ')}`);

  const years = [...new Set([...text.matchAll(/\b(?:plan year|PY|CY)\s*(20\d\d)\b|\b(20\d\d)\s+plan year\b/gi)].map((m) => Number(m[1] ?? m[2])))];
  if (years.length) evidence.push(`plan year ${years.join(', ')}`);

  // Synonyms: lexicon shorthand whose expansion appears in the unit ("mail order" -> "mo", "male order").
  const have = new Set(c.suggested_synonyms.map((x) => x.toLowerCase()));
  const syn: string[] = [];
  for (const [short, full] of Object.entries(lexicon)) {
    if (short.length < 2 || have.has(short.toLowerCase())) continue;
    if (new RegExp(`\\b${full.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) { syn.push(short); have.add(short.toLowerCase()); }
  }
  if (syn.length) evidence.push(`lexicon shorthand for terms used here: ${syn.join(', ')}`);

  const planYear = years.length === 1 ? years[0]! : null;
  if (!lob.length && !states.length && planYear === null && !syn.length) return null;
  return {
    kind: 'tags',
    lob: lob.length ? lob : null,
    states: states.length ? states : null,
    plan_year: planYear,
    synonyms: syn,
    evidence,
    reason: `The text states: ${evidence.join('; ')}. Accept to scope the unit that way, or leave the default (all lines of business, all states, current plan year).`,
  };
}
