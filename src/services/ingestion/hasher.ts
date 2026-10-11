import { createHash } from "node:crypto";

/**
 * Synchronous SHA-256 calculation using node:crypto (server-side Node / Nitro runtime).
 */
export function calculateSha256(bytes: Uint8Array | Buffer | string): string {
  const hash = createHash("sha256");
  if (typeof bytes === "string") {
    hash.update(bytes, "utf8");
  } else {
    hash.update(bytes);
  }
  return hash.digest("hex");
}

/**
 * Runtime-compatible SHA-256 calculation supporting both node:crypto
 * and standard Web Crypto (crypto.subtle) across edge/worker runtimes.
 */
export async function calculateSha256Async(bytes: Uint8Array | Buffer | string): Promise<string> {
  try {
    return calculateSha256(bytes);
  } catch (err) {
    if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
      const data: Uint8Array<ArrayBuffer> =
        typeof bytes === "string"
          ? new TextEncoder().encode(bytes)
          : Uint8Array.from(bytes);
      const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    throw err;
  }
}

export const computeSha256 = calculateSha256;
