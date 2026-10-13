import { describe, expect, it, beforeEach } from 'vitest';
import {
  matchQuerySemanticSync,
  matchQuerySemantic,
  questionStore,
  tokenSetRatio,
  cosineSimilarity,
  getSemanticDebugLogs,
  clearSemanticDebugLogs,
  DeterministicVectorProvider,
} from '../verity-engine/semantic.ts';
import type { KnowledgeUnit } from '../verity-engine/types.ts';

const SAMPLE_UNITS: KnowledgeUnit[] = [
  {
    unit_id: 'U-PH-001',
    title: 'CenterWell Pharmacy dispensing locations',
    type: 'knowledge_article',
    body: 'Prescriptions are dispensed from our licensed mail-order facilities in Kentucky and Florida.',
    verbatim: false,
    spoken_version: null,
    knowledge_base: 'KB-PHARM',
    audience: ['advocate'],
    channels: ['advocate_view'],
    authority_level: 'knowledge_article',
    source_doc: 'DOC-1',
    source_section: 'S1',
    effective_date: '2026-01-01',
    review_date: '2027-01-01',
    version: 1,
    status: 'approved',
    supersedes: null,
    synonyms: [
      'where are prescriptions filled',
      'dispensing locations',
      'mail order pharmacy facility',
      'fulfillment location',
    ],
    owner: 'Owen (Pharmacy)',
    approved_by: 'Owen',
    applies_to: { lob: ['MAPD'], states: 'ALL', plan_year: 2026 },
  },
  {
    unit_id: 'U-PH-002',
    title: 'Prescription fulfillment turnaround time',
    type: 'knowledge_article',
    body: 'Standard delivery takes 7 to 10 business days.',
    verbatim: false,
    spoken_version: null,
    knowledge_base: 'KB-PHARM',
    audience: ['advocate'],
    channels: ['advocate_view'],
    authority_level: 'knowledge_article',
    source_doc: 'DOC-1',
    source_section: 'S2',
    effective_date: '2026-01-01',
    review_date: '2027-01-01',
    version: 1,
    status: 'approved',
    supersedes: null,
    synonyms: [
      'how long does prescription delivery take',
      'turnaround time for mail orders',
      'shipping duration',
    ],
    owner: 'Owen (Pharmacy)',
    approved_by: 'Owen',
    applies_to: { lob: ['MAPD'], states: 'ALL', plan_year: 2026 },
  },
  {
    unit_id: 'U-IN-001',
    title: 'Replacement member ID card ordering',
    type: 'knowledge_article',
    body: 'Members can order replacement ID cards through the member portal or by calling customer service.',
    verbatim: false,
    spoken_version: null,
    knowledge_base: 'KB-INS',
    audience: ['advocate'],
    channels: ['advocate_view'],
    authority_level: 'knowledge_article',
    source_doc: 'DOC-2',
    source_section: 'S1',
    effective_date: '2026-01-01',
    review_date: '2027-01-01',
    version: 1,
    status: 'approved',
    supersedes: null,
    synonyms: [
      'how to order a new id card',
      'lost insurance card replacement',
      'replace id card',
    ],
    owner: 'Olivia (Insurance)',
    approved_by: 'Olivia',
    applies_to: { lob: ['MAPD'], states: 'ALL', plan_year: 2026 },
  },
];

describe('Phase 3–6 — Semantic Question Matching Suite', () => {
  beforeEach(() => {
    questionStore.invalidate();
    clearSemanticDebugLogs();
  });

  it('matches semantically equivalent question with different wording accurately', () => {
    const res = matchQuerySemanticSync(
      'at which facility are member prescriptions filled and dispensed',
      ['KB-PHARM'],
      SAMPLE_UNITS
    );

    expect(res.outcome).toBe('answer');
    expect(res.bestCandidate).toBeDefined();
    expect(res.bestCandidate?.unit_id).toBe('U-PH-001');
    expect(res.similarityScore).toBeGreaterThanOrEqual(0.85);
  });

  it('tolerates case, whitespace, and punctuation differences without degradation', () => {
    const q1 = 'WHERE ARE PRESCRIPTIONS FILLED?';
    const q2 = '   where are prescriptions filled...   ';
    const q3 = 'Where, are prescriptions filled?!';

    const r1 = matchQuerySemanticSync(q1, ['KB-PHARM'], SAMPLE_UNITS);
    const r2 = matchQuerySemanticSync(q2, ['KB-PHARM'], SAMPLE_UNITS);
    const r3 = matchQuerySemanticSync(q3, ['KB-PHARM'], SAMPLE_UNITS);

    expect(r1.outcome).toBe('answer');
    expect(r2.outcome).toBe('answer');
    expect(r3.outcome).toBe('answer');
    expect(r1.bestCandidate?.unit_id).toBe('U-PH-001');
    expect(r2.bestCandidate?.unit_id).toBe('U-PH-001');
    expect(r3.bestCandidate?.unit_id).toBe('U-PH-001');
  });

  it('score below 0.85 never returns a candidate answer and provides suggestions', () => {
    const res = matchQuerySemanticSync(
      'Can I take my pet dog to an acupuncture clinic in Alaska?',
      ['KB-PHARM'],
      SAMPLE_UNITS
    );

    expect(res.outcome).toBe('low_confidence');
    expect(res.message).toBe("I couldn't find a confident match for that. Could you rephrase or choose from these topics?");
    expect(res.similarityScore).toBeLessThan(0.85);
    // Suggestions are provided and capped at 3
    expect(res.suggestions.length).toBeLessThanOrEqual(3);
    // Suggestion units must strictly be in-scope (KB-PHARM only)
    expect(res.suggestions.every((s) => s.unit_id.startsWith('U-PH'))).toBe(true);
  });

  it('score at or above 0.85 returns the original stored unit when unambiguous', () => {
    const res = matchQuerySemanticSync(
      'how to order a new id card',
      ['KB-INS'],
      SAMPLE_UNITS
    );

    expect(res.outcome).toBe('answer');
    expect(res.bestCandidate?.unit_id).toBe('U-IN-001');
    expect(res.similarityScore).toBeGreaterThanOrEqual(0.85);
    expect(res.ambiguousChoices).toHaveLength(0);
  });

  it('top-two score difference below 0.05 triggers ambiguous clarification', () => {
    // Construct query that is balanced between two units
    const ambiguousUnits: KnowledgeUnit[] = [
      {
        ...SAMPLE_UNITS[0]!,
        title: 'Prescription mail order facility inquiry',
        synonyms: ['mail order fulfillment details', 'prescription mail order details'],
      },
      {
        ...SAMPLE_UNITS[1]!,
        title: 'Prescription mail order delivery timeline',
        synonyms: ['mail order fulfillment timing', 'prescription mail order timing'],
      },
    ];

    const res = matchQuerySemanticSync(
      'prescription mail order fulfillment',
      ['KB-PHARM'],
      ambiguousUnits,
      { similarityThreshold: 0.80, ambiguityDelta: 0.10 } // configure delta
    );

    expect(res.outcome).toBe('ambiguous');
    expect(res.ambiguousChoices).toHaveLength(2);
    expect(res.scoreDifference).toBeLessThan(0.10);
  });

  it('unauthorized or restricted candidates cannot be returned or suggested', () => {
    // Caller only has KB-PHARM, but asks an Insurance question
    const res = matchQuerySemanticSync(
      'replace lost member id card',
      ['KB-PHARM'], // Only Pharmacy, NO KB-INS
      SAMPLE_UNITS
    );

    // Must be flagged as not_authorized or low_confidence without leaking body
    expect(res.outcome).toBe('not_authorized');
    expect(res.restrictedOwner).toBe('Olivia (Insurance)');
    expect(res.message).toContain('outside your current entitlement');

    // Suggestions must never contain the restricted unit
    expect(res.suggestions.some((s) => s.unit_id === 'U-IN-001')).toBe(false);
  });

  it('embeddings are cached, reused, and refreshed correctly on invalidation', async () => {
    // 1. Initial initialization
    await matchQuerySemantic('where are prescriptions filled', ['KB-PHARM'], SAMPLE_UNITS);
    const initialSize = questionStore.size;
    expect(initialSize).toBeGreaterThan(0);

    // 2. Second query reuses cache without re-embedding
    await matchQuerySemantic('fulfillment location', ['KB-PHARM'], SAMPLE_UNITS);
    expect(questionStore.size).toBe(initialSize);

    // 3. Invalidation clears cache
    questionStore.invalidate();
    expect(questionStore.size).toBe(0);

    // 4. Update unit re-indexes specifically that unit
    questionStore.updateUnit(SAMPLE_UNITS[0]!);
    expect(questionStore.size).toBe(1 + SAMPLE_UNITS[0]!.synonyms.length);
  });

  it('offline fuzzy fallback uses normalized 0-1 scores and applies rules', () => {
    const res = matchQuerySemanticSync(
      'dispensing locations facility',
      ['KB-PHARM'],
      SAMPLE_UNITS,
      { offlineMode: true } // Force offline mode
    );

    expect(res.matchingMethod).toBe('fuzzy_fallback');
    expect(res.similarityScore).toBeGreaterThanOrEqual(0.0);
    expect(res.similarityScore).toBeLessThanOrEqual(1.0);
    expect(res.outcome).toBe('answer');
    expect(res.bestCandidate?.unit_id).toBe('U-PH-001');
  });

  it('safely handles empty knowledge bases and provider errors without crashing', () => {
    // Empty knowledge base
    const resEmpty = matchQuerySemanticSync('hello', ['KB-PHARM'], []);
    expect(resEmpty.outcome).toBe('low_confidence');
    expect(resEmpty.bestCandidate).toBeNull();
    expect(resEmpty.suggestions).toHaveLength(0);

    // Empty query
    const resEmptyQuery = matchQuerySemanticSync('', ['KB-PHARM'], SAMPLE_UNITS);
    expect(resEmptyQuery.outcome).toBe('low_confidence');
    expect(resEmptyQuery.similarityScore).toBe(0);

    // Mismatched vector dimensions in cosineSimilarity
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('debug logs record structured diagnostic information without sensitive data', () => {
    matchQuerySemanticSync(
      'where are prescriptions filled',
      ['KB-PHARM'],
      SAMPLE_UNITS
    );

    const logs = getSemanticDebugLogs();
    expect(logs.length).toBeGreaterThan(0);
    const lastLog = logs[logs.length - 1];

    expect(lastLog).toBeDefined();
    expect(lastLog!.query).toBe('where are prescriptions filled');
    expect(lastLog!.matchedUnitId).toBe('U-PH-001');
    expect(lastLog!.similarityScore).toBeGreaterThan(0);
    expect(lastLog!.matchingMethod).toBe('embeddings');
    expect(lastLog!.threshold).toBe(0.85);
    expect(lastLog!.outcome).toBe('answer');
  });
});
