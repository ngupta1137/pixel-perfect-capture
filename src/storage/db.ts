import { Kysely, PostgresDialect } from "kysely";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import { Pool } from "pg";
import type { DatabaseSchema } from "./schema";
import { runMigrations } from "./migrations";
import * as fs from "node:fs";
import * as path from "node:path";

// Safe loading of local environment in Node runtime if process.env is unpopulated
try {
  if (typeof process !== "undefined" && typeof (process as any).loadEnvFile === "function") {
    try { (process as any).loadEnvFile(".env.local"); } catch {}
    try { (process as any).loadEnvFile(".env"); } catch {}
  }
} catch {}

let dbInstance: Kysely<DatabaseSchema> | null = null;
let migrationPromise: Promise<void> | null = null;
let activeDatabaseType: "postgres" | "sqlite" = "sqlite";

/**
 * Returns whether the database connection string is a valid non-placeholder URL.
 */
export function isConfiguredPostgresUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith("postgres://") && !trimmed.startsWith("postgresql://")) {
    return false;
  }
  // Detect placeholder strings
  if (
    trimmed.includes("your-project-ref") ||
    trimmed.includes("your-db-password") ||
    trimmed.includes("[YOUR-PASSWORD]") ||
    trimmed.includes("YOUR-PASSWORD") ||
    trimmed.includes("your-supabase") ||
    trimmed.includes("placeholder")
  ) {
    return false;
  }
  return true;
}

export function getDatabasePath(): string {
  // 1. Authoritative Supabase PostgreSQL
  const supabaseUrl = process.env["SUPABASE_DB_URL"] || process.env["DATABASE_URL"];
  if (isConfiguredPostgresUrl(supabaseUrl)) {
    return supabaseUrl!.trim();
  }

  // If SUPABASE_DB_URL is explicitly set to an unparseable/broken non-placeholder string, fail fast
  if (supabaseUrl && supabaseUrl.trim() && !isConfiguredPostgresUrl(supabaseUrl)) {
    const isPlaceholder =
      supabaseUrl.includes("your-project-ref") ||
      supabaseUrl.includes("your-db-password") ||
      supabaseUrl.includes("[YOUR-PASSWORD]") ||
      supabaseUrl.includes("YOUR-PASSWORD") ||
      supabaseUrl.includes("your-supabase") ||
      supabaseUrl.includes("placeholder");
    if (!isPlaceholder) {
      throw new Error(
        "Invalid SUPABASE_DB_URL format. Must be a valid postgresql:// connection string."
      );
    }
  }

  // 2. Explicit SQLite override
  const verityDbUrl = process.env["VERITY_DB_URL"];
  if (verityDbUrl) {
    return verityDbUrl;
  }

  // 3. Default local SQLite file (.data/verity.db)
  const baseDir = process.env.VERCEL ? "/tmp" : process.cwd();
  const defaultDir = path.resolve(baseDir, ".data");
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return `file:${path.join(defaultDir, "verity.db").replace(/\\/g, "/")}`;
}

export function createDatabaseClient(url?: string): Kysely<DatabaseSchema> {
  const targetUrl = url || getDatabasePath();

  if (targetUrl.startsWith("postgres://") || targetUrl.startsWith("postgresql://")) {
    activeDatabaseType = "postgres";
    const pool = new Pool({
      connectionString: targetUrl,
      max: 10,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    // Handle pool errors gracefully without exposing secrets
    pool.on("error", (err) => {
      console.error("Supabase PostgreSQL pool error:", err.message);
    });

    const dialect = new PostgresDialect({ pool });
    return new Kysely<DatabaseSchema>({ dialect });
  }

  // SQLite / LibSQL client
  activeDatabaseType = "sqlite";
  let dbUrl = targetUrl;
  if (
    dbUrl !== ":memory:" &&
    !dbUrl.includes("://") &&
    !dbUrl.startsWith("file:")
  ) {
    dbUrl = `file:${dbUrl.replace(/\\/g, "/")}`;
  }

  const dialect = new LibsqlDialect({
    url: dbUrl,
  });

  return new Kysely<DatabaseSchema>({
    dialect,
  });
}

export async function closeDatabaseClient(db: Kysely<DatabaseSchema>): Promise<void> {
  await db.destroy();
}

export function getDatabaseType(): "postgres" | "sqlite" {
  return activeDatabaseType;
}

export async function getDb(): Promise<Kysely<DatabaseSchema>> {
  if (!dbInstance) {
    dbInstance = createDatabaseClient();
    migrationPromise = runMigrations(dbInstance);
  }
  if (migrationPromise) {
    await migrationPromise;
    migrationPromise = null;
  }
  return dbInstance;
}

/** Reset database instance (primarily for tests) */
export async function closeDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
    migrationPromise = null;
  }
}
