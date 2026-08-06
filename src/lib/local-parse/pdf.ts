import path from 'node:path';
import type { PositionedItem } from './types';

/**
 * Extracts every text run in a PDF along with its position, using pdfjs-dist's
 * real text layer (works well for PDFs generated from Word/Excel/a web page —
 * i.e. almost every officially published university schedule). This does nothing
 * useful for a scanned/photographed PDF with no text layer; use image.ts (OCR)
 * for that case instead.
 */
export async function extractPdfText(buffer: Buffer): Promise<PositionedItem[]> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Deliberately NOT require.resolve('pdfjs-dist/...') here: bundlers (webpack, at
  // least) statically rewrite require.resolve() call sites into a build-time module
  // id number rather than leaving them for Node to resolve at runtime, even when the
  // target package is marked external — which silently breaks this into `path.join(
  // <a number>, ...)`. Building the path by hand from process.cwd() sidesteps that
  // rewrite entirely, at the cost of assuming a conventional node_modules layout.
  const standardFontDataUrl = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts/');

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    disableFontFace: true,
    standardFontDataUrl,
  });
  const pdf = await loadingTask.promise;

  const items: PositionedItem[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    for (const raw of content.items) {
      if (!('str' in raw) || !raw.str.trim()) continue;
      const transform = raw.transform as number[];
      items.push({
        text: raw.str,
        x: transform[4] ?? 0,
        y: transform[5] ?? 0,
        page: pageNum,
      });
    }
    await page.cleanup();
  }
  await loadingTask.destroy();
  return items;
}
