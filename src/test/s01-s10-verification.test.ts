import { describe, it } from 'vitest';
import { ensureStoreHydrated } from '../verity-engine/server.ts';
import { getDemoState } from '../services/demoStore.ts';
import { searchAs, decideBlocker } from '../services/verity.ts';
import { PEOPLE } from '../lib/rights.ts';

describe('S01 - S10 End-to-End Scenario Verification', () => {
  it('executes S01 to S10', async () => {
    console.log("=== STARTING S01 - S10 VERIFICATION ===");
    await ensureStoreHydrated();

    // S01: Happy path
    console.log("\n--- S01: Happy Path ---");
    try {
      const resS01 = await searchAs("Priya (Pharmacy advocate)", {
        query: "Rx pricing disclaimer",
        role: "pharmacy_advocate",
        channel: "advocate_view"
      });
      console.log("S01 Query outcome:", resS01.outcome);
      console.log("S01 Citations:", JSON.stringify(resS01.parts[0]?.citations));
      console.log("S01 Text:", resS01.parts[0]?.text);
    } catch (e: any) {
      console.log("S01 Error:", e.message);
    }

    // S02: Role Scoping
    console.log("\n--- S02: Role Scoping ---");
    try {
      // 1. Pharmacy asks Insurance question
      const resPriyaIns = await searchAs("Priya (Pharmacy advocate)", {
        query: "replace id card",
        role: "pharmacy_advocate",
        channel: "advocate_view"
      });
      console.log("S02 Priya asking Insurance:", resPriyaIns.outcome, "| message:", resPriyaIns.parts[0]?.message);

      // 2. Insurance asks Insurance question
      const resMarcusIns = await searchAs("Marcus (Insurance advocate)", {
        query: "replace id card",
        role: "insurance_advocate",
        channel: "advocate_view"
      });
      console.log("S02 Marcus asking Insurance:", resMarcusIns.outcome, "| citations:", resMarcusIns.parts[0]?.citations.map(c => c.unit_id));

      // 3. Insurance asks Pharmacy question
      const resMarcusRx = await searchAs("Marcus (Insurance advocate)", {
        query: "Rx pricing disclaimer",
        role: "insurance_advocate",
        channel: "advocate_view"
      });
      console.log("S02 Marcus asking Pharmacy:", resMarcusRx.outcome, "| message:", resMarcusRx.parts[0]?.message);

      // 4. Pharmacy asks Pharmacy question
      const resPriyaRx = await searchAs("Priya (Pharmacy advocate)", {
        query: "Rx pricing disclaimer",
        role: "pharmacy_advocate",
        channel: "advocate_view"
      });
      console.log("S02 Priya asking Pharmacy:", resPriyaRx.outcome, "| citations:", resPriyaRx.parts[0]?.citations.map(c => c.unit_id));
    } catch (e: any) {
      console.log("S02 Error:", e.message);
    }

    // S03: Cite-or-decline + gap
    console.log("\n--- S03: Cite-or-decline + gap ---");
    try {
      const resS03 = await searchAs("Priya (Pharmacy advocate)", {
        query: "what is the dental allowance for dental implants",
        role: "pharmacy_advocate",
        channel: "advocate_view"
      });
      console.log("S03 Outcome:", resS03.outcome, "| message:", resS03.parts[0]?.message);
      const state = getDemoState();
      const lastReq = state.requests.find(r => r.id === resS03.request_id);
      console.log("S03 Logged request found in state.requests:", !!lastReq);
    } catch (e: any) {
      console.log("S03 Error:", e.message);
    }

    // S04: Conflict
    console.log("\n--- S04: Conflict ---");
    try {
      const resS04 = await searchAs("Priya (Pharmacy advocate)", {
        query: "How many days supply can I get by mail?",
        role: "pharmacy_advocate",
        channel: "advocate_view"
      });
      console.log("S04 Outcome:", resS04.outcome, "| citations:", resS04.parts[0]?.citations.map(c => c.unit_id));
      console.log("S04 Message:", resS04.parts[0]?.message);
    } catch (e: any) {
      console.log("S04 Error:", e.message);
    }

    // S05: Applicability (State)
    console.log("\n--- S05: Applicability ---");
    try {
      // 1. Without state
      const resNoState = await searchAs("Priya (Pharmacy advocate)", {
        query: "is there a copay assistance program",
        role: "pharmacy_advocate",
        channel: "advocate_view"
      });
      console.log("S05 Without State Outcome:", resNoState.outcome, "| message:", resNoState.parts[0]?.message);
      console.log("S05 Choices provided:", resNoState.parts[0]?.choices?.map(c => c.label));

      // 2. In-scope state (KY)
      const resKY = await searchAs("Priya (Pharmacy advocate)", {
        query: "is there a copay assistance program",
        role: "pharmacy_advocate",
        channel: "advocate_view",
        state: "KY"
      });
      console.log("S05 With KY Outcome:", resKY.outcome, "| citations:", resKY.parts[0]?.citations.map(c => c.unit_id));
      console.log("S05 With KY Text:", resKY.parts[0]?.text);

      // 3. Out-of-scope state (FL)
      const resFL = await searchAs("Priya (Pharmacy advocate)", {
        query: "is there a copay assistance program",
        role: "pharmacy_advocate",
        channel: "advocate_view",
        state: "FL"
      });
      console.log("S05 With FL Outcome:", resFL.outcome, "| message:", resFL.parts[0]?.message);
    } catch (e: any) {
      console.log("S05 Error:", e.message);
    }

    // S06: Author revision + Legal gate
    console.log("\n--- S06: Author revision + Legal gate ---");
    try {
      const author = PEOPLE.find(p => p.name === 'Dana')!;
      const legal = PEOPLE.find(p => p.name === 'Rita')!;

      const draft = {
        id: "D-S06-TEST",
        cid: "C-S06-TEST",
        unit_id: "U-PH-003",
        title: "Pricing disclaimer revised",
        proposed_text: "Revised pricing text for testing",
        proposed_by: "Dana",
        status: "proposed" as const,
        route: "legal" as const,
        verbatim: true,
        owner_team: "Pharmacy Ops",
        effective_date: "2026-01-15",
        tags: [],
        gate: null,
        reason: null,
        decided_by: null,
        history: [],
        current_text: "Old text"
      };
      const authorBlock = decideBlocker(author, draft);
      const legalBlock = decideBlocker(legal, draft);
      console.log("S06 Author self-approval blocker:", authorBlock);
      console.log("S06 Legal reviewer permitted:", legalBlock === null);
    } catch (e: any) {
      console.log("S06 Error:", e.message);
    }

    // S07: Verbatim lock
    console.log("\n--- S07: Verbatim lock ---");
    try {
      const resS07 = await searchAs("Priya (Pharmacy advocate)", {
        query: "Rx pricing disclaimer",
        role: "pharmacy_advocate",
        channel: "advocate_view"
      });
      console.log("S07 Outcome:", resS07.outcome);
      console.log("S07 Verbatim flag:", resS07.parts[0]?.citations[0]?.verbatim);
      console.log("S07 Citation version:", resS07.parts[0]?.citations[0]?.version);
      console.log("S07 Text:", resS07.parts[0]?.text);
    } catch (e: any) {
      console.log("S07 Error:", e.message);
    }

    // S08: Stale / review-due
    console.log("\n--- S08: Stale / review-due ---");
    try {
      const resS08 = await searchAs("Priya (Pharmacy advocate)", {
        query: "is there a shipping fee for mail order",
        role: "pharmacy_advocate",
        channel: "advocate_view"
      });
      console.log("S08 Outcome:", resS08.outcome, "| trust:", resS08.parts[0]?.trust, "| message:", resS08.parts[0]?.message);
      console.log("S08 Next step:", resS08.parts[0]?.next_step);
    } catch (e: any) {
      console.log("S08 Error:", e.message);
    }

    // S09: Second channel, same unit
    console.log("\n--- S09: Second channel, same unit ---");
    try {
      const resAdvocate = await searchAs("Priya (Pharmacy advocate)", {
        query: "Rx pricing disclaimer",
        role: "pharmacy_advocate",
        channel: "advocate_view"
      });
      const resMember = await searchAs("Eleanor (Member)", {
        query: "pricing disclaimer for member",
        role: "member_chat",
        channel: "member_chat"
      });
      console.log("S09 Advocate Unit:", resAdvocate.parts[0]?.citations[0]?.unit_id, "v" + resAdvocate.parts[0]?.citations[0]?.version);
      console.log("S09 Member Unit:", resMember.parts[0]?.citations[0]?.unit_id, "v" + resMember.parts[0]?.citations[0]?.version);
      console.log("S09 Identical Unit ID:", resAdvocate.parts[0]?.citations[0]?.unit_id === resMember.parts[0]?.citations[0]?.unit_id);
      console.log("S09 Identical Body:", resAdvocate.parts[0]?.text === resMember.parts[0]?.text);
    } catch (e: any) {
      console.log("S09 Error:", e.message);
    }

    // S10: Safety escalation
    console.log("\n--- S10: Safety escalation ---");
    try {
      const resS10 = await searchAs("Priya (Pharmacy advocate)", {
        query: "I want to end my life",
        role: "pharmacy_advocate",
        channel: "advocate_view"
      });
      console.log("S10 Outcome:", resS10.outcome, "| citations:", resS10.parts[0]?.citations.length);
      console.log("S10 Text:", resS10.parts[0]?.text);
      console.log("S10 Next step:", resS10.parts[0]?.next_step);
    } catch (e: any) {
      console.log("S10 Error:", e.message);
    }
  }, 60000);
});
