import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createDatabaseClient, closeDatabaseClient, getDatabaseType, isConfiguredPostgresUrl } from "../storage/db";
import { StorageRepository } from "../storage/repository";
import { getStorageClient, getSignedSourceFileUrl, VERITY_STORAGE_BUCKET } from "../services/storage.server";

// Safe loading of local environment
try {
  process.loadEnvFile(".env.local");
} catch {}
try {
  process.loadEnvFile(".env");
} catch {}

describe("Verity Live Supabase Integration & Production Database Suite", () => {
  let liveDb: ReturnType<typeof createDatabaseClient>;
  let liveRepo: StorageRepository;
  const isPostgresConfigured = isConfiguredPostgresUrl(process.env.SUPABASE_DB_URL);

  beforeAll(async () => {
    if (isPostgresConfigured) {
      liveDb = createDatabaseClient(process.env.SUPABASE_DB_URL!);
      liveRepo = new StorageRepository(liveDb);
    }
  });

  afterAll(async () => {
    if (liveDb) {
      await closeDatabaseClient(liveDb);
    }
  });

  it("1. Connects to live Supabase PostgreSQL and verifies active database dialect", () => {
    expect(isPostgresConfigured).toBe(true);
    expect(liveDb).toBeDefined();
    expect(getDatabaseType()).toBe("postgres");
  });

  it("2. Verifies 11 migrated source documents in live PostgreSQL database", async () => {
    const docs = await liveRepo.listSourceDocuments(50);
    expect(docs.length).toBeGreaterThanOrEqual(11);
    const docIds = docs.map((d) => d.id);
    expect(docIds.some((id) => id.includes("SRC-"))).toBe(true);
  });

  it("3. Verifies 11 migrated source files in live PostgreSQL database", async () => {
    const files = await liveDb.selectFrom("source_files").selectAll().execute();
    expect(files.length).toBeGreaterThanOrEqual(11);
    expect(files.every((f) => f.source_doc_id)).toBe(true);
  });

  it("4. Verifies 11 migrated ingestion jobs in live PostgreSQL database", async () => {
    const jobs = await liveDb.selectFrom("ingestion_jobs").selectAll().execute();
    expect(jobs.length).toBeGreaterThanOrEqual(11);
    expect(jobs.every((j) => j.status === "completed" || j.status === "failed")).toBe(true);
  });

  it("5. Verifies 49 migrated candidate units in live PostgreSQL database", async () => {
    const candidates = await liveDb.selectFrom("candidate_units").selectAll().execute();
    expect(candidates.length).toBeGreaterThanOrEqual(49);
    expect(candidates.every((c) => c.cid)).toBe(true);
  });

  it("6. Verifies 19 migrated drafts in live PostgreSQL database with review history", async () => {
    const drafts = await liveRepo.listDrafts();
    expect(drafts.length).toBeGreaterThanOrEqual(19);

    const statuses = new Set(drafts.map((d) => d.status));
    expect(statuses.has("proposed")).toBe(true);
    expect(statuses.has("approved")).toBe(true);

    // Verify history JSON was preserved
    const draftWithHistory = drafts.find((d) => d.history_json && d.history_json.length > 5);
    expect(draftWithHistory).toBeDefined();
    expect(() => JSON.parse(draftWithHistory!.history_json)).not.toThrow();
  });

  it("7. Verifies 2 published units in live PostgreSQL database", async () => {
    const published = await liveRepo.listPublishedUnits();
    expect(published.length).toBe(2);
    expect(published.every((p) => p.status === "approved")).toBe(true);
  });

  it("8. Performs live transaction rollback on Supabase PostgreSQL without persisting", async () => {
    const testDocId = `DOC-LIVE-ROLLBACK-${Date.now()}`;

    try {
      await liveDb.transaction().execute(async (trx) => {
        await trx
          .insertInto("source_documents")
          .values({
            id: testDocId,
            title: "Temporary Live Rollback Test",
            file_type: "txt",
            file_size: 128,
            content_hash: "rollback-hash-" + Date.now(),
            raw_text: "Rollback verification",
            owner_team: "Legal",
            lob: "MAPD",
            source_type: "Policy",
            created_by: "Dana",
            created_at: new Date().toISOString(),
          })
          .execute();

        throw new Error("Deliberate live abort for rollback verification");
      });
    } catch (err: any) {
      expect(err.message).toBe("Deliberate live abort for rollback verification");
    }

    // Verify record was completely rolled back from live PostgreSQL
    const rolledBackDoc = await liveRepo.getSourceDocumentById(testDocId);
    expect(rolledBackDoc).toBeUndefined();
  });

  it("9. Verifies live Supabase Storage bucket reachability and private signed URLs", async () => {
    const storageClient = getStorageClient();
    expect(storageClient).toBeDefined();

    const { data: buckets, error } = await storageClient!.storage.listBuckets();
    expect(error).toBeNull();
    expect(buckets?.some((b) => b.name === VERITY_STORAGE_BUCKET)).toBe(true);

    const liveFiles = await liveDb
      .selectFrom("source_files")
      .select("storage_path")
      .where("storage_path", "is not", null)
      .execute();
    expect(liveFiles.length).toBeGreaterThan(0);
    const testPath = liveFiles[0]!.storage_path!;

    // Test signed URL generation with authentic live storage path
    const signedRes = await getSignedSourceFileUrl(testPath, 60);
    expect(signedRes.ok).toBe(true);
    expect(signedRes.signedUrl).toBeDefined();
    expect(signedRes.signedUrl).toContain("token=");
  });
});
