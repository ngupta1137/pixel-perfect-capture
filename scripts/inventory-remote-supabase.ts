import pg from "pg";
import { getStorageClient, VERITY_STORAGE_BUCKET } from "../src/services/storage.server";

try {
  process.loadEnvFile(".env.local");
} catch {}
try {
  process.loadEnvFile(".env");
} catch {}

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("SUPABASE_DB_URL not set.");
  process.exit(1);
}

async function inventoryRemote() {
  const sanitizedUrl = dbUrl.trim().replace("sslmode=require", "sslmode=no-verify");
  const client = new pg.Client({
    connectionString: sanitizedUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const docs = await client.query("SELECT id, title, file_type, file_size, content_hash, owner_team, lob, created_by, created_at FROM source_documents ORDER BY created_at ASC;");
    const files = await client.query("SELECT id, source_doc_id, file_name, mime_type, storage_bucket, storage_path, file_size, content_hash, created_at FROM source_files ORDER BY created_at ASC;");
    const jobs = await client.query("SELECT id, source_doc_id, status, extractor, candidate_count, skipped_count, error_message, created_at FROM ingestion_jobs ORDER BY created_at ASC;");
    const candidates = await client.query("SELECT id, cid, job_id, source_doc_id, title, candidate_type, match_status, route_to, owner_team, created_at FROM candidate_units ORDER BY created_at ASC;");
    const drafts = await client.query("SELECT draft_id, unit_id, source_doc_id, candidate_id, title, proposed_by, status, decided_by, reason, created_at, updated_at FROM drafts ORDER BY created_at ASC;");
    const published = await client.query("SELECT unit_id, title, type, authority_level, source_doc, version, status, owner, approved_by, effective_date, created_at FROM published_units ORDER BY created_at ASC;");

    console.log("=== REMOTE SUPABASE RECORDS INVENTORY ===\n");
    console.log("1. SOURCE DOCUMENTS (" + docs.rows.length + "):");
    console.table(docs.rows);

    console.log("\n2. SOURCE FILES (" + files.rows.length + "):");
    console.table(files.rows);

    console.log("\n3. INGESTION JOBS (" + jobs.rows.length + "):");
    console.table(jobs.rows);

    console.log("\n4. CANDIDATE UNITS (" + candidates.rows.length + " - showing first 15):");
    console.table(candidates.rows.slice(0, 15));

    console.log("\n5. DRAFTS (" + drafts.rows.length + "):");
    console.table(drafts.rows);

    console.log("\n6. PUBLISHED UNITS (" + published.rows.length + "):");
    console.table(published.rows);

    // Storage Objects
    const storage = getStorageClient();
    if (storage) {
      const { data: objects, error } = await storage.storage.from(VERITY_STORAGE_BUCKET).list("sources/general", { limit: 100 });
      console.log("\n7. STORAGE OBJECTS in 'sources/general' (" + (objects?.length ?? 0) + "):");
      console.table(objects?.map((o) => ({ name: o.name, id: o.id, created_at: o.created_at })));
    }
  } catch (err: any) {
    console.error("Inventory error:", err.message);
  } finally {
    await client.end();
  }
}

inventoryRemote();
