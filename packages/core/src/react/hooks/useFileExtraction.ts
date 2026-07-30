"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function cleanText(text: string): string {
  return text
    .replace(/\x00/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}

export interface UseFileExtractionReturn {
  /** True once PDF.js worker has been initialised and is ready. */
  isPDFReady: boolean;
  /**
   * Extracts plain text from a `File`. Supports PDF (pdfjs-dist), DOCX (mammoth),
   * and any plain-text format. Falls back gracefully when optional deps are absent.
   */
  extractText: (file: File) => Promise<string>;
}

const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/html",
  "text/csv",
  "text/markdown",
  "application/json",
]);

/**
 * Client-side text extraction hook.
 *
 * Lazily loads `pdfjs-dist` and `mammoth` via dynamic imports — neither is
 * bundled into the initial JS chunk. Both packages are optional: if they are
 * not installed, extraction falls back to a human-readable placeholder string.
 */
export function useFileExtraction(): UseFileExtractionReturn {
  const [isPDFReady, setIsPDFReady] = useState(false);
  // Use a ref so the extractText callback always reads the latest value
  // without needing to be re-created every time the state toggles.
  const isPDFReadyRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    import("pdfjs-dist")
      .then((pdfjsLib) => {
        // Use the installed package's worker via webpack 5 / Turbopack asset URL.
        // new URL(specifier, import.meta.url) is statically analyzed by webpack so
        // the worker file gets bundled as an asset — no CDN dependency at runtime.
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url,
          ).href;
        } catch {
          // Non-webpack environment (e.g. Jest, plain Node): fall back to CDN.
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        }
        isPDFReadyRef.current = true;
        setIsPDFReady(true);
      })
      .catch(() => {
        // pdfjs-dist not installed — PDF extraction will fail gracefully
      });
  }, []);

  const extractText = useCallback(async (file: File): Promise<string> => {
    const { type } = file;

    // Plain-text types — read directly
    if (TEXT_MIME_TYPES.has(type)) {
      return cleanText(await file.text());
    }

    // PDF via pdfjs-dist
    if (type === "application/pdf") {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        if (!isPDFReadyRef.current) {
          try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
              "pdfjs-dist/build/pdf.worker.min.mjs",
              import.meta.url,
            ).href;
          } catch {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
          }
          isPDFReadyRef.current = true;
        }
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText +=
            (content.items as Array<{ str?: string }>)
              .map((item) => item.str ?? "")
              .join(" ") + "\n";
        }
        return cleanText(fullText);
      } catch (err) {
        console.warn("[useFileExtraction] PDF extraction failed:", err);
        return `[Could not extract text from ${file.name}. Please paste the content manually.]`;
      }
    }

    // DOCX via mammoth
    if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        return cleanText(result.value);
      } catch (err) {
        console.warn("[useFileExtraction] DOCX extraction failed:", err);
        return `[Could not extract text from ${file.name}. Please paste the content manually.]`;
      }
    }

    if (type === "application/msword") {
      return `[Legacy .doc format is not supported. Please convert ${file.name} to .docx or .pdf.]`;
    }

    // Generic fallback: try plain-text read
    try {
      return cleanText(await file.text());
    } catch {
      return `[Could not read ${file.name}.]`;
    }
  }, []);

  return { isPDFReady, extractText };
}
