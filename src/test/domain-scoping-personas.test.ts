import { describe, expect, it, beforeEach } from 'vitest';
import { serveEngine, ensureStoreHydrated, resetStore } from '../verity-engine/server.ts';
import { searchAs, search } from '../services/verity.ts';
import { findPerson, PEOPLE } from '../lib/rights.ts';
import { repository } from '../storage/repository.ts';
import { resetDemoStore } from '../services/demoStore.ts';

describe('Domain Scoping for Insurance vs Pharmacy Personas (Ian, Marcus, Priya, Dana, Sam)', () => {
  beforeEach(async () => {
    await repository.resetPublishedUnitsToSeed();
    resetDemoStore();
    resetStore();
    await ensureStoreHydrated();
  });

  it('Ian (Insurance Author) resolves to insurance_advocate role and can only view Insurance or Shared knowledge', async () => {
    const ian = findPerson('ian')!;
    expect(ian).toBeDefined();
    expect(ian.role).toBe('insurance_advocate');
    expect(ian.kbs).toEqual(['KB-INS', 'KB-SHARED']);

    // 1. Insurance question -> Answer (U-IN-001)
    const insRes = await searchAs(ian.name, {
      query: 'replace id card',
      role: ian.role,
      channel: 'advocate_view',
    });
    expect(insRes.outcome).toBe('answer');
    expect(insRes.parts[0]!.citations[0]!.unit_id).toBe('U-IN-001');

    // 2. Shared question -> Answer (U-SH-001)
    const sharedRes = await searchAs(ian.name, {
      query: 'what do i say at the start of the call',
      role: ian.role,
      channel: 'advocate_view',
    });
    expect(sharedRes.outcome).toBe('answer');
    expect(sharedRes.parts[0]!.citations[0]!.unit_id).toBe('U-SH-001');

    // 3. Pharmacy question -> not_authorized with redirect to Pharmacy advocate
    const pharmRes = await searchAs(ian.name, {
      query: 'Rx pricing disclaimer',
      role: ian.role,
      channel: 'advocate_view',
    });
    expect(pharmRes.outcome).toBe('not_authorized');
    expect(pharmRes.parts[0]!.text).toBeNull();
    expect(pharmRes.parts[0]!.citations).toHaveLength(0);
    expect(pharmRes.parts[0]!.message).toContain('Pharmacy advocate');

    // 4. Pharmacy mail order days supply -> not_authorized
    const daysRes = await searchAs(ian.name, {
      query: 'how many days supply can I get by mail',
      role: ian.role,
      channel: 'advocate_view',
    });
    expect(daysRes.outcome).toBe('not_authorized');
    expect(daysRes.parts[0]!.text).toBeNull();
  });

  it('Dana (Pharmacy Author) resolves to pharmacy_advocate role and can only view Pharmacy or Shared knowledge', async () => {
    const dana = findPerson('dana')!;
    expect(dana).toBeDefined();
    expect(dana.role).toBe('pharmacy_advocate');
    expect(dana.kbs).toEqual(['KB-PHARM', 'KB-SHARED']);

    // 1. Pharmacy question -> Answer (U-PH-003)
    const pharmRes = await searchAs(dana.name, {
      query: 'Rx pricing disclaimer',
      role: dana.role,
      channel: 'advocate_view',
    });
    expect(pharmRes.outcome).toBe('answer');
    expect(pharmRes.parts[0]!.citations[0]!.unit_id).toBe('U-PH-003');

    // 2. Insurance question -> not_authorized
    const insRes = await searchAs(dana.name, {
      query: 'replace id card',
      role: dana.role,
      channel: 'advocate_view',
    });
    expect(insRes.outcome).toBe('not_authorized');
    expect(insRes.parts[0]!.text).toBeNull();
    expect(insRes.parts[0]!.message).toContain('Insurance advocate');
  });

  it('Sam (Advocate Supervisor) executes queries without server role rejection', async () => {
    const sam = findPerson('sam')!;
    expect(sam).toBeDefined();
    expect(sam.role).toBe('pharmacy_supervisor');

    const res = await searchAs(sam.name, {
      query: 'Rx pricing disclaimer',
      role: sam.role,
      channel: 'advocate_view',
    });
    expect(res.outcome).toBe('answer');
    expect(res.parts[0]!.citations[0]!.unit_id).toBe('U-PH-003');
  });
});
