/** A single piece of text with its position on a page, regardless of whether it came
 *  from a PDF's real text layer or from OCR on an image. This is the common interface
 *  both extraction backends (pdf.ts, image.ts) produce, so the table-reconstruction
 *  heuristic in table-to-dataset.ts only has to be written — and tested — once. */
export interface PositionedItem {
  text: string;
  /** left edge, in the source's own coordinate space (points for PDF, pixels for OCR) */
  x: number;
  /** vertical position, in the source's own coordinate space */
  y: number;
  page: number;
}

export interface ParseWarning {
  page: number;
  message: string;
}

export interface LocalParseResult {
  items: PositionedItem[];
  warnings: ParseWarning[];
}
