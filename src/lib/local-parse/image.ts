import path from 'node:path';
import { createWorker } from 'tesseract.js';
import type { PositionedItem } from './types';

/**
 * Extracts positioned words from an image using OCR — no external API, but
 * meaningfully less reliable than the PDF text-layer path: recognition errors,
 * skew, and low scan quality all directly become wrong or missing table cells.
 * This is the path a photographed or scanned horario has to go through, since
 * it has no real text layer to read.
 */
export async function extractImageText(buffer: Buffer): Promise<PositionedItem[]> {
  // See the comment in pdf.ts: built by hand rather than via require.resolve()
  // because a bundler can rewrite that into a build-time module id instead of a
  // real path, even for a package marked external.
  const langDataPath = path.join(process.cwd(), 'node_modules', '@tesseract.js-data', 'spa', '4.0.0');

  const worker = await createWorker('spa', undefined, { langPath: langDataPath, cacheMethod: 'none' });
  try {
    // `blocks: true` is required — tesseract.js does not return per-word bounding
    // boxes at all unless explicitly asked for the full block/paragraph/line/word tree
    const { data } = await worker.recognize(buffer, {}, { blocks: true });
    const items: PositionedItem[] = [];
    for (const block of data.blocks ?? []) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          for (const word of line.words) {
            const text = word.text.trim();
            if (!text) continue;
            items.push({ text, x: word.bbox.x0, y: word.bbox.y0, page: 1 });
          }
        }
      }
    }
    return items;
  } finally {
    await worker.terminate();
  }
}
