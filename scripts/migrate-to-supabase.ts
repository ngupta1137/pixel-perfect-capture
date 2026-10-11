import { createDatabaseClient, closeDatabaseClient, isConfiguredPostgresUrl } from "../src/storage/db";
import { getStorageClient, ensureStorageBucket, uploadSourceFileToStorage } from "../src/services/storage.server";
import { calculateSha256 } from "../src/services/ingestion/hasher";
import * as fs from "node:fs";
import * as path from "node:path";

// Ensure local environment variables are loaded
try {
  process.loadEnvFile(".env.local");
} catch {}
try {
  process.loadEnvFile(".env");
} catch {}

if (typeof globalThis.WebSocket === "undefined") {
  try {
    const { WebSocket } = await import("undici");
    (globalThis as any).WebSocket = WebSocket;
  } catch {}
}

interface MigrationReport {
  timestamp: string;
  dryRun: boolean;
  sourceCounts: Record<string, number>;
  destinationCounts: Record<string, number>;
  storageUploads: Array<{ fileId: string; storagePath: string; hash: string; verified: boolean }>;
  errors: string[];
}

export async function runMigration(options: { dryRun?: boolean; dbUrl?: string } = {}): Promise<MigrationReport> {
  const isDryRun = Boolean(options.dryRun);
  const sqlitePath = path.resolve(process.cwd(), ".data", "verity.db");

  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`Source SQLite database not found at ${sqlitePath}`);
  }

  // 1. Connect to source SQLite database
  const sourceDb = createDatabaseClient(`file:${sqlitePath.replace(/\\/g, "/")}`);

  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    dryRun: isDryRun,
    sourceCounts: {},
    destinationCounts: {},
    storageUploads: [],
    errors: [],
  };

  try {
    // 2. Inventory source counts
    const sourceDocs = await sourceDb.selectFrom("source_documents").selectAll().execute();
    const sourceFiles = await sourceDb.selectFrom("source_files").selectAll().execute();
    const sourceJobs = await sourceDb.selectFrom("ingestion_jobs").selectAll().execute();
    const sourceCandidates = await sourceDb.selectFrom("candidate_units").selectAll().execute();
    const sourceDrafts = await sourceDb.selectFrom("drafts").selectAll().execute();
    const sourcePublished = await sourceDb.selectFrom("published_units").selectAll().execute();

    report.sourceCounts = {
      source_documents: sourceDocs.length,
      source_files: sourceFiles.length,
      ingestion_jobs: sourceJobs.length,
      candidate_units: sourceCandidates.length,
      drafts: sourceDrafts.length,
      published_units: sourcePublished.length,
    };

    console.log("=== Source SQLite Inventory ===");
    console.table(report.sourceCounts);

    if (isDryRun) {
      console.log("\n[DRY RUN MODE] No records or files were written to Supabase.");
      return report;
    }

    // 3. Connect to target Supabase PostgreSQL if configured
    const targetDbUrl = options.dbUrl || process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
    let targetDb: ReturnType<typeof createDatabaseClient> | null = null;

    if (isConfiguredPostgresUrl(targetDbUrl)) {
      targetDb = createDatabaseClient(targetDbUrl!);
      console.log("Connected to Supabase PostgreSQL destination.");
    } else {
      console.log("SUPABASE_DB_URL is not configured; running file storage sync and validation.");
    }

    // 4. Migrate files to Supabase Storage if storage is configured
    const storageClient = getStorageClient();
    if (storageClient) {
      await ensureStorageBucket();
      console.log("Ensured Supabase Storage bucket 'verity-source-documents' exists.");

      for (const file of sourceFiles) {
        if (!file.data_base64) continue;
        const buffer = Buffer.from(file.data_base64, "base64");
        const hash = calculateSha256(buffer);

        const uploadRes = await uploadSourceFileToStorage({
          docId: file.source_doc_id,
          fileName: file.file_name,
          buffer,
          mimeType: file.mime_type,
        });

        if (uploadRes.ok) {
          file.storage_bucket = uploadRes.storageBucket || "verity-source-documents";
          file.storage_path = uploadRes.storagePath || null;
          file.file_size = uploadRes.fileSize || buffer.length;
          file.content_hash = uploadRes.contentHash || hash;
        }

        report.storageUploads.push({
          fileId: file.id,
          storagePath: uploadRes.storagePath || "failed",
          hash,
          verified: uploadRes.ok && uploadRes.contentHash === hash,
        });
      }
    }

    // 5. Migrate records to target database if targetDb is active
    if (targetDb) {
      console.log("Migrating database records to Supabase PostgreSQL...");

      // A. source_documents
      if (sourceDocs.length > 0) {
        await targetDb
          .insertInto("source_documents")
          .values(sourceDocs)
          .onConflict((oc) => oc.column("id").doNothing())
          .execute();
      }

      // B. source_files
      if (sourceFiles.length > 0) {
        await targetDb
          .insertInto("source_files")
          .values(sourceFiles)
          .onConflict((oc) => oc.column("id").doNothing())
          .execute();
      }

      // C. ingestion_jobs
      if (sourceJobs.length > 0) {
        await targetDb
          .insertInto("ingestion_jobs")
          .values(sourceJobs)
          .onConflict((oc) => oc.column("id").doNothing())
          .execute();
      }

      // D. candidate_units
      if (sourceCandidates.length > 0) {
        await targetDb
          .insertInto("candidate_units")
          .values(sourceCandidates)
          .onConflict((oc) => oc.column("id").doNothing())
          .execute();
      }

      // E. drafts
      if (sourceDrafts.length > 0) {
        await targetDb
          .insertInto("drafts")
          .values(sourceDrafts)
          .onConflict((oc) => oc.column("draft_id").doNothing())
          .execute();
      }

      // F. published_units
      if (sourcePublished.length > 0) {
        for (const unit of sourcePublished) {
          await targetDb
            .insertInto("published_units")
            .values(unit)
            .onConflict((oc) =>
              oc.column("unit_id").doUpdateSet({
                title: unit.title,
                body: unit.body,
                version: unit.version,
                updated_at: unit.updated_at,
              })
            )
            .execute();
        }
      }

      // Fetch destination counts
      const destDocs = await targetDb.selectFrom("source_documents").selectAll().execute();
      const destFiles = await targetDb.selectFrom("source_files").selectAll().execute();
      const destJobs = await targetDb.selectFrom("ingestion_jobs").selectAll().execute();
      const destCandidates = await targetDb.selectFrom("candidate_units").selectAll().execute();
      const destDrafts = await targetDb.selectFrom("drafts").selectAll().execute();
      const destPublished = await targetDb.selectFrom("published_units").selectAll().execute();

      report.destinationCounts = {
        source_documents: destDocs.length,
        source_files: destFiles.length,
        ingestion_jobs: destJobs.length,
        candidate_units: destCandidates.length,
        drafts: destDrafts.length,
        published_units: destPublished.length,
      };

      console.log("=== Destination Inventory ===");
      console.table(report.destinationCounts);
    }
  } catch (err: any) {
    report.errors.push(err.message);
    console.error("Migration error:", err.message);
  } finally {
    await closeDatabaseClient(sourceDb);
  }

  return report;
}

// Allow CLI execution: `npx tsx scripts/migrate-to-supabase.ts [--dry-run]`
if (process.argv[1]?.endsWith("migrate-to-supabase.ts")) {
  const isDryRun = process.argv.includes("--dry-run");
  runMigration({ dryRun: isDryRun })
    .then((r) => {
      console.log("Migration finished:", { dryRun: r.dryRun, errors: r.errors });
      process.exit(r.errors.length > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error("Fatal migration failure:", err);
      process.exit(1);
    });
}
