import { Kysely } from "kysely";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import type { DatabaseSchema } from "./schema";
import { runMigrations } from "./migrations";
import * as fs from "node:fs";
import * as path from "node:path";

let dbInstance: Kysely<DatabaseSchema> | null = null;
let migrationPromise: Promise<void> | null = null;

export function getDatabasePath(): string {
  if (process.env.VERITY_DB_URL) {
    return process.env.VERITY_DB_URL;
  }
  const defaultDir = path.resolve(process.cwd(), ".data");
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return `file:${path.join(defaultDir, "verity.db").replace(/\\/g, "/")}`;
}

export function createDatabaseClient(url?: string): Kysely<DatabaseSchema> {
  let dbUrl = url || getDatabasePath();
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
