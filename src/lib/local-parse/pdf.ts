import fs from 'node:fs';
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

  const standardFontDataUrl = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts/');
  const hasFonts = fs.existsSync(standardFontDataUrl);

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    disableFontFace: true,
    ...(hasFonts ? { standardFontDataUrl } : {}),
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
