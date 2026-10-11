import * as fs from "node:fs";
import * as path from "node:path";
import pg from "pg";

try {
  process.loadEnvFile(".env.local");
} catch {}
try {
  process.loadEnvFile(".env");
} catch {}

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("Error: SUPABASE_DB_URL is not set.");
  process.exit(1);
}

async function applyMigration() {
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase",
    "migrations",
    "20261012000000_verity_core_schema.sql"
  );

  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found at ${migrationPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(migrationPath, "utf8");
  console.log("Applying PostgreSQL core schema migration...");

  const sanitizedUrl = dbUrl.trim().replace("sslmode=require", "sslmode=no-verify");
  const client = new pg.Client({
    connectionString: sanitizedUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    await client.query("BEGIN;");
    await client.query(sqlContent);
    await client.query("COMMIT;");
    console.log("Migration SQL applied successfully.");

    // Verify all 6 tables exist in public schema
    const res = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    const tables = res.rows.map((r: any) => r.table_name);
    console.log("Public schema tables now:", tables);

    const required = [
      "source_documents",
      "source_files",
      "ingestion_jobs",
      "candidate_units",
      "drafts",
      "published_units",
    ];

    const missing = required.filter((t) => !tables.includes(t));
    if (missing.length > 0) {
      throw new Error(`Verification failed: missing tables [${missing.join(", ")}]`);
    }

    console.log("All 6 Verity core tables verified in destination database.");
  } catch (err: any) {
    await client.query("ROLLBACK;").catch(() => {});
    console.error("Migration execution failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
