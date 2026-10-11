import type { Kysely, Insertable, Updateable } from "kysely";
import type {
  DatabaseSchema,
  SourceDocumentTable,
  SourceFileTable,
  IngestionJobTable,
  CandidateUnitTable,
  DraftTable,
} from "./schema";
import { getDb } from "./db";

export class StorageRepository {
  private dbProvider: () => Promise<Kysely<DatabaseSchema>>;

  constructor(
    dbOrProvider:
      | Kysely<DatabaseSchema>
      | (() => Promise<Kysely<DatabaseSchema>>) = getDb
  ) {
    if (typeof dbOrProvider === "function") {
      this.dbProvider = dbOrProvider;
    } else {
      this.dbProvider = async () => dbOrProvider;
    }
  }

  private async getDb() {
    return await this.dbProvider();
  }

  // ---------------------------------------------------------------------------
  // Source Documents
  // ---------------------------------------------------------------------------
  async createSourceDocument(
    doc: Insertable<SourceDocumentTable>
  ): Promise<SourceDocumentTable> {
    const db = await this.getDb();
    await db.insertInto("source_documents").values(doc).execute();
    const created = await this.getSourceDocumentById(doc.id);
    if (!created) throw new Error(`Failed to retrieve created document ${doc.id}`);
    return created;
  }

  async findSourceDocumentByHash(
    hash: string
  ): Promise<SourceDocumentTable | undefined> {
    const db = await this.getDb();
    return await db
      .selectFrom("source_documents")
      .selectAll()
      .where("content_hash", "=", hash)
      .executeTakeFirst();
  }

  async getSourceDocumentById(
    id: string
  ): Promise<SourceDocumentTable | undefined> {
    const db = await this.getDb();
    return await db
      .selectFrom("source_documents")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
  }

  async listSourceDocuments(limit = 50): Promise<SourceDocumentTable[]> {
    const db = await this.getDb();
    return await db
      .selectFrom("source_documents")
      .selectAll()
      .orderBy("created_at", "desc")
      .limit(limit)
      .execute();
  }

  async deleteSourceDocument(id: string): Promise<void> {
    const db = await this.getDb();
    await db.deleteFrom("candidate_units").where("source_doc_id", "=", id).execute();
    await db.deleteFrom("ingestion_jobs").where("source_doc_id", "=", id).execute();
    await db.deleteFrom("source_files").where("source_doc_id", "=", id).execute();
    await db.deleteFrom("source_documents").where("id", "=", id).execute();
  }

  // ---------------------------------------------------------------------------
  // Source Files (Original Binary Storage)
  // ---------------------------------------------------------------------------
  async saveSourceFile(
    file: Insertable<SourceFileTable>
  ): Promise<SourceFileTable> {
    const db = await this.getDb();
    await db.insertInto("source_files").values(file).execute();
    const created = await db
      .selectFrom("source_files")
      .selectAll()
      .where("id", "=", file.id)
      .executeTakeFirst();
    if (!created) throw new Error(`Failed to retrieve saved source file ${file.id}`);
    return created;
  }

  async getSourceFileByDocId(
    sourceDocId: string
  ): Promise<SourceFileTable | undefined> {
    const db = await this.getDb();
    return await db
      .selectFrom("source_files")
      .selectAll()
      .where("source_doc_id", "=", sourceDocId)
      .executeTakeFirst();
  }

  // ---------------------------------------------------------------------------
  // Ingestion Jobs
  // ---------------------------------------------------------------------------
  async createIngestionJob(
    job: Insertable<IngestionJobTable>
  ): Promise<IngestionJobTable> {
    const db = await this.getDb();
    await db.insertInto("ingestion_jobs").values(job).execute();
    const created = await this.getIngestionJobById(job.id);
    if (!created) throw new Error(`Failed to retrieve created job ${job.id}`);
    return created;
  }

  async getIngestionJobById(
    id: string
  ): Promise<IngestionJobTable | undefined> {
    const db = await this.getDb();
    return await db
      .selectFrom("ingestion_jobs")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
  }

  async getLatestJobForDoc(
    docId: string
  ): Promise<IngestionJobTable | undefined> {
    const db = await this.getDb();
    return await db
      .selectFrom("ingestion_jobs")
      .selectAll()
      .where("source_doc_id", "=", docId)
      .orderBy("created_at", "desc")
      .executeTakeFirst();
  }

  async updateIngestionJob(
    id: string,
    updates: Updateable<IngestionJobTable>
  ): Promise<void> {
    const db = await this.getDb();
    await db
      .updateTable("ingestion_jobs")
      .set(updates)
      .where("id", "=", id)
      .execute();
  }

  // ---------------------------------------------------------------------------
  // Candidate Knowledge Units
  // ---------------------------------------------------------------------------
  async saveCandidateUnits(
    units: Insertable<CandidateUnitTable>[]
  ): Promise<CandidateUnitTable[]> {
    if (units.length === 0) return [];
    const db = await this.getDb();
    await db.insertInto("candidate_units").values(units).execute();
    const ids = units.map((u) => u.id);
    return await db
      .selectFrom("candidate_units")
      .selectAll()
      .where("id", "in", ids)
      .execute();
  }

  async getCandidatesByJobId(jobId: string): Promise<CandidateUnitTable[]> {
    const db = await this.getDb();
    return await db
      .selectFrom("candidate_units")
      .selectAll()
      .where("job_id", "=", jobId)
      .orderBy("cid", "asc")
      .execute();
  }

  async getCandidatesByDocId(docId: string): Promise<CandidateUnitTable[]> {
    const db = await this.getDb();
    return await db
      .selectFrom("candidate_units")
      .selectAll()
      .where("source_doc_id", "=", docId)
      .orderBy("cid", "asc")
      .execute();
  }

  async getCandidateById(id: string): Promise<CandidateUnitTable | undefined> {
    const db = await this.getDb();
    return await db
      .selectFrom("candidate_units")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
  }

  async updateCandidateUnit(
    id: string,
    updates: Updateable<CandidateUnitTable>
  ): Promise<void> {
    const db = await this.getDb();
    await db
      .updateTable("candidate_units")
      .set(updates)
      .where("id", "=", id)
      .execute();
  }

  // ---------------------------------------------------------------------------
  // Governed Drafts
  // ---------------------------------------------------------------------------
  async createDrafts(drafts: Insertable<DraftTable>[]): Promise<DraftTable[]> {
    if (drafts.length === 0) return [];
    const db = await this.getDb();
    await db
      .insertInto("drafts")
      .values(drafts)
      .onConflict((oc) => oc.column("draft_id").doNothing())
      .execute();
    const ids = drafts.map((d) => d.draft_id);
    return await db
      .selectFrom("drafts")
      .selectAll()
      .where("draft_id", "in", ids)
      .execute();
  }

  async listDrafts(status?: string): Promise<DraftTable[]> {
    const db = await this.getDb();
    let query = db.selectFrom("drafts").selectAll();
    if (status) {
      query = query.where("status", "=", status as any);
    }
    return await query.orderBy("created_at", "desc").execute();
  }

  async getDraftById(id: string): Promise<DraftTable | undefined> {
    const db = await this.getDb();
    return await db
      .selectFrom("drafts")
      .selectAll()
      .where("draft_id", "=", id)
      .executeTakeFirst();
  }

  async updateDraft(id: string, updates: Updateable<DraftTable>): Promise<void> {
    const db = await this.getDb();
    await db.updateTable("drafts").set(updates).where("draft_id", "=", id).execute();
  }
}

export const repository = new StorageRepository();
