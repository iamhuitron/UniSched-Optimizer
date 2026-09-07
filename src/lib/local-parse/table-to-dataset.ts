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
  codigo: 'code',
  codigoasignatura: 'code',
  clave: 'code',
  claveasignatura: 'code',
  asignatura: 'name',
  asignaturaunidad: 'name',
  materia: 'name',
  nombre: 'name',
  nom: 'name',
  cr: 'credits',
  creditos: 'credits',
  creditoscr: 'credits',
  crédito: 'credits',
  créditos: 'credits',
  grupo: 'group',
  gpo: 'group',
  aula: 'room',
  salon: 'room',
  salón: 'room',
  profesor: 'professor',
  profesorjefe: 'professor',
  docente: 'professor',
  maestro: 'professor',
  lunes: 'day0',
  lun: 'day0',
  martes: 'day1',
  mar: 'day1',
  miercoles: 'day2',
  miércoles: 'day2',
  mie: 'day2',
  jueves: 'day3',
  jue: 'day3',
  viernes: 'day4',
  vie: 'day4',
  sabado: 'day5',
  sábado: 'day5',
  sab: 'day5',
  domingo: 'day6',
  dom: 'day6',
  dias: 'days',
  dia: 'days',
  fechas: 'days',
  horario: 'time',
  horarios: 'time',
  hora: 'time',
  horas: 'time',
  turno: 'time',
  turnos: 'time',
  tiempo: 'time',
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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function headerMatches(text: string): string[] {
  const normalized = normalize(text);
  if (!normalized) return [];

  const keys = new Set<string>();
  const words = normalized.split(' ');
  for (const word of words) {
    const key = HEADER_ALIASES[word];
    if (key) keys.add(key);
  }

  // Fallback for phrases like "Miercoles / Jueves", "Código | Materia", or
  // other punctuation-heavy headers that OCR often emits as a single text item.
  for (const [alias, key] of Object.entries(HEADER_ALIASES)) {
    if (normalized.includes(alias)) keys.add(key);
  }

  return Array.from(keys);
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
  let best: { row: Row; anchors: ColumnAnchor[]; score: number } | null = null;
  for (const row of rows) {
    const itemXs = Array.from(new Set(row.items.map((i) => i.x))).sort((a, b) => a - b);
    const typicalGap = medianGap(itemXs) ?? 40;
    const anchorMap = new Map<string, number[]>();

    for (const item of row.items) {
      const keys = headerMatches(item.text);
      if (keys.length === 0) continue;

      const nextItemX = itemXs.find((x) => x > item.x);
      const span = Math.max((nextItemX ?? item.x + typicalGap) - item.x, 10);
      keys.forEach((key, i) => {
        const x = item.x + (keys.length > 1 ? (span * i) / keys.length : 0);
        const arr = anchorMap.get(key) ?? [];
        arr.push(x);
        anchorMap.set(key, arr);
      });
    }

    const anchors = Array.from(anchorMap.entries()).map(([key, values]) => ({
      key,
      x: values.reduce((sum, value) => sum + value, 0) / values.length,
    }));

    if (anchors.length === 0) continue;

    const hasCore = anchors.some((a) => a.key === 'code' || a.key === 'name');
    const hasGroup = anchors.some((a) => a.key === 'group' || a.key === 'credits' || a.key === 'room');
    const dayCount = anchors.filter((a) => DAY_COLUMN_TO_INDEX[a.key] !== undefined).length;
    const hasCombinedDays = anchors.some((a) => a.key === 'days' || a.key === 'time');
    const score = (hasCore ? 3 : 0) + (hasGroup ? 1 : 0) + dayCount + (hasCombinedDays ? 3 : 0);

    if ((hasCore || hasGroup) && (dayCount >= 2 || hasCombinedDays) && score > (best?.score ?? 0)) {
      best = { row, anchors: anchors.sort((a, b) => a.x - b.x), score };
    }
  }

  return best ? { row: best.row, anchors: best.anchors } : null;
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

const TIME_TOKEN = '\\d{1,2}(?::|\\.)?\\d{2}';
const TIME_RANGE = new RegExp(`(${TIME_TOKEN})\\s*(?:-|–|—|a|al|hasta|to)\\s*(${TIME_TOKEN})`, 'gi');
const TIME_RANGE_SOLO = new RegExp(`(${TIME_TOKEN})\\s*(?:-|–|—|a|al|hasta|to)\\s*(${TIME_TOKEN})`, 'i');

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
  if (!text || text.trim() === '-' || normalize(text) === 'no') return [];
  const out: { start: string; end: string }[] = [];
  for (const match of text.matchAll(TIME_RANGE)) {
    out.push({ start: normalizeTime(match[1]!), end: normalizeTime(match[2]!) });
  }
  return out;
}

const SPANISH_DAY_TOKENS: Record<string, DayIndex> = {
  lu: 0,
  lun: 0,
  lunes: 0,
  l: 0,
  ma: 1,
  mar: 1,
  martes: 1,
  m: 1,
  mi: 2,
  mie: 2,
  mier: 2,
  miercoles: 2,
  x: 2,
  ju: 3,
  jue: 3,
  jueves: 3,
  j: 3,
  vi: 4,
  vie: 4,
  viernes: 4,
  v: 4,
  sa: 5,
  sab: 5,
  sabado: 5,
  s: 5,
  do: 6,
  dom: 6,
  domingo: 6,
  d: 6,
};

export function parseDayTokens(text: string): DayIndex[] {
  const norm = normalize(text);
  if (!norm) return [];

  // Range detection: e.g. "lun-vie", "l-v", "l a v", "mar a jue", "l-j"
  const rangeMatch = norm.match(
    /\b(lu|lun|lunes|l|ma|mar|martes|m|mi|mie|mier|miercoles|x|ju|jue|jueves|j|vi|vie|viernes|v|sa|sab|sabado|s)\s*(?:a|-|al|hasta)\s*(lu|lun|lunes|l|ma|mar|martes|m|mi|mie|mier|miercoles|x|ju|jue|jueves|j|vi|vie|viernes|v|sa|sab|sabado|s)\b/
  );
  if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
    const startDay = SPANISH_DAY_TOKENS[rangeMatch[1]];
    const endDay = SPANISH_DAY_TOKENS[rangeMatch[2]];
    if (startDay !== undefined && endDay !== undefined && startDay <= endDay) {
      const days: DayIndex[] = [];
      for (let d = startDay; d <= endDay; d++) {
        days.push(d as DayIndex);
      }
      return days;
    }
  }

  // Tokenize by word / separator
  const words = norm.replace(/\b(y|e|al|a)\b/g, ' ').split(/\s+/).filter(Boolean);
  const matchedDays = new Set<DayIndex>();
  for (const word of words) {
    const d = SPANISH_DAY_TOKENS[word];
    if (d !== undefined) matchedDays.add(d);
  }
  return Array.from(matchedDays).sort((a, b) => a - b);
}

export function parseCombinedSchedule(daysText: string, timeText: string): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  const times = parseDayCell(timeText);
  const days = parseDayTokens(daysText);

  if (days.length > 0 && times.length > 0) {
    for (const day of days) {
      for (const t of times) {
        blocks.push({ day, start: t.start, end: t.end });
      }
    }
    return blocks;
  }

  // Inline day + time patterns in either text (e.g. "LUN 07:00-09:00, VIE 07:00-09:00")
  const combined = `${daysText} ${timeText}`.trim();
  if (!combined) return [];

  const segmentRegex =
    /(?:^|\s|,)([a-z0-9]{1,9}(?:\s*[-–]\s*[a-z0-9]{1,9})?)\s*(\d{1,2}(?::|\.)?\d{2}\s*(?:-|–|—|a|al|to)\s*\d{1,2}(?::|\.)?\d{2})/gi;
  let match: RegExpExecArray | null;
  let found = false;
  while ((match = segmentRegex.exec(combined)) !== null) {
    found = true;
    const segDays = parseDayTokens(match[1] || '');
    const segTimes = parseDayCell(match[2] || '');
    for (const d of segDays) {
      for (const t of segTimes) {
        blocks.push({ day: d, start: t.start, end: t.end });
      }
    }
  }

  if (!found && times.length > 0 && days.length === 0) {
    const fallbackDays = parseDayTokens(combined);
    for (const d of fallbackDays) {
      for (const t of times) {
        blocks.push({ day: d, start: t.start, end: t.end });
      }
    }
  }

  return blocks;
}

function normalizeTime(t: string): string {
  const raw = t.trim().replace(/\./g, ':');
  const parts = raw.split(':');
  const h = Number(parts[0] ?? '0');
  const m = Number(parts[1] ?? '0');
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
    const rowKeys = row.items.flatMap((i) => headerMatches(i.text));
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
    // sistemas I" commonly wrap to a second line that sits just below the first.
    if (!code && !group && cells.name) {
      const last = records[records.length - 1];
      if (last) last.name = (last.name + ' ' + cells.name).trim();
      continue;
    }

    // Some tables omit the explicit "Grupo" column, or a PDF/OCR pass merges it into the
    // code/credits fields. If the code is present and the row clearly has time blocks, keep it
    // as a valid record instead of dropping it just because the group field is missing.
    if (!code) continue;
    const hasDayCol = Object.keys(cells).some((key) => DAY_COLUMN_TO_INDEX[key as keyof typeof DAY_COLUMN_TO_INDEX] !== undefined);
    const hasCombinedSched = Boolean(cells.days || cells.time);
    if (!group && !hasDayCol && !hasCombinedSched) {
      continue;
    }

    const effectiveGroup = group || '101';

    const blocks: TimeBlock[] = [];
    // Layout A: Separate day columns
    for (const [col, dayIndex] of Object.entries(DAY_COLUMN_TO_INDEX)) {
      const cellText = cells[col];
      if (!cellText) continue;
      for (const range of parseDayCell(cellText)) {
        blocks.push({ day: dayIndex, start: range.start, end: range.end });
      }
    }

    // Layout B: Combined days / time column
    if (cells.days || cells.time) {
      const combinedBlocks = parseCombinedSchedule(cells.days || '', cells.time || '');
      blocks.push(...combinedBlocks);
    }

    records.push({
      code,
      name: (cells.name ?? '').trim(),
      credits: cells.credits ? Number(cells.credits) || undefined : undefined,
      group: effectiveGroup,
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
