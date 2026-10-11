import { createClient } from "@supabase/supabase-js";
import pg from "pg";

// 1. Safe environment loading without external dependencies
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

interface PreflightResult {
  configured: boolean;
  connected: boolean;
  dbIdentity?: {
    database: string;
    user: string;
    version: string;
  };
  tablesFound: string[];
  expectedVerityTables: {
    table: string;
    exists: boolean;
    rowCount?: number;
  }[];
  storage: {
    configured: boolean;
    bucketExists: boolean;
    bucketList: string[];
    details?: string;
  };
  diagnostics: string[];
}

const EXPECTED_TABLES = [
  "source_documents",
  "source_files",
  "ingestion_jobs",
  "candidate_units",
  "drafts",
  "published_units",
];

function isPlaceholderUrl(url: string): { isPlaceholder: boolean; reason?: string } {
  if (!url || !url.trim()) {
    return { isPlaceholder: true, reason: "SUPABASE_DB_URL is not set." };
  }
  const trimmed = url.trim();
  if (!trimmed.startsWith("postgres://") && !trimmed.startsWith("postgresql://")) {
    return { isPlaceholder: true, reason: "SUPABASE_DB_URL does not start with postgresql:// or postgres://" };
  }
  if (trimmed.includes("[YOUR-PASSWORD]") || trimmed.includes("YOUR-PASSWORD") || trimmed.includes("your-db-password")) {
    return { isPlaceholder: true, reason: "Contains unreplaced password placeholder ([YOUR-PASSWORD])." };
  }
  if (trimmed.includes("your-project-ref") || trimmed.includes("your-project")) {
    return { isPlaceholder: true, reason: "Contains unreplaced project reference placeholder ('your-project-ref')." };
  }
  if (trimmed.includes("placeholder")) {
    return { isPlaceholder: true, reason: "Contains 'placeholder' marker." };
  }
  return { isPlaceholder: false };
}

function maskHost(url: string): string {
  try {
    const atParts = url.split("@");
    if (atParts.length > 1) {
      const hostPart = atParts[1]!.split("/")[0]!;
      return hostPart;
    }
  } catch {}
  return "hidden-host";
}

export async function runSupabasePreflight(): Promise<PreflightResult> {
  const result: PreflightResult = {
    configured: false,
    connected: false,
    tablesFound: [],
    expectedVerityTables: EXPECTED_TABLES.map((t) => ({ table: t, exists: false })),
    storage: {
      configured: false,
      bucketExists: false,
      bucketList: [],
    },
    diagnostics: [],
  };

  const rawDbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || "";
  const placeholderCheck = isPlaceholderUrl(rawDbUrl);

  // 1. Check DB Configuration
  if (placeholderCheck.isPlaceholder) {
    result.configured = false;
    result.diagnostics.push(`Database connection status: NOT CONFIGURED (${placeholderCheck.reason})`);
    result.diagnostics.push(
      "Action required: Update SUPABASE_DB_URL in .env with your real Supabase PostgreSQL connection string (Transaction pooler on port 6543 or Session pooler on port 5432)."
    );
  } else {
    result.configured = true;
    const sanitizedUrl = rawDbUrl.trim().replace("sslmode=require", "sslmode=no-verify");
    const client = new pg.Client({
      connectionString: sanitizedUrl,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      result.connected = true;

      // Identity query
      const idRes = await client.query(
        "SELECT current_database() as database, current_user as user, version() as version;"
      );
      if (idRes.rows[0]) {
        result.dbIdentity = {
          database: idRes.rows[0].database,
          user: idRes.rows[0].user,
          version: idRes.rows[0].version.split(",")[0] || idRes.rows[0].version.slice(0, 40),
        };
      }

      // Read-only inspection of public tables
      const tablesRes = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
      );
      result.tablesFound = tablesRes.rows.map((r: any) => r.table_name);

      // Check each expected Verity table and read row count if present
      for (const expected of result.expectedVerityTables) {
        if (result.tablesFound.includes(expected.table)) {
          expected.exists = true;
          try {
            // Safe parameterized identifier count
            const countRes = await client.query(`SELECT COUNT(*) as count FROM public."${expected.table}";`);
            expected.rowCount = parseInt(countRes.rows[0]?.count ?? "0", 10);
          } catch {
            expected.rowCount = 0;
          }
        }
      }
    } catch (err: any) {
      result.connected = false;
      result.diagnostics.push(`Database connection error: ${err.message}`);
    } finally {
      await client.end().catch(() => {});
    }
  }

  // 2. Storage Check (Read-Only)
  const storageUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const candidateKeys = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ];

  const storageKey = candidateKeys.find(
    (k) => k && !k.includes("placeholder") && !k.includes("your-supabase") && !k.includes("YOUR-")
  );

  const isStorageValid =
    storageUrl &&
    storageKey &&
    !storageUrl.includes("placeholder") &&
    !storageUrl.includes("your-project-ref");

  if (isStorageValid) {
    result.storage.configured = true;
    try {
      const supa = createClient(storageUrl, storageKey, { auth: { persistSession: false } });
      const { data: buckets, error } = await supa.storage.listBuckets();
      if (error) {
        result.storage.details = `Storage listing error: ${error.message}`;
      } else if (Array.isArray(buckets)) {
        result.storage.bucketList = buckets.map((b) => b.name);
        result.storage.bucketExists = result.storage.bucketList.includes("verity-source-documents");
      }
    } catch (err: any) {
      result.storage.details = `Storage client exception: ${err.message}`;
    }
  } else {
    result.storage.details = "Supabase Storage credentials are missing or set to placeholders.";
  }

  return result;
}

// Execute preflight if run as CLI script
if (process.argv[1]?.endsWith("preflight-supabase.ts") || process.argv[1]?.endsWith("preflight-supabase.js")) {
  console.log("=================================================");
  console.log("   Verity — Safe Supabase Preflight Verification  ");
  console.log("=================================================\n");

  runSupabasePreflight()
    .then((res) => {
      console.log(`[Database Configuration] : ${res.configured ? "CONFIGURED" : "UNCONFIGURED"}`);
      console.log(`[Database Reachability]    : ${res.connected ? "CONNECTED (LIVE)" : "NOT CONNECTED"}`);

      if (res.dbIdentity) {
        console.log(`  - Database Name         : ${res.dbIdentity.database}`);
        console.log(`  - Database User         : ${res.dbIdentity.user}`);
        console.log(`  - Database Version      : ${res.dbIdentity.version}`);
      }

      console.log("\n[Public Schema Tables Status]");
      if (res.connected) {
        console.log(`  Total tables in public schema: ${res.tablesFound.length}`);
        if (res.tablesFound.length > 0) {
          console.log(`  Existing tables: ${res.tablesFound.join(", ")}`);
        } else {
          console.log("  Notice: No tables found in public schema (clean instance).");
        }

        console.log("\n[Verity Expected Core Tables]");
        for (const item of res.expectedVerityTables) {
          const status = item.exists ? `EXISTS (${item.rowCount} rows)` : "MISSING";
          console.log(`  - ${item.table.padEnd(20)}: ${status}`);
        }
      } else {
        console.log("  (Cannot inspect tables: database connection not established)");
      }

      console.log("\n[Supabase Storage Status]");
      console.log(`  - Storage Client        : ${res.storage.configured ? "CONFIGURED" : "UNCONFIGURED"}`);
      console.log(
        `  - Private Bucket        : ${
          res.storage.bucketExists ? "FOUND ('verity-source-documents')" : "NOT FOUND"
        }`
      );
      if (res.storage.bucketList.length > 0) {
        console.log(`  - Available Buckets     : ${res.storage.bucketList.join(", ")}`);
      }
      if (res.storage.details) {
        console.log(`  - Storage Details       : ${res.storage.details}`);
      }

      if (res.diagnostics.length > 0) {
        console.log("\n[Preflight Diagnostics & Guidance]");
        for (const d of res.diagnostics) {
          console.log(`  * ${d}`);
        }
      }

      console.log("\n=================================================");
      if (!res.connected) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("\nUnexpected preflight error:", err.message);
      process.exit(1);
    });
}
