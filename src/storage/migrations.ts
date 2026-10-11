import type { Kysely } from "kysely";
import type { DatabaseSchema } from "./schema";

export async function runMigrations(db: Kysely<DatabaseSchema>): Promise<void> {
  // 1. source_documents
  await db.schema
    .createTable("source_documents")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("file_type", "text", (col) => col.notNull())
    .addColumn("file_size", "integer", (col) => col.notNull())
    .addColumn("content_hash", "text", (col) => col.notNull())
    .addColumn("raw_text", "text", (col) => col.notNull())
    .addColumn("owner_team", "text", (col) => col.notNull())
    .addColumn("lob", "text", (col) => col.notNull())
    .addColumn("plan_year", "text")
    .addColumn("state_code", "text")
    .addColumn("source_type", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("created_by", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull())
    .execute();

  // Index on content_hash for instant duplicate detection
  await db.schema
    .createIndex("idx_source_documents_hash")
    .ifNotExists()
    .on("source_documents")
    .column("content_hash")
    .execute();

  // 2. source_files (durable original binary storage)
  await db.schema
    .createTable("source_files")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("source_doc_id", "text", (col) => col.notNull())
    .addColumn("file_name", "text", (col) => col.notNull())
    .addColumn("mime_type", "text", (col) => col.notNull())
    .addColumn("data_base64", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull())
    .execute();

  // 3. ingestion_jobs
  await db.schema
    .createTable("ingestion_jobs")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("source_doc_id", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("extractor", "text", (col) => col.notNull())
    .addColumn("candidate_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("skipped_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("error_message", "text")
    .addColumn("notes_json", "text", (col) => col.notNull().defaultTo("[]"))
    .addColumn("created_at", "text", (col) => col.notNull())
    .addColumn("completed_at", "text")
    .execute();

  // 4. candidate_units
  await db.schema
    .createTable("candidate_units")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("cid", "text", (col) => col.notNull())
    .addColumn("annotated_id", "text")
    .addColumn("job_id", "text", (col) => col.notNull())
    .addColumn("source_doc_id", "text", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("candidate_type", "text", (col) => col.notNull())
    .addColumn("body", "text", (col) => col.notNull())
    .addColumn("verbatim", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("knowledge_base", "text", (col) => col.notNull())
    .addColumn("owner_team", "text", (col) => col.notNull())
    .addColumn("source_reference", "text", (col) => col.notNull())
    .addColumn("source_section", "text")
    .addColumn("source_page", "integer")
    .addColumn("effective_date", "text", (col) => col.notNull())
    .addColumn("match_status", "text", (col) => col.notNull())
    .addColumn("matched_unit_id", "text")
    .addColumn("similarity", "real", (col) => col.notNull().defaultTo(0.0))
    .addColumn("diff_json", "text")
    .addColumn("route_to", "text", (col) => col.notNull())
    .addColumn("key_points_json", "text", (col) => col.notNull().defaultTo("[]"))
    .addColumn("selected", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "text", (col) => col.notNull())
    .addColumn("version", "integer")
    .addColumn("version_id", "text")
    .addColumn("supersedes", "text")
    .addColumn("duplicate_of", "text")
    .addColumn("annotations_json", "text")
    .execute();

  await db.schema
    .createIndex("idx_candidate_units_job")
    .ifNotExists()
    .on("candidate_units")
    .column("job_id")
    .execute();

  // Safely alter candidate_units if already existing
  const candidateCols = ["annotated_id", "version", "version_id", "supersedes", "duplicate_of", "annotations_json"];
  for (const col of candidateCols) {
    try {
      await db.schema.alterTable("candidate_units").addColumn(col as any, col === "version" ? "integer" : "text").execute();
    } catch {}
  }

  // 5. drafts
  await db.schema
    .createTable("drafts")
    .ifNotExists()
    .addColumn("draft_id", "text", (col) => col.primaryKey())
    .addColumn("candidate_id", "text")
    .addColumn("source_doc_id", "text")
    .addColumn("unit_id", "text", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("proposed_text", "text", (col) => col.notNull())
    .addColumn("current_text", "text")
    .addColumn("candidate_type", "text", (col) => col.notNull().defaultTo("Policy"))
    .addColumn("verbatim", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("route_to", "text", (col) => col.notNull())
    .addColumn("owner_team", "text", (col) => col.notNull())
    .addColumn("knowledge_base", "text", (col) => col.notNull())
    .addColumn("effective_date", "text", (col) => col.notNull())
    .addColumn("tags_json", "text", (col) => col.notNull().defaultTo("[]"))
    .addColumn("proposed_by", "text", (col) => col.notNull())
    .addColumn("proposer_id", "text")
    .addColumn("status", "text", (col) => col.notNull().defaultTo("proposed"))
    .addColumn("reason", "text")
    .addColumn("decided_by", "text")
    .addColumn("gate_json", "text")
    .addColumn("history_json", "text", (col) => col.notNull().defaultTo("[]"))
    .addColumn("created_at", "text", (col) => col.notNull())
    .addColumn("updated_at", "text", (col) => col.notNull())
    .addColumn("version", "integer")
    .addColumn("version_id", "text")
    .addColumn("supersedes", "text")
    .addColumn("duplicate_of", "text")
    .addColumn("annotations_json", "text")
    .execute();

  // Safely alter drafts if already existing
  const draftCols = ["proposer_id", "version", "version_id", "supersedes", "duplicate_of", "annotations_json"];
  for (const col of draftCols) {
    try {
      await db.schema.alterTable("drafts").addColumn(col as any, col === "version" ? "integer" : "text").execute();
    } catch {}
  }

  try {
    await db.schema.alterTable("source_documents").addColumn("created_by_user_id", "text").execute();
  } catch {}

  // 6. published_units (authoritative persistent storage of approved & published knowledge)
  await db.schema
    .createTable("published_units")
    .ifNotExists()
    .addColumn("unit_id", "text", (col) => col.primaryKey())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("type", "text", (col) => col.notNull())
    .addColumn("body", "text", (col) => col.notNull())
    .addColumn("verbatim", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("spoken_version", "text")
    .addColumn("knowledge_base", "text", (col) => col.notNull())
    .addColumn("audience_json", "text", (col) => col.notNull().defaultTo("[]"))
    .addColumn("channels_json", "text", (col) => col.notNull().defaultTo("[]"))
    .addColumn("authority_level", "text", (col) => col.notNull().defaultTo("knowledge_article"))
    .addColumn("source_doc", "text", (col) => col.notNull())
    .addColumn("source_section", "text", (col) => col.notNull().defaultTo("Section 1"))
    .addColumn("effective_date", "text", (col) => col.notNull())
    .addColumn("review_date", "text", (col) => col.notNull())
    .addColumn("version", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("status", "text", (col) => col.notNull().defaultTo("approved"))
    .addColumn("supersedes", "text")
    .addColumn("synonyms_json", "text", (col) => col.notNull().defaultTo("[]"))
    .addColumn("owner", "text", (col) => col.notNull())
    .addColumn("approved_by", "text", (col) => col.notNull())
    .addColumn("applies_to_json", "text", (col) => col.notNull().defaultTo("{}"))
    .addColumn("created_at", "text", (col) => col.notNull())
    .addColumn("updated_at", "text", (col) => col.notNull())
    .execute();
}

