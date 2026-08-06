import type { ScheduleDataset, Subject, Section, TimeBlock, DayIndex } from '../types';
import type { ParseWarning, PositionedItem } from './types';

/**
 * Turns raw positioned text into a ScheduleDataset by reconstructing the table
 * structure geometrically: cluster text into rows by y-proximity, find the header
 * row to anchor column boundaries by x-position, assign every other row's text to
 * the nearest column, then interpret each row as a subject/section/time-block.
 *
 * This is inherently a heuristic over a visual layout, not a real table parser —
 * it will do reasonably well on a clean, text-based PDF with a stable single-header
 * table, and considerably worse on multi-page documents with repeated headers,
 * scanned/photographed tables (OCR noise), or layouts that don't match the
 * Clave/Asignatura/Cr/Grupo/Aula/Profesor/Lun-Sáb column order this was built
 * against. Treat its output as a first draft the student should double check,
 * not a guaranteed-correct extraction.
 */

const HEADER_ALIASES: Record<string, string> = {
  clave: 'code',
  asignatura: 'name',
  materia: 'name',
  cr: 'credits',
  creditos: 'credits',
  créditos: 'credits',
  grupo: 'group',
  aula: 'room',
  profesor: 'professor',
  lunes: 'day0',
  martes: 'day1',
  miercoles: 'day2',
  miércoles: 'day2',
  jueves: 'day3',
  viernes: 'day4',
  sabado: 'day5',
  sábado: 'day5',
};

const DAY_COLUMN_TO_INDEX: Record<string, DayIndex> = {
  day0: 0,
  day1: 1,
  day2: 2,
  day3: 3,
  day4: 4,
  day5: 5,
};

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // strip accents so "Miércoles"/"miercoles" both match
}

interface Row {
  page: number;
  y: number;
  items: PositionedItem[];
}

/** Cluster items into rows by y-proximity. `tolerance` is in the same units as y. */
function clusterRows(items: PositionedItem[], tolerance: number): Row[] {
  const byPage = new Map<number, PositionedItem[]>();
  for (const item of items) {
    const list = byPage.get(item.page) ?? [];
    list.push(item);
    byPage.set(item.page, list);
  }

  const rows: Row[] = [];
  for (const [page, pageItems] of byPage) {
    const sorted = [...pageItems].sort((a, b) => a.y - b.y);
    let current: PositionedItem[] = [];
    let currentY = -Infinity;
    for (const item of sorted) {
      if (current.length === 0 || Math.abs(item.y - currentY) <= tolerance) {
        current.push(item);
        currentY = current.reduce((sum, i) => sum + i.y, 0) / current.length;
      } else {
        rows.push({ page, y: currentY, items: current });
        current = [item];
        currentY = item.y;
      }
    }
    if (current.length > 0) rows.push({ page, y: currentY, items: current });
  }
  return rows;
}

interface ColumnAnchor {
  key: string;
  x: number;
}

function findHeaderRow(rows: Row[]): { row: Row; anchors: ColumnAnchor[] } | null {
  for (const row of rows) {
    const itemXs = Array.from(new Set(row.items.map((i) => i.x))).sort((a, b) => a - b);
    const typicalGap = medianGap(itemXs) ?? 40;

    const anchors: ColumnAnchor[] = [];
    for (const item of row.items) {
      // a header item is usually a single word ("Lunes"), but the same adjacent-merge
      // artifact that affects data cells can join two header words into one item
      // ("Miercoles Jueves") — check each token, not just the whole string, or the
      // second (and any later) column silently gets no anchor at all. Spread merged
      // tokens out across the gap to the next header item instead of stacking them on
      // the same x, so the two merged columns stay distinguishable from each other.
      const tokens = item.text.split(/\s+/).filter((t) => HEADER_ALIASES[normalize(t)]);
      if (tokens.length === 0) continue;
      const nextItemX = itemXs.find((x) => x > item.x);
      const span = (nextItemX ?? item.x + typicalGap) - item.x;
      tokens.forEach((token, i) => {
        const key = HEADER_ALIASES[normalize(token)]!;
        if (!anchors.some((a) => a.key === key)) {
          anchors.push({ key, x: item.x + (span * i) / tokens.length });
        }
      });
    }
    // require at least "code"/"name" plus at least two day columns to trust this as the real header
    const hasCore = anchors.some((a) => a.key === 'code' || a.key === 'name');
    const dayCount = anchors.filter((a) => DAY_COLUMN_TO_INDEX[a.key] !== undefined).length;
    if (hasCore && dayCount >= 2) {
      return { row, anchors: anchors.sort((a, b) => a.x - b.x) };
    }
  }
  return null;
}

function medianGap(sortedXs: number[]): number | null {
  if (sortedXs.length < 2) return null;
  const gaps = sortedXs.slice(1).map((x, i) => x - sortedXs[i]!);
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)] ?? null;
}

function assignColumn(x: number, anchors: ColumnAnchor[]): string {
  let best = anchors[0]!;
  let bestDist = Math.abs(x - best.x);
  for (const a of anchors) {
    const dist = Math.abs(x - a.x);
    if (dist < bestDist) {
      best = a;
      bestDist = dist;
    }
  }
  return best.key;
}

function cellsFromRow(row: Row, anchors: ColumnAnchor[]): Record<string, string> {
  const byColumn = new Map<string, string[]>();
  const sorted = [...row.items].sort((a, b) => a.x - b.x);
  for (const item of sorted) {
    const key = assignColumn(item.x, anchors);
    const list = byColumn.get(key) ?? [];
    list.push(item.text);
    byColumn.set(key, list);
  }
  const cells: Record<string, string> = {};
  for (const [key, parts] of byColumn) cells[key] = parts.join(' ').replace(/\s+/g, ' ').trim();
  return cells;
}

const TIME_RANGE = /(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/g;
const TIME_RANGE_SOLO = /\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/;

/**
 * pdfjs (and OCR) sometimes report two visually-adjacent cells as a single text
 * item — most often a long professor/subject name running right up against the
 * next column with no real gap, e.g. "Irene Correa Esquivel 10:00-12:00" coming
 * back as ONE item anchored at the professor column's x. Left alone this either
 * loses that day's time block entirely or corrupts the professor field with a
 * trailing time range. Detect a time pattern embedded (not at the very start of)
 * an item's text and split it into two items: the text before it stays put, and
 * the time range gets reassigned to whichever known column anchor sits just to
 * the right of this item's current one — the immediately-next column is the
 * overwhelmingly common case for this kind of overflow.
 */
function splitEmbeddedTimeRuns(rowItems: PositionedItem[], anchors: ColumnAnchor[]): PositionedItem[] {
  const sortedAnchors = [...anchors].sort((a, b) => a.x - b.x);
  const out: PositionedItem[] = [];
  for (const item of rowItems) {
    const match = TIME_RANGE_SOLO.exec(item.text);
    if (!match || match.index === 0) {
      out.push(item);
      continue;
    }
    const prefix = item.text.slice(0, match.index).trim();
    const timePart = item.text.slice(match.index).trim();
    if (prefix) out.push({ ...item, text: prefix });

    const ownColumn = assignColumn(item.x, sortedAnchors);
    const ownIdx = sortedAnchors.findIndex((a) => a.key === ownColumn);
    const nextAnchor = sortedAnchors[ownIdx + 1];
    out.push({ ...item, text: timePart, x: nextAnchor ? nextAnchor.x : item.x });
  }
  return out;
}

function parseDayCell(text: string): { start: string; end: string }[] {
  const out: { start: string; end: string }[] = [];
  for (const match of text.matchAll(TIME_RANGE)) {
    out.push({ start: normalizeTime(match[1]!), end: normalizeTime(match[2]!) });
  }
  return out;
}

function normalizeTime(t: string): string {
  const [h, m] = t.split(':');
  return `${(h ?? '0').padStart(2, '0')}:${m ?? '00'}`;
}

interface RawRecord {
  code: string;
  name: string;
  credits?: number;
  group: string;
  room?: string;
  professor?: string;
  blocks: TimeBlock[];
}

function baseGroupId(group: string): string {
  // "1301A" -> "1301" so the lecture row and its lab-session row merge into one section
  return group.replace(/[A-Za-z]+$/, '').trim();
}

export function tableToDataset(
  items: PositionedItem[],
  opts: { institution?: string; rowTolerance?: number } = {}
): { dataset: ScheduleDataset; warnings: ParseWarning[] } {
  const warnings: ParseWarning[] = [];
  const tolerance = opts.rowTolerance ?? 4;
  const rows = clusterRows(items, tolerance);

  const header = findHeaderRow(rows);
  if (!header) {
    warnings.push({
      page: 1,
      message:
        'No se detectaron los encabezados esperados (Clave, Asignatura, Grupo, Lunes...Sábado). El documento puede no seguir ese formato de tabla, o la calidad del texto/imagen fue insuficiente.',
    });
    return { dataset: { institution: opts.institution ?? 'Desconocida', subjects: [] }, warnings };
  }

  const records: RawRecord[] = [];
  let anchors = header.anchors;
  let sawHeaderOnThisPage = new Set([header.row.page]);

  for (const row of rows) {
    if (row === header.row) continue;

    // a later page may repeat the header — recompute anchors for that page, and skip the header row itself
    const rowKeys = row.items.map((i) => HEADER_ALIASES[normalize(i.text)]).filter(Boolean);
    const looksLikeHeader = rowKeys.length >= 3;
    if (looksLikeHeader) {
      const rehead = findHeaderRow([row]);
      if (rehead) {
        anchors = rehead.anchors;
        sawHeaderOnThisPage.add(row.page);
        continue;
      }
    }

    const cleanedItems = splitEmbeddedTimeRuns(row.items, anchors);
    const cells = cellsFromRow({ ...row, items: cleanedItems }, anchors);

    // OCR sometimes merges two adjacent numeric cells when there's no visible gap between
    // them (seen in practice: credits "8" + group "1301" -> one word "81301"). If credits
    // looks too long to be a real credit value and group came out empty, try to split it:
    // group numbers in this format are consistently 4 digits plus an optional trailing letter.
    if (cells.credits && !cells.group) {
      const merged = cells.credits.match(/^(\d{1,2})(\d{4}[A-Za-z]?)$/);
      const creditsPart = merged?.[1];
      const groupPart = merged?.[2];
      if (creditsPart && groupPart) {
        cells.credits = creditsPart;
        cells.group = groupPart;
      }
    }

    const code = (cells.code ?? '').trim();
    const group = (cells.group ?? '').trim();

    // a row with no code/group but with name text is almost always a wrapped continuation
    // of the ROW ABOVE it: long titles like "Informática III. Análisis y diseño de
    // sistemas I" commonly wrap to a second line that sits just below the first
    if (!code && !group && cells.name) {
      const last = records[records.length - 1];
      if (last) last.name = (last.name + ' ' + cells.name).trim();
      continue;
    }
    if (!code || !group) continue; // not a data row we can use (blank separator line, page footer, etc.)

    const blocks: TimeBlock[] = [];
    for (const [col, dayIndex] of Object.entries(DAY_COLUMN_TO_INDEX)) {
      const cellText = cells[col];
      if (!cellText) continue;
      for (const range of parseDayCell(cellText)) {
        blocks.push({ day: dayIndex, start: range.start, end: range.end });
      }
    }

    records.push({
      code,
      name: (cells.name ?? '').trim(),
      credits: cells.credits ? Number(cells.credits) || undefined : undefined,
      group,
      room: cells.room || undefined,
      professor: cells.professor || undefined,
      blocks,
    });
  }

  if (records.length === 0) {
    warnings.push({
      page: 1,
      message: 'Se encontraron encabezados pero ninguna fila de datos utilizable después de ellos.',
    });
  }

  // merge "1301" + "1301A" style continuation rows into one Section per (code, base group)
  const subjectsByCode = new Map<string, { name: string; credits?: number; sections: Map<string, Section> }>();
  for (const rec of records) {
    if (!subjectsByCode.has(rec.code)) {
      subjectsByCode.set(rec.code, { name: rec.name, credits: rec.credits, sections: new Map() });
    }
    const subject = subjectsByCode.get(rec.code)!;
    if (rec.name && rec.name.length > subject.name.length) subject.name = rec.name; // prefer the fuller name
    if (rec.credits !== undefined) subject.credits = rec.credits;

    const gid = baseGroupId(rec.group);
    if (!subject.sections.has(gid)) {
      subject.sections.set(gid, { id: gid, professor: rec.professor, blocks: [] });
    }
    const section = subject.sections.get(gid)!;
    if (!section.professor && rec.professor) section.professor = rec.professor;
    section.blocks.push(...rec.blocks);
  }

  const subjects: Subject[] = Array.from(subjectsByCode.entries()).map(([code, s]) => ({
    code,
    name: titleCaseSubject(s.name),
    credits: s.credits,
    sections: Array.from(s.sections.values()).filter((sec) => sec.blocks.length > 0),
  }));

  for (const subject of subjects) {
    if (subject.sections.length === 0) {
      warnings.push({ page: 1, message: `"${subject.name}" (${subject.code}) no tiene ningún horario legible.` });
    }
  }

  return {
    dataset: { institution: opts.institution ?? 'Desconocida', subjects },
    warnings,
  };
}

function titleCaseSubject(raw: string): string {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return cleaned;
  const lower = cleaned.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
