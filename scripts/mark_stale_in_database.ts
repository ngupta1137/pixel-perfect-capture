import { repository } from "../src/storage/repository";
import unitsSeed from "../src/verity-engine/data/units_seed.json";
import { getDb } from "../src/storage/db";

const AS_OF = "2026-10-12";

async function main() {
  console.log(`=== Marking Overdue Documents & Units as Stale (As of ${AS_OF}) ===`);
  const db = await getDb();

  // 1. Ensure migrations are run so review_date & status exist in source_documents
  try {
    await db.schema.alterTable("source_documents").addColumn("review_date", "text").execute();
  } catch {}
  try {
    await db.schema.alterTable("source_documents").addColumn("status", "text").execute();
  } catch {}

  // 2. Populate / Update published_units in SQLite
  console.log("\n1. Populating and updating published_units in database...");
  for (const u of unitsSeed.units) {
    if (u.status === "duplicate_candidate") continue;
    const isOverdue = u.review_date < AS_OF && u.status !== "retired";
    const status = u.status === "retired" ? "retired" : (isOverdue ? "stale" : u.status);

    await repository.savePublishedUnit({
      unit_id: u.unit_id,
      title: u.title,
      type: u.type,
      body: u.body,
      verbatim: u.verbatim ? 1 : 0,
      spoken_version: u.spoken_version || null,
      knowledge_base: u.knowledge_base,
      audience_json: JSON.stringify(u.audience),
      channels_json: JSON.stringify(u.channels),
      authority_level: u.authority_level,
      source_doc: u.source_doc,
      source_section: u.source_section,
      effective_date: u.effective_date,
      review_date: u.review_date,
      version: u.version,
      status: status as any,
      supersedes: u.supersedes || null,
      synonyms_json: JSON.stringify(u.synonyms),
      owner: u.owner,
      approved_by: (u as any).approved_by || "Owen (Knowledge owner)",
      applies_to_json: JSON.stringify((u as any).applies_to || {}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // 3. Mark any existing published units with review_date < AS_OF as stale
  const updatedUnits = await repository.markOverdueUnitsAndDocsAsStale(AS_OF);
  console.log(`Scanned published_units: ${updatedUnits.updatedUnitsCount} marked as stale.`);

  // 4. Update source documents with specific review dates
  console.log("\n2. Updating source documents in database...");
  const docs = await repository.listSourceDocuments(100);

  for (const doc of docs) {
    let reviewDate: string | null = null;
    let isStale = false;

    // Check specific known document review dates
    if (doc.id === "SRC-MV5J6HJC-366" || doc.title.includes("Verity_Live_Demo_Pack")) {
      reviewDate = "2026-10-01"; // "Review overdue since October 1, 2026"
      isStale = true;
    } else if (doc.id === "SRC-MV4DG0KK-764" || doc.title.includes("S01_source_Rx_Education_Script")) {
      reviewDate = "2026-06-30"; // "Reviewed 06/2025, next review due 06/30/2026"
      isStale = true;
    } else if (doc.id === "SRC-MV4Q2VGZ-86" || doc.title.includes("100_day_pilot")) {
      reviewDate = "2025-11-01"; // Ended legacy pilot
      isStale = true;
    } else if (doc.raw_text) {
      // Regex search for review dates in document text
      const match = doc.raw_text.match(/next review due[^\d]*(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/i);
      if (match && match[1]) {
        const d = match[1];
        if (d.includes("/")) {
          const [m, day, y] = d.split("/");
          reviewDate = `${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}`;
        } else {
          reviewDate = d;
        }
        if (reviewDate < AS_OF) isStale = true;
      }
    }

    if (isStale) {
      await repository.updateSourceDocument(doc.id, {
        review_date: reviewDate,
        status: "stale",
      });
      console.log(`Document ${doc.id} ("${doc.title}") marked as STALE (review_date: ${reviewDate}).`);
    } else {
      await repository.updateSourceDocument(doc.id, {
        review_date: reviewDate || "2026-12-31",
        status: "active",
      });
      console.log(`Document ${doc.id} ("${doc.title}") marked as active.`);
    }
  }

  console.log("\n=== Final Status Verification ===");
  const allUnits = await repository.listPublishedUnits();
  console.log(`Total published_units in DB: ${allUnits.length}`);
  const staleUnits = allUnits.filter((u) => u.status === "stale");
  console.log(`Stale published_units in DB (${staleUnits.length}):`);
  for (const u of staleUnits) {
    console.log(`  - ${u.unit_id}: "${u.title}" | review_date: ${u.review_date} | status: ${u.status}`);
  }

  const allDocs = await repository.listSourceDocuments(100);
  console.log(`\nTotal source_documents in DB: ${allDocs.length}`);
  const staleDocs = allDocs.filter((d) => d.status === "stale");
  console.log(`Stale source_documents in DB (${staleDocs.length}):`);
  for (const d of staleDocs) {
    console.log(`  - ${d.id}: "${d.title}" | review_date: ${d.review_date} | status: ${d.status}`);
  }

  console.log("\nDatabase update completed successfully.");
}

main().catch(console.error);
