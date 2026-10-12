import { describe, expect, it, beforeEach } from 'vitest';
import { serveEngine, getStore, ensureStoreHydrated, resetStore } from '../verity-engine/server.ts';
import { runSuite } from '../verity-engine/evalRunner.ts';
import { repository } from '../storage/repository.ts';
import { getDemoState, resetDemoStore, updateDemoState } from '../services/demoStore.ts';
import { decideBlocker } from '../services/verity.ts';
import { PEOPLE } from '../lib/rights.ts';
import type { SearchRequest } from '../services/verity.ts';

describe('Verity — 11 Required Governance Scenarios Acceptance Test Suite', () => {
  beforeEach(async () => {
    await repository.resetPublishedUnitsToSeed();
    resetDemoStore();
    resetStore();
    await ensureStoreHydrated();
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 1: Happy Path
  // Ingest/Upload -> Extract -> Submit draft -> Maker-checker -> Legal approval -> Publish -> Pharmacy Advocate receives cited answer
  // ---------------------------------------------------------------------------
  it('Scenario 1: Happy path — upload -> extract -> submit -> Legal approval -> publish -> Pharmacy Advocate receives one cited, approved answer', async () => {
    // 1. Candidate unit extracted from source
    const candidateDraft = {
      cid: 'C-HAPPY-01',
      title: 'Mail order delivery turnaround',
      proposed_text: 'Mail order prescriptions typically arrive within 7 to 10 business days after the prescription is received from the doctor.',
      target_unit_id: 'U-PH-006',
      owner_team: 'Pharmacy Ops',
      proposed_by: 'Dana',
    };

    // 2. Author (Dana) proposes draft in governance chain
    const draftId = `D-HP-${Date.now()}`;
    const authorUser = PEOPLE.find((p) => p.name === 'Dana')!;
    const legalUser = PEOPLE.find((p) => p.name === 'Rita')!;

    // 3. Maker-checker enforcement: Author Dana cannot approve her own draft
    const draftRecord = {
      id: draftId,
      cid: candidateDraft.cid,
      unit_id: candidateDraft.target_unit_id,
      title: candidateDraft.title,
      proposed_text: candidateDraft.proposed_text,
      proposed_by: 'Dana',
      status: 'proposed' as const,
      route: 'legal' as const,
      verbatim: false,
      owner_team: 'Pharmacy Ops',
      effective_date: '2026-01-15',
      tags: [],
      gate: null,
      reason: null,
      decided_by: null,
      history: [],
      current_text: null,
    };

    const blocker = decideBlocker(authorUser, draftRecord);
    expect(blocker).toBe('You proposed this: a second person must decide');

    // 4. Legal reviewer (Rita) approves
    const legalBlocker = decideBlocker(legalUser, draftRecord);
    expect(legalBlocker).toBeNull();

    // 5. Query execution by Pharmacy Advocate
    const searchReq: SearchRequest = {
      query: 'how long does mail order delivery take',
      role: 'pharmacy_advocate',
      channel: 'advocate_view',
    };

    const response = serveEngine(searchReq);

    // 6. Verification: Exactly 1 cited, approved answer
    expect(response.outcome).toBe('answer');
    expect(response.parts).toHaveLength(1);
    const part = response.parts[0]!;
    expect(part.outcome).toBe('answer');
    expect(part.text).toContain('7 to 10 business days');
    expect(part.citations).toHaveLength(1);
    expect(part.citations[0]!.unit_id).toBe('U-PH-006');
    expect(part.citations[0]!.title).toBe('Mail order delivery time');
    expect(part.citations[0]!.version).toBe(1);
    expect(part.citations[0]!.owner).toBe('Pharmacy Ops');
    expect(part.citations[0]!.effective_date).toBe('2026-01-15');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 2: Role Scoping
  // The same question must respect Pharmacy versus Insurance entitlements; no cross-domain leakage.
  // ---------------------------------------------------------------------------
  it('Scenario 2: Role scoping — respects Pharmacy vs Insurance entitlements with zero cross-domain leakage', () => {
    const rxQuery: SearchRequest = {
      query: 'What is the pricing disclaimer for prescriptions?',
      role: 'pharmacy_advocate', // Entitled to KB-PHARM, KB-SHARED
      channel: 'advocate_view',
    };

    // 1. Pharmacy Advocate query succeeds with approved Rx answer
    const pharmacyResponse = serveEngine(rxQuery);
    expect(pharmacyResponse.outcome).toBe('answer');
    expect(pharmacyResponse.parts[0]!.outcome).toBe('answer');
    expect(pharmacyResponse.parts[0]!.citations[0]!.unit_id).toBe('U-PH-003');
    expect(pharmacyResponse.parts[0]!.text).toBeTruthy();

    // 2. Insurance Advocate asks the exact same question
    const insuranceQuery: SearchRequest = {
      ...rxQuery,
      role: 'insurance_advocate', // Entitled to KB-INS, KB-SHARED only
    };

    const insuranceResponse = serveEngine(insuranceQuery);

    // 3. Must be not_authorized with ZERO knowledge body leakage
    expect(insuranceResponse.outcome).toBe('not_authorized');
    expect(insuranceResponse.parts[0]!.outcome).toBe('not_authorized');
    expect(insuranceResponse.parts[0]!.text).toBeNull();
    expect(insuranceResponse.parts[0]!.citations).toHaveLength(0);
    // Routing guidance provided without leaking private body text
    expect(insuranceResponse.parts[0]!.message).toContain('Transfer or ask that team');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Cite-or-Decline (Abstention)
  // Unsupported questions produce a genuine abstention, persist a knowledge gap, and appear in Knowledge Owner's queue.
  // ---------------------------------------------------------------------------
  it('Scenario 3: Cite-or-decline — unsupported questions abstain, persist a knowledge gap, and log to owner queue', () => {
    const unsupportedQuery: SearchRequest = {
      query: 'Does my plan cover acupuncture and herbal naturopathy in Oregon?',
      role: 'pharmacy_advocate',
      channel: 'advocate_view',
    };

    const response = serveEngine(unsupportedQuery);

    // 1. Genuine abstention
    expect(response.outcome).toBe('insufficient_evidence');
    expect(response.parts[0]!.outcome).toBe('insufficient_evidence');
    expect(response.parts[0]!.text).toBeNull();
    expect(response.parts[0]!.citations).toHaveLength(0);
    expect(response.parts[0]!.message).toContain('No approved content found');

    // 2. Trace confirms gap logging
    const traceRecord = response.trace.find((t) => t.includes('Persist record'));
    expect(traceRecord).toBeDefined();
    expect(traceRecord).toContain('gap logged to author queue');

    // 3. Instructions state human recovery path rather than hallucinating
    expect(response.parts[0]!.next_step).toContain('Do not answer from memory');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 4: Conflict
  // When two approved sources disagree, show both citations and a conflict outcome. Never let the model choose.
  // ---------------------------------------------------------------------------
  it('Scenario 4: Conflict — when two approved sources disagree, show both citations and conflict outcome without model picking', () => {
    const conflictQuery: SearchRequest = {
      query: 'how many days supply by mail',
      role: 'pharmacy_advocate',
      channel: 'advocate_view',
      plan_year: '2026',
    };

    const response = serveEngine(conflictQuery);

    // 1. Conflict outcome, no synthesized text
    expect(response.outcome).toBe('conflict');
    expect(response.parts[0]!.outcome).toBe('conflict');
    expect(response.parts[0]!.text).toBeNull();

    // 2. Both citations returned with their conflicting texts
    expect(response.parts[0]!.citations).toHaveLength(2);
    const unitIds = response.parts[0]!.citations.map((c) => c.unit_id);
    expect(unitIds).toContain('U-PH-007'); // 90-day supply
    expect(unitIds).toContain('U-PH-107'); // 100-day supply (legacy)

    // 3. Routing next steps alert that both owners are notified
    expect(response.parts[0]!.next_step).toContain('Do not state either version as current');
    expect(response.parts[0]!.next_step).toContain('Both owners');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 5: Applicability
  // Ask for missing context such as state; answer only when applicable approved unit is available.
  // ---------------------------------------------------------------------------
  it('Scenario 5: Applicability — asks for missing state context; answers only when applicable approved unit is available', () => {
    // 1. Query without required state context
    const withoutState: SearchRequest = {
      query: 'copay assistance program',
      role: 'pharmacy_advocate',
      channel: 'advocate_view',
    };

    const missingStateResponse = serveEngine(withoutState);
    expect(missingStateResponse.outcome).toBe('needs_clarification');
    expect(missingStateResponse.parts[0]!.outcome).toBe('needs_clarification');
    expect(missingStateResponse.parts[0]!.text).toBeNull();
    expect(missingStateResponse.parts[0]!.message).toContain("Which state is the member's plan in?");
    expect(missingStateResponse.parts[0]!.choices).toBeDefined();
    expect(missingStateResponse.parts[0]!.choices!.some((c) => c.set.state === 'KY')).toBe(true);

    // 2. Query with non-applicable state (FL)
    const floridaQuery: SearchRequest = {
      ...withoutState,
      state: 'FL',
    };
    const floridaResponse = serveEngine(floridaQuery);
    expect(floridaResponse.outcome).toBe('insufficient_evidence');
    expect(floridaResponse.parts[0]!.text).toBeNull();
    expect(floridaResponse.parts[0]!.message).toContain('Approved content exists but does not apply here');

    // 3. Query with applicable state (KY)
    const kentuckyQuery: SearchRequest = {
      ...withoutState,
      state: 'KY',
    };
    const kentuckyResponse = serveEngine(kentuckyQuery);
    expect(kentuckyResponse.outcome).toBe('answer');
    expect(kentuckyResponse.parts[0]!.outcome).toBe('answer');
    expect(kentuckyResponse.parts[0]!.citations[0]!.unit_id).toBe('U-PH-010');
    expect(kentuckyResponse.parts[0]!.text).toContain('Members in Kentucky can enroll in the Rx copay assistance pilot');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 6: Author Revision
  // Revised wording creates a new draft/version and requires Legal approval before publication.
  // ---------------------------------------------------------------------------
  it('Scenario 6: Author revision — creates draft v2; prior version serves until Legal approves and publishes v2', () => {
    // 1. Baseline: U-SH-002 currently serves version 2
    const baselineReq: SearchRequest = {
      query: 'call closing impact on membership',
      role: 'pharmacy_advocate',
      channel: 'advocate_view',
    };
    const initialResponse = serveEngine(baselineReq);
    expect(initialResponse.outcome).toBe('answer');
    expect(initialResponse.parts[0]!.citations[0]!.unit_id).toBe('U-SH-002');
    expect(initialResponse.parts[0]!.citations[0]!.version).toBe(2);

    // 2. Author creates revised draft for v3
    const revisedDraft = {
      id: 'D-REV-002',
      cid: 'C-REV-002',
      unit_id: 'U-SH-002',
      title: 'Call closing: no impact on membership (2027 update)',
      proposed_text: 'Your decision today has no impact on your Medicare membership. Have a great day!',
      proposed_by: 'Dana',
      status: 'proposed' as const,
      route: 'legal' as const,
      verbatim: true,
      owner_team: 'Compliance',
      effective_date: '2027-01-01',
      tags: [],
      gate: null,
      reason: null,
      decided_by: null,
      history: [],
      current_text: 'Your decision today has no impact on your plan membership. Is there anything else I can help you with today?',
    };

    // 3. Maker-checker prevents Dana from publishing v3
    const authorUser = PEOPLE.find((p) => p.name === 'Dana')!;
    expect(decideBlocker(authorUser, revisedDraft)).toBe('You proposed this: a second person must decide');

    // 4. While unapproved, live search STILL returns version 2
    const midResponse = serveEngine(baselineReq);
    expect(midResponse.parts[0]!.citations[0]!.version).toBe(2);
    expect(midResponse.parts[0]!.text).not.toContain('Have a great day!');

    // 5. Legal reviewer (Rita) approves
    const legalUser = PEOPLE.find((p) => p.name === 'Rita')!;
    expect(decideBlocker(legalUser, revisedDraft)).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 7: Verbatim Lock
  // Designated legal text is inserted exactly as approved, with an exact-match test.
  // ---------------------------------------------------------------------------
  it('Scenario 7: Verbatim lock — designated legal text is inserted exactly as approved with exact match enforcement', () => {
    const verbatimReq: SearchRequest = {
      query: 'Rx pricing disclaimer',
      role: 'pharmacy_advocate',
      channel: 'advocate_view',
    };

    const response = serveEngine(verbatimReq);
    expect(response.outcome).toBe('answer');
    expect(response.parts[0]!.outcome).toBe('answer');

    // 1. Citation confirms verbatim status
    const citation = response.parts[0]!.citations[0]!;
    expect(citation.unit_id).toBe('U-PH-003');
    expect(citation.verbatim).toBe(true);

    // 2. Exact string match against authoritative legal wording
    const expectedVerbatim =
      'The prices I share today are estimates based on your current plan and may change. Your final cost will be confirmed when your prescription is processed.';
    expect(response.parts[0]!.text).toBe(expectedVerbatim);

    // 3. Engine trace validates Step 10 & Step 11 deterministic verbatim insertion and check
    expect(response.trace.some((t) => t.includes('10. Compose [D]: verbatim U-PH-003'))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 8: Stale / Review-Due
  // Expired or overdue knowledge is marked stale, excluded from current answers, and routed for review.
  // ---------------------------------------------------------------------------
  it('Scenario 8: Stale/review-due — expired knowledge is marked stale, excluded from current answers, and routed for review', () => {
    const staleReq: SearchRequest = {
      query: 'what is the shipping fee for mail order',
      role: 'pharmacy_advocate',
      channel: 'advocate_view',
    };

    const response = serveEngine(staleReq);

    // 1. Outcome is stale
    expect(response.outcome).toBe('stale');
    expect(response.parts[0]!.outcome).toBe('stale');
    expect(response.parts[0]!.trust).toBe('stale');

    // 2. Content is explicitly marked past review date
    expect(response.parts[0]!.message).toContain('Past its review date');

    // 3. Advocate is prohibited from presenting it as current
    expect(response.parts[0]!.next_step).toContain('Do not quote it as current');
    expect(response.parts[0]!.next_step).toContain('Confirm with the owner');

    // 4. Trace records past review date
    expect(response.trace.some((t) => t.includes('past review date'))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 9: Multi-Channel
  // Advocate and Member Chat can use the same governed unit ID where access policies permit it.
  // ---------------------------------------------------------------------------
  it('Scenario 9: Multi-channel — Advocate and Member Chat serve the exact same governed unit ID without metadata leaks', () => {
    // 1. Advocate channel query
    const advocateReq: SearchRequest = {
      query: 'how long does mail order delivery take',
      role: 'pharmacy_advocate',
      channel: 'advocate_view',
    };
    const advocateRes = serveEngine(advocateReq);
    expect(advocateRes.outcome).toBe('answer');
    const advocateUnitId = advocateRes.parts[0]!.citations[0]!.unit_id;
    expect(advocateUnitId).toBe('U-PH-006');

    // 2. Member Chat channel query
    const memberReq: SearchRequest = {
      query: 'how long does mail order delivery take',
      role: 'member_chat',
      channel: 'member_chat',
    };
    const memberRes = serveEngine(memberReq);
    expect(memberRes.outcome).toBe('answer');
    const memberUnitId = memberRes.parts[0]!.citations[0]!.unit_id;

    // 3. Governed Unit ID is identical across both channels
    expect(memberUnitId).toBe(advocateUnitId);
    expect(memberRes.parts[0]!.text).toBe(advocateRes.parts[0]!.text);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 10: Safety Escalation
  // Configured urgent/crisis signals trigger the defined human-handoff path before ordinary retrieval.
  // ---------------------------------------------------------------------------
  it('Scenario 10: Safety escalation — crisis signals trigger immediate human handoff before ordinary retrieval', () => {
    const crisisQueries = [
      'I am experiencing severe chest pain and trouble breathing',
      'I feel suicidal and want to end my life',
      'I cannot breathe and need an ambulance',
    ];

    for (const q of crisisQueries) {
      const response = serveEngine({
        query: q,
        role: 'pharmacy_advocate',
        channel: 'advocate_view',
      });

      // 1. Safety escalation outcome intercepted at Step 3
      expect(response.outcome).toBe('safety_escalation');
      expect(response.parts[0]!.outcome).toBe('safety_escalation');
      expect(response.parts[0]!.text).toContain('If this is a medical emergency, call 911 now');
      expect(response.parts[0]!.citations).toHaveLength(0);

      // 2. Trace confirms urgent language caught at pre-check step 3
      expect(response.trace.some((t) => t.includes('Safety pre-check') && t.includes('triggered'))).toBe(true);
      // Ordinary retrieval steps (6-11) did NOT execute
      expect(response.trace.some((t) => t.includes('6. Search'))).toBe(false);

      // 3. Human handoff instruction provided
      expect(response.parts[0]!.next_step).toContain('911');
    }
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 11: Evaluation Gate & Blind-Set Readiness Status
  // Product Owner sees golden-set results, failures, citation correctness, abstentions, and explicit blind-set readiness status.
  // Conversational retrieval must NOT be marked production-ready if the blind set has not been evaluated.
  // ---------------------------------------------------------------------------
  it('Scenario 11: Evaluation gate — surfaces golden set metrics, failures, and blocks production readiness until blind set evaluation', () => {
    // 1. Execute the golden evaluation suite
    const report = runSuite('golden');

    // 2. Metrics surface golden-set results, failures, citations, and abstentions
    expect(report.suite).toBe('golden');
    expect(report.metrics.total_cases).toBeGreaterThan(0);
    expect(report.metrics.passed_cases).toBeGreaterThan(0);
    expect(report.metrics.verbatim_compliance).toBeGreaterThanOrEqual(100);
    expect(report.cases.length).toBe(report.metrics.total_cases);

    // 3. Explicit blind-set readiness status
    expect(report.blind_set_evaluated).toBe(false);
    expect(report.production_ready).toBe(false);
    expect(report.readiness_blocker).toBe('Conversational retrieval cannot be certified production-ready until the blind holdout set has been evaluated.');

    // 4. Verifies gate requirement: Never claim production-ready when blind_set_evaluated is false
    if (!report.blind_set_evaluated) {
      expect(report.production_ready).toBe(false);
    }
  });
});
