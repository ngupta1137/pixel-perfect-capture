import { extractText } from "unpdf";
import mammoth from "mammoth";

export interface ParsedDocument {
  rawText: string;
  detectedFormat: "pdf" | "docx" | "md" | "txt";
  fileSize: number;
  totalPages: number;
  pages: { pageNumber: number; text: string }[];
  warnings: string[];
}

export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB limit

export type ParseDocumentInput =
  | string
  | {
      fileName?: string;
      filename?: string;
      buffer: Uint8Array | Buffer;
      mimeType?: string;
    };

export async function parseDocument(
  fileNameOrInput: ParseDocumentInput,
  maybeBuffer?: Uint8Array | Buffer
): Promise<ParsedDocument> {
  let fileName: string;
  let buffer: Uint8Array | Buffer;

  if (typeof fileNameOrInput === "object" && fileNameOrInput !== null) {
    fileName = fileNameOrInput.fileName || fileNameOrInput.filename || "document.txt";
    buffer = fileNameOrInput.buffer;
  } else {
    fileName = fileNameOrInput;
    buffer = maybeBuffer!;
  }

  const fileSize = buffer?.byteLength ?? 0;
  if (fileSize === 0) {
    throw new Error(`Document "${fileName}" is empty (0 bytes).`);
  }
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(
      `Document "${fileName}" exceeds the maximum allowed file size of 15MB (${(
        fileSize /
        (1024 * 1024)
      ).toFixed(2)}MB). File size exceeds maximum allowed limit.`
    );
  }

  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (ext === "txt" || ext === "md") {
    const decoder = new TextDecoder("utf-8");
    const rawText = decoder.decode(buffer);
    if (!rawText.trim()) {
      throw new Error(`Text document "${fileName}" contains no readable content.`);
    }

    return {
      rawText,
      detectedFormat: ext === "md" ? "md" : "txt",
      fileSize,
      totalPages: 1,
      pages: [{ pageNumber: 1, text: rawText }],
      warnings: [],
    };
  }

  if (ext === "pdf") {
    try {
      const pdfData = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
      const result = await extractText(pdfData, { mergePages: false });
      const pageTexts: string[] = Array.isArray(result.text)
        ? result.text
        : [String(result.text || "")];

      const pages = pageTexts.map((text, idx) => ({
        pageNumber: idx + 1,
        text: text.trim(),
      }));

      const fullText = pages
        .map((p) => `[Page ${p.pageNumber}]\n${p.text}`)
        .join("\n\n");

      if (!fullText.replace(/\[Page \d+\]/g, "").trim()) {
        throw new Error(
          `PDF document "${fileName}" contains no extractable text. It may be encrypted, password-protected, or contain scanned images without OCR.`
        );
      }

      return {
        rawText: fullText,
        detectedFormat: "pdf",
        fileSize,
        totalPages: result.totalPages || pages.length,
        pages,
        warnings: [],
      };
    } catch (err: any) {
      if (err.message && err.message.includes("contains no extractable text")) {
        throw err;
      }
      throw new Error(
        `PDF parsing error on "${fileName}": ${err.message || "Malformed or unsupported PDF structure"}.`
      );
    }
  }

  if (ext === "docx") {
    try {
      const nodeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
      const result = await mammoth.convertToMarkdown({ buffer: nodeBuffer });
      const rawText = (result.value || "").trim();

      if (!rawText) {
        throw new Error(`Word document "${fileName}" is empty or has no extractable text.`);
      }

      const warnings = (result.messages || []).map((m: any) => m.message);

      return {
        rawText,
        detectedFormat: "docx",
        fileSize,
        totalPages: 1,
        pages: [{ pageNumber: 1, text: rawText }],
        warnings,
      };
    } catch (err: any) {
      if (err.message && err.message.includes("empty or has no extractable text")) {
        throw err;
      }
      throw new Error(
        `DOCX parsing error on "${fileName}": ${err.message || "Corrupted or password-protected DOCX"}.`
      );
    }
  }

  throw new Error(
    `Unsupported document format ".${ext}" for document "${fileName}". Supported formats are PDF, DOCX, Markdown (.md), and Plain Text (.txt).`
  );
}
