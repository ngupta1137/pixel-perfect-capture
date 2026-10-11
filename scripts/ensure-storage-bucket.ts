import pg from "pg";

try {
  process.loadEnvFile(".env.local");
} catch {}
try {
  process.loadEnvFile(".env");
} catch {}

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("SUPABASE_DB_URL is not set.");
  process.exit(1);
}

async function ensureBucket() {
  const sanitizedUrl = dbUrl.trim().replace("sslmode=require", "sslmode=no-verify");
  const client = new pg.Client({
    connectionString: sanitizedUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    // 1. Check if bucket exists
    const checkRes = await client.query(
      "SELECT id, name, public FROM storage.buckets WHERE id = 'verity-source-documents';"
    );

    if (checkRes.rows.length > 0) {
      console.log("Bucket already exists:", checkRes.rows[0]);
    } else {
      const insertRes = await client.query(
        `INSERT INTO storage.buckets (id, name, public, file_size_limit)
         VALUES ('verity-source-documents', 'verity-source-documents', false, 52428800)
         RETURNING id, name, public;`
      );
      console.log("Created private bucket in storage.buckets:", insertRes.rows[0]);
    }

    console.log("Bucket verification complete.");
  } catch (err: any) {
    console.error("Failed to ensure storage bucket:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

ensureBucket();
