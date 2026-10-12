import { describe, expect, it, beforeEach } from 'vitest';
import {
  matchQuerySemanticSync,
  questionStore,
  clearSemanticDebugLogs,
  getSemanticDebugLogs,
  DeterministicVectorProvider,
  cosineSimilarity,
} from '../verity-engine/semantic.ts';
import type { KnowledgeUnit } from '../verity-engine/types.ts';
import unitsSeedData from '../verity-engine/data/units_seed.json';

// Seed units directly from the production knowledge base
const SEED_UNITS = (unitsSeedData as { units: KnowledgeUnit[] }).units.filter(
  (u) => u.status === 'approved'
);

interface EvalItem {
  id: string;
  category:
    | 'paraphrase_valid'
    | 'case_punctuation'
    | 'near_duplicate'
    | 'unrelated'
    | 'ambiguous'
    | 'cross_boundary_unauthorized';
  query: string;
  callerKbs: string[];
  expectedUnitId?: string;
  expectedOutcome: 'answer' | 'low_confidence' | 'ambiguous' | 'not_authorized';
  description: string;
}

const EVALUATION_SET: EvalItem[] = [
  // 1. Case & punctuation variants
  {
    id: 'CP-1',
    category: 'case_punctuation',
    query: '   WHAT IS THE RX PRICING DISCLAIMER???   ',
    callerKbs: ['KB-PHARM'],
    expectedUnitId: 'U-PH-003',
    expectedOutcome: 'answer',
    description: 'Uppercase with heavy punctuation and spacing on pricing disclaimer',
  },
  {
    id: 'CP-2',
    category: 'case_punctuation',
    query: 'recorded line notice at start of call.',
    callerKbs: ['KB-SHARED'],
    expectedUnitId: 'U-SH-001',
    expectedOutcome: 'answer',
    description: 'Lowercase with trailing punctuation on call opening',
  },

  // 2. Near-duplicate questions with different answers
  {
    id: 'ND-1',
    category: 'near_duplicate',
    query: 'how many business days for mail order prescriptions to arrive',
    callerKbs: ['KB-PHARM'],
    expectedUnitId: 'U-PH-006', // Delivery timeframe, NOT setup (U-PH-005) or benefits (U-PH-004)
    expectedOutcome: 'answer',
    description: 'Delivery duration question targeted specifically to delivery time',
  },
  {
    id: 'ND-2',
    category: 'near_duplicate',
    query: 'how do I enroll a patient in home delivery prescriptions',
    callerKbs: ['KB-PHARM'],
    expectedUnitId: 'U-PH-005', // Setup steps, NOT delivery timeframe (U-PH-006)
    expectedOutcome: 'answer',
    description: 'Enrollment/setup question targeted specifically to mail order setup',
  },
  {
    id: 'ND-3',
    category: 'near_duplicate',
    query: 'why choose home delivery instead of picking up at retail pharmacy',
    callerKbs: ['KB-PHARM'],
    expectedUnitId: 'U-PH-004', // Benefits, NOT setup or timeframe
    expectedOutcome: 'answer',
    description: 'Benefits comparison question targeted to mail order benefits',
  },

  // 3. Valid independently-written paraphrases (different wording)
  {
    id: 'PA-1',
    category: 'paraphrase_valid',
    query: 'when can a caller expect their prescription package delivered',
    callerKbs: ['KB-PHARM'],
    expectedUnitId: 'U-PH-006',
    expectedOutcome: 'answer',
    description: 'Delivery timeframe paraphrase with different syntax',
  },
  {
    id: 'PA-2',
    category: 'paraphrase_valid',
    query: 'what statement must be read to inform the caller about audio recording',
    callerKbs: ['KB-SHARED'],
    expectedUnitId: 'U-SH-001',
    expectedOutcome: 'answer',
    description: 'Recorded line opening paraphrase with formal syntax',
  },
  {
    id: 'PA-3',
    category: 'paraphrase_valid',
    query: 'what is the estimated cost warning that must be given to patients',
    callerKbs: ['KB-PHARM'],
    expectedUnitId: 'U-PH-003',
    expectedOutcome: 'answer',
    description: 'Pricing disclaimer paraphrase using "warning" and "estimated cost"',
  },
  {
    id: 'PA-4',
    category: 'paraphrase_valid',
    query: 'how do I authenticate a member before disclosing medication records',
    callerKbs: ['KB-PHARM'],
    expectedUnitId: 'U-PH-002',
    expectedOutcome: 'answer',
    description: 'ID&V authentication paraphrase using "authenticate" and "disclosing"',
  },
  {
    id: 'PA-5',
    category: 'paraphrase_valid',
    query: 'what are the advantages of receiving a three month supply by post',
    callerKbs: ['KB-PHARM'],
    expectedUnitId: 'U-PH-004',
    expectedOutcome: 'answer',
    description: 'Mail order benefits paraphrase using "advantages" and "by post"',
  },

  // 4. Completely unrelated / out-of-domain queries
  {
    id: 'UR-1',
    category: 'unrelated',
    query: 'how to bake sourdough bread in a dutch oven',
    callerKbs: ['KB-PHARM', 'KB-SHARED', 'KB-INS'],
    expectedOutcome: 'low_confidence',
    description: 'Completely unrelated culinary recipe query',
  },
  {
    id: 'UR-2',
    category: 'unrelated',
    query: 'what is the capital city of Australia and its population',
    callerKbs: ['KB-PHARM', 'KB-SHARED', 'KB-INS'],
    expectedOutcome: 'low_confidence',
    description: 'Unrelated geography question',
  },
  {
    id: 'UR-3',
    category: 'unrelated',
    query: 'fix check engine light code P0420 on Honda Civic',
    callerKbs: ['KB-PHARM', 'KB-SHARED', 'KB-INS'],
    expectedOutcome: 'low_confidence',
    description: 'Unrelated automotive mechanics query',
  },

  // 5. Ambiguous queries
  {
    id: 'AM-1',
    category: 'ambiguous',
    query: 'mail order pharmacy details',
    callerKbs: ['KB-PHARM'],
    expectedOutcome: 'ambiguous',
    description: 'Overly broad query equally close to mail order benefits and mail order setup',
  },

  // 6. Cross-boundary unauthorized queries
  {
    id: 'CB-1',
    category: 'cross_boundary_unauthorized',
    query: 'how to replace member id card',
    callerKbs: ['KB-PHARM'], // Only Pharmacy, does NOT have Insurance
    expectedUnitId: 'U-IN-001',
    expectedOutcome: 'not_authorized',
    description: 'Insurance ID card query submitted by Pharmacy-only caller',
  },
];

describe('Comprehensive Semantic Matching Evaluation Suite', () => {
  beforeEach(() => {
    questionStore.invalidate();
    clearSemanticDebugLogs();
  });

  it('runs the full evaluation benchmark and records precise metrics', () => {
    console.log(`\n============================================================`);
    console.log(`SEMANTIC MATCHING EVALUATION BENCHMARK`);
    console.log(`Evaluated on ${SEED_UNITS.length} approved production seed units`);
    console.log(`Test set size: ${EVALUATION_SET.length} items`);
    console.log(`============================================================\n`);

    let testedCount = 0;
    let correctMatchesAbove85 = 0;
    let incorrectMatchesAbove85 = 0;
    let rejectedValidParaphrases = 0;
    let ambiguityDecisions = 0;
    let unauthorizedBlockedCount = 0;
    let unrelatedSafelyRejected = 0;

    const resultsLog: Array<{
      id: string;
      category: string;
      query: string;
      expectedOutcome: string;
      actualOutcome: string;
      score: number;
      bestUnit: string | null;
      pass: boolean;
      notes: string;
    }> = [];

    for (const item of EVALUATION_SET) {
      testedCount++;
      const res = matchQuerySemanticSync(item.query, item.callerKbs, SEED_UNITS);
      if (item.id === 'CB-1') {
        const p = new DeterministicVectorProvider();
        const v1 = p.embedOne('how to get a replacement member id card');
        const v2 = p.embedOne('Replacement member ID card');
        const v3 = p.embedOne('replace id card');
        console.log("SIM v1 vs v2 ('Replacement member ID card'):", cosineSimilarity(v1, v2));
        console.log("SIM v1 vs v3 ('replace id card'):", cosineSimilarity(v1, v3));
      }

      const passOutcome = res.outcome === item.expectedOutcome;
      const passUnit = item.expectedUnitId ? res.bestCandidate?.unit_id === item.expectedUnitId : true;
      const isOverallPass = passOutcome && (res.outcome !== 'answer' || passUnit);

      if (res.outcome === 'answer') {
        if (passUnit && res.similarityScore >= 0.85) {
          correctMatchesAbove85++;
        } else if (!passUnit) {
          incorrectMatchesAbove85++;
        }
      }

      if (item.category === 'paraphrase_valid' && res.outcome === 'low_confidence') {
        rejectedValidParaphrases++;
      }

      if (res.outcome === 'ambiguous') {
        ambiguityDecisions++;
      }

      if (item.category === 'cross_boundary_unauthorized' && res.outcome === 'not_authorized') {
        unauthorizedBlockedCount++;
      }

      if (item.category === 'unrelated' && res.outcome === 'low_confidence') {
        unrelatedSafelyRejected++;
      }

      resultsLog.push({
        id: item.id,
        category: item.category,
        query: item.query,
        expectedOutcome: item.expectedOutcome,
        actualOutcome: res.outcome,
        score: res.similarityScore,
        bestUnit: res.bestCandidate?.unit_id ?? null,
        pass: isOverallPass,
        notes: isOverallPass
          ? `MATCHED (${(res.similarityScore * 100).toFixed(1)}%)`
          : `MISMATCH: expected ${item.expectedOutcome} (${item.expectedUnitId ?? 'n/a'}), got ${res.outcome} (${res.bestCandidate?.unit_id ?? 'n/a'}, ${(res.similarityScore * 100).toFixed(1)}%)`,
      });
    }

    console.table(
      resultsLog.map((r) => ({
        ID: r.id,
        Category: r.category,
        Query: r.query.length > 35 ? r.query.slice(0, 32) + '...' : r.query,
        Expected: r.expectedOutcome,
        Actual: r.actualOutcome,
        Score: `${(r.score * 100).toFixed(1)}%`,
        BestUnit: r.bestUnit ?? '-',
        Status: r.pass ? 'PASS' : 'FAIL',
      }))
    );

    console.log(`\n--- BENCHMARK SUMMARY STATS ---`);
    console.log(`Total Tested:                      ${testedCount}`);
    console.log(`Correct Matches (>= 0.85):          ${correctMatchesAbove85}`);
    console.log(`Incorrect Matches (>= 0.85):        ${incorrectMatchesAbove85}`);
    console.log(`Rejected Valid Paraphrases:        ${rejectedValidParaphrases}`);
    console.log(`Ambiguity Decisions Triggered:     ${ambiguityDecisions}`);
    console.log(`Unauthorized Blocked Properly:     ${unauthorizedBlockedCount}`);
    console.log(`Unrelated Queries Safely Rejected: ${unrelatedSafelyRejected}`);
    console.log(`--------------------------------\n`);

    // Basic invariants that must hold
    expect(incorrectMatchesAbove85).toBe(0); // Zero hallucinated or false-positive answers >= 0.85
    expect(unrelatedSafelyRejected).toBe(3); // All 3 unrelated queries safely rejected
    expect(unauthorizedBlockedCount).toBe(1); // Cross boundary question blocked
  });
});
