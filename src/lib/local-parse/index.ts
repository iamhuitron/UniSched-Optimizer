import type { ScheduleDataset } from '../types';
import { extractPdfText } from './pdf';
import { extractImageText } from './image';
import { tableToDataset } from './table-to-dataset';
import type { ParseWarning } from './types';

export interface LocalExtractResult {
  dataset: ScheduleDataset;
  warnings: ParseWarning[];
}

/**
 * Reads a schedule PDF or image entirely locally — no external API, no API key.
 * PDFs go through their real text layer (pdfjs-dist); images go through OCR
 * (tesseract.js). Both funnel into the same geometric table-reconstruction
 * heuristic, so accuracy depends heavily on how closely the source document
 * matches the Clave/Asignatura/Cr/Grupo/Aula/Profesor/Lun-Sáb layout this was
 * built and tested against — see table-to-dataset.ts for the details, and the
 * README for what to do when a new document's layout doesn't match.
 */
export async function extractScheduleLocally(
  buffer: Buffer,
  mimeType: string,
  opts: { institution?: string } = {}
): Promise<LocalExtractResult> {
  const isPdf = mimeType === 'application/pdf';
  const items = isPdf ? await extractPdfText(buffer) : await extractImageText(buffer);
  return tableToDataset(items, opts);
}
