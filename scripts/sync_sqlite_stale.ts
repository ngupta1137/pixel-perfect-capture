import { createDatabaseClient, closeDatabaseClient } from "../src/storage/db";
import { runMigrations } from "../src/storage/migrations";
import { StorageRepository } from "../src/storage/repository";
import unitsSeed from "../src/verity-engine/data/units_seed.json";

const AS_OF = "2026-10-12";

async function main() {
  console.log("Syncing local SQLite .data/verity.db...");
  const sqliteDb = createDatabaseClient("./.data/verity.db");
  await runMigrations(sqliteDb);
  const repo = new StorageRepository(sqliteDb);

  for (const u of unitsSeed.units) {
    if (u.status === "duplicate_candidate") continue;
    const isOverdue = u.review_date < AS_OF && u.status !== "retired";
    const status = u.status === "retired" ? "retired" : (isOverdue ? "stale" : u.status);

    await repo.savePublishedUnit({
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

  // Update source documents in sqlite
  const docs = await repo.listSourceDocuments(100);
  for (const doc of docs) {
    let reviewDate: string | null = null;
    let isStale = false;

    if (doc.id === "SRC-MV5J6HJC-366" || doc.title.includes("Verity_Live_Demo_Pack")) {
      reviewDate = "2026-10-01";
      isStale = true;
    } else if (doc.id === "SRC-MV4DG0KK-764" || doc.title.includes("S01_source_Rx_Education_Script")) {
      reviewDate = "2026-06-30";
      isStale = true;
    } else if (doc.id === "SRC-MV4Q2VGZ-86" || doc.title.includes("100_day_pilot")) {
      reviewDate = "2025-11-01";
      isStale = true;
    }

    if (isStale) {
      await repo.updateSourceDocument(doc.id, {
        review_date: reviewDate,
        status: "stale",
      });
    } else {
      await repo.updateSourceDocument(doc.id, {
        review_date: reviewDate || "2026-12-31",
        status: "active",
      });
    }
  }

  const published = await repo.listPublishedUnits();
  console.log(`Local SQLite published_units count: ${published.length}`);
  const stale = published.filter(p => p.status === "stale");
  console.log(`Local SQLite stale units:`, stale.map(s => s.unit_id));

  await closeDatabaseClient(sqliteDb);
  console.log("Local SQLite synced successfully.");
}

main().catch(console.error);
