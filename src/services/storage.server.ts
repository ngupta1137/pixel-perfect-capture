import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { calculateSha256 } from "./ingestion/hasher";


export const VERITY_STORAGE_BUCKET =
  process.env["SUPABASE_STORAGE_BUCKET"] || "verity-source-documents";

let storageClientInstance: SupabaseClient | null = null;

function isValidKey(k?: string): boolean {
  if (!k) return false;
  const trimmed = k.trim();
  return (
    !trimmed.includes("placeholder") &&
    !trimmed.includes("your-supabase") &&
    !trimmed.includes("YOUR-")
  );
}

export function getStorageClient(): SupabaseClient | null {
  const url =
    process.env["SUPABASE_URL"] ||
    process.env["NEXT_PUBLIC_SUPABASE_URL"] ||
    (typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env as any)["VITE_SUPABASE_URL"]
      : undefined);

  const candidateKeys = [
    process.env["SUPABASE_SERVICE_ROLE_KEY"],
    process.env["SUPABASE_ANON_KEY"],
    process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
    typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env as any)["VITE_SUPABASE_ANON_KEY"]
      : undefined,
  ];

  const key = candidateKeys.find(isValidKey);

  if (!url || !key || url.includes("placeholder") || url.includes("your-project-ref")) {
    return null;
  }

  if (!storageClientInstance) {
    class DummyTransport {}
    storageClientInstance = createClient(url, key, {
      auth: { persistSession: false },
      realtime: { transport: DummyTransport as any },
    });
  }

  return storageClientInstance;
}

/**
 * Checks whether the private storage bucket exists, creating it if necessary.
 */
export async function ensureStorageBucket(
  bucketName = VERITY_STORAGE_BUCKET
): Promise<{ ok: boolean; exists?: boolean; message?: string }> {
  const client = getStorageClient();
  if (!client) {
    return { ok: false, message: "Supabase client unconfigured or credentials missing." };
  }

  try {
    const { data: buckets, error: listError } = await client.storage.listBuckets();
    if (listError) {
      return { ok: false, message: `Failed to list storage buckets: ${listError.message}` };
    }

    const exists = buckets?.some((b) => b.name === bucketName);
    if (exists) {
      return { ok: true, exists: true };
    }

    const { error: createError } = await client.storage.createBucket(bucketName, {
      public: false,
      fileSizeLimit: 52428800, // 50MB
    });

    if (createError) {
      return {
        ok: false,
        exists: false,
        message: `Bucket "${bucketName}" not found. Auto-creation failed (${createError.message}). Please create the private bucket "${bucketName}" in the Supabase Dashboard or provide SUPABASE_SERVICE_ROLE_KEY.`,
      };
    }

    return { ok: true, exists: true };
  } catch (err: any) {
    return { ok: false, message: err.message || "Storage bucket verification error." };
  }
}

export interface UploadFileOptions {
  docId: string;
  fileName: string;
  buffer: Buffer;
  mimeType: string;
  ownerTeam?: string;
  bucketName?: string;
}

export interface UploadFileResult {
  ok: boolean;
  storageBucket?: string;
  storagePath?: string;
  contentHash?: string;
  fileSize?: number;
  error?: string;
}

/**
 * Uploads a source document file durably to the private Supabase Storage bucket.
 */
export async function uploadSourceFileToStorage(
  opts: UploadFileOptions
): Promise<UploadFileResult> {
  const client = getStorageClient();
  if (!client) {
    return { ok: false, error: "Supabase storage is not configured." };
  }

  const bucket = opts.bucketName || VERITY_STORAGE_BUCKET;
  const contentHash = calculateSha256(opts.buffer);
  const cleanTeam = (opts.ownerTeam || "general").replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
  const cleanDocId = opts.docId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const cleanFileName = opts.fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const storagePath = `sources/${cleanTeam}/${cleanDocId}/${cleanFileName}`;

  try {
    await ensureStorageBucket(bucket);

    const { error: uploadError } = await client.storage
      .from(bucket)
      .upload(storagePath, opts.buffer, {
        contentType: opts.mimeType,
        upsert: false, // Do not silently overwrite existing files
      });

    if (uploadError && !uploadError.message.includes("already exists")) {
      return { ok: false, error: uploadError.message };
    }

    return {
      ok: true,
      storageBucket: bucket,
      storagePath,
      contentHash,
      fileSize: opts.buffer.length,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Upload to Supabase Storage failed." };
  }
}

/**
 * Generates a short-lived signed URL for authorized viewing/downloading of a source document.
 */
export async function getSignedSourceFileUrl(
  storagePath: string,
  expiresInSeconds = 900,
  bucketName = VERITY_STORAGE_BUCKET
): Promise<{ ok: boolean; signedUrl?: string; error?: string }> {
  const client = getStorageClient();
  if (!client) {
    return { ok: false, error: "Supabase storage client not available." };
  }

  try {
    const { data, error } = await client.storage
      .from(bucketName)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return { ok: false, error: error?.message || "Failed to generate signed URL." };
    }

    return { ok: true, signedUrl: data.signedUrl };
  } catch (err: any) {
    return { ok: false, error: err.message || "Error generating signed URL." };
  }
}

/**
 * Downloads a stored source file buffer from Supabase Storage.
 */
export async function downloadSourceFileFromStorage(
  storagePath: string,
  bucketName = VERITY_STORAGE_BUCKET
): Promise<{ ok: boolean; buffer?: Buffer; error?: string }> {
  const client = getStorageClient();
  if (!client) {
    return { ok: false, error: "Supabase storage client not available." };
  }

  try {
    const { data, error } = await client.storage
      .from(bucketName)
      .download(storagePath);

    if (error || !data) {
      return { ok: false, error: error?.message || "Failed to download file from storage." };
    }

    const arrayBuffer = await data.arrayBuffer();
    return { ok: true, buffer: Buffer.from(arrayBuffer) };
  } catch (err: any) {
    return { ok: false, error: err.message || "Error downloading file from storage." };
  }
}
