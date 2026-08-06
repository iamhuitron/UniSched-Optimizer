import { describe, expect, it } from 'vitest';
import { tableToDataset } from './table-to-dataset';
import type { PositionedItem } from './types';

// column x-anchors mimicking the real FES Cuautitlán layout, spaced enough apart
// that nearest-column assignment is unambiguous
const COLS = {
  clave: 10,
  asignatura: 60,
  cr: 200,
  grupo: 220,
  aula: 260,
  profesor: 310,
  lunes: 400,
  martes: 450,
  miercoles: 500,
  jueves: 550,
  viernes: 600,
  sabado: 650,
};

function header(page: number, y: number): PositionedItem[] {
  return [
    { text: 'Clave', x: COLS.clave, y, page },
    { text: 'Asignatura', x: COLS.asignatura, y, page },
    { text: 'Cr', x: COLS.cr, y, page },
    { text: 'Grupo', x: COLS.grupo, y, page },
    { text: 'Aula', x: COLS.aula, y, page },
    { text: 'Profesor', x: COLS.profesor, y, page },
    { text: 'Lunes', x: COLS.lunes, y, page },
    { text: 'Martes', x: COLS.martes, y, page },
    { text: 'Miercoles', x: COLS.miercoles, y, page },
    { text: 'Jueves', x: COLS.jueves, y, page },
    { text: 'Viernes', x: COLS.viernes, y, page },
    { text: 'Sabado', x: COLS.sabado, y, page },
  ];
}

function row(
  page: number,
  y: number,
  cells: Partial<Record<keyof typeof COLS, string>>
): PositionedItem[] {
  const items: PositionedItem[] = [];
  for (const [key, text] of Object.entries(cells)) {
    if (text === undefined) continue;
    // split on spaces to mimic how a PDF text layer often emits one item per word,
    // spread slightly around the column anchor so nearest-column assignment is exercised
    const words = text.split(' ');
    words.forEach((w, i) => items.push({ text: w, x: COLS[key as keyof typeof COLS] + i * 3, y, page }));
  }
  return items;
}

describe('tableToDataset', () => {
  it('reconstructs a simple two-subject, one-group table', () => {
    const items = [
      ...header(1, 100),
      ...row(1, 120, {
        clave: '300',
        asignatura: 'Derecho Informático',
        cr: '8',
        grupo: '1301',
        aula: 'A11-1102',
        profesor: 'Xochitl Muñoz García',
        martes: '12:00-14:00',
        jueves: '12:00-14:00',
      }),
      ...row(1, 140, {
        clave: '301',
        asignatura: 'Metodología de la Investigación',
        cr: '8',
        grupo: '1301',
        aula: 'A11-1102',
        profesor: 'Irene Correa Esquivel',
        lunes: '10:00-12:00',
        miercoles: '10:00-12:00',
      }),
    ];

    const { dataset, warnings } = tableToDataset(items, { institution: 'Test U' });
    expect(warnings).toEqual([]);
    expect(dataset.subjects).toHaveLength(2);

    const derecho = dataset.subjects.find((s) => s.code === '300');
    expect(derecho?.credits).toBe(8);
    expect(derecho?.sections).toHaveLength(1);
    expect(derecho?.sections[0]?.id).toBe('1301');
    expect(derecho?.sections[0]?.professor).toBe('Xochitl Muñoz García');
    expect(derecho?.sections[0]?.blocks).toEqual(
      expect.arrayContaining([
        { day: 1, start: '12:00', end: '14:00' },
        { day: 3, start: '12:00', end: '14:00' },
      ])
    );
    expect(derecho?.sections[0]?.blocks).toHaveLength(2);
  });

  it('merges a base group row with its "A" continuation row into one section', () => {
    const items = [
      ...header(1, 100),
      ...row(1, 120, {
        clave: '302',
        asignatura: 'Informatica III',
        cr: '12',
        grupo: '1301',
        aula: 'A11-1102',
        profesor: 'Valentin Roldan Vazquez',
        miercoles: '12:00-14:30',
        viernes: '09:30-12:00',
      }),
      ...row(1, 140, {
        clave: '302',
        grupo: '1301A',
        aula: 'A14-14113',
        lunes: '12:00-14:00',
      }),
    ];

    const { dataset } = tableToDataset(items, { institution: 'Test U' });
    const informatica = dataset.subjects.find((s) => s.code === '302');
    expect(informatica?.sections).toHaveLength(1);
    expect(informatica?.sections[0]?.id).toBe('1301');
    expect(informatica?.sections[0]?.blocks).toHaveLength(3);
    expect(informatica?.sections[0]?.professor).toBe('Valentin Roldan Vazquez');
  });

  it('reattaches a wrapped subject-name continuation line to the row above it', () => {
    const items = [
      ...header(1, 100),
      ...row(1, 120, {
        clave: '302',
        asignatura: 'Informatica III.',
        cr: '12',
        grupo: '1301',
        martes: '19:00-21:00',
      }),
      // a lone continuation line: only the "asignatura" column has text, nothing else
      ...row(1, 136, { asignatura: 'Analisis y diseno de sistemas I' }),
    ];

    const { dataset } = tableToDataset(items, { institution: 'Test U' });
    const subject = dataset.subjects.find((s) => s.code === '302');
    expect(subject?.name).toMatch(/^Informatica III\. Analisis y diseno de sistemas i$/i);
  });

  it('treats "-" day cells as no class instead of a stray time block', () => {
    const items = [
      ...header(1, 100),
      ...row(1, 120, {
        clave: '300',
        asignatura: 'Derecho',
        grupo: '1301',
        lunes: '-',
        martes: '12:00-14:00',
      }),
    ];
    const { dataset } = tableToDataset(items, { institution: 'Test U' });
    expect(dataset.subjects[0]?.sections[0]?.blocks).toHaveLength(1);
    expect(dataset.subjects[0]?.sections[0]?.blocks[0]?.day).toBe(1);
  });

  it('handles two groups of the same subject as two separate sections', () => {
    const items = [
      ...header(1, 100),
      ...row(1, 120, { clave: '300', asignatura: 'Derecho', grupo: '1301', martes: '12:00-14:00' }),
      ...row(1, 140, { clave: '300', asignatura: 'Derecho', grupo: '1302', martes: '12:00-14:00' }),
    ];
    const { dataset } = tableToDataset(items, { institution: 'Test U' });
    expect(dataset.subjects).toHaveLength(1);
    expect(dataset.subjects[0]?.sections.map((s) => s.id).sort()).toEqual(['1301', '1302']);
  });

  it('re-anchors columns when a header repeats on a later page', () => {
    const items = [
      ...header(1, 100),
      ...row(1, 120, { clave: '300', asignatura: 'Derecho', grupo: '1301', martes: '12:00-14:00' }),
      // page 2 header shifted slightly, as if the PDF re-rendered the table with a different margin
      ...header(2, 50).map((i) => ({ ...i, x: i.x + 15 })),
      ...row(2, 70, { clave: '301', asignatura: 'Metodologia', grupo: '1301', lunes: '10:00-12:00' }).map((i) => ({
        ...i,
        x: i.x + 15,
      })),
    ];
    const { dataset, warnings } = tableToDataset(items);
    expect(warnings).toEqual([]);
    expect(dataset.subjects.map((s) => s.code).sort()).toEqual(['300', '301']);
  });

  it('still finds both column anchors when two header words merge into one item (regression)', () => {
    // real bug: a PDF/OCR extraction can merge two visually-adjacent header cells
    // ("Miercoles" + "Jueves") into a single text item "Miercoles Jueves" — if only
    // the whole string is checked against known header words, BOTH columns silently
    // get no anchor at all, and data meant for either one gets misattributed to
    // whichever neighboring column happens to be nearest.
    const mergedHeader = header(1, 100)
      .filter((i) => i.text !== 'Miercoles' && i.text !== 'Jueves')
      .concat([{ text: 'Miercoles Jueves', x: COLS.miercoles, y: 100, page: 1 }]);
    const items = [
      ...mergedHeader,
      ...row(1, 120, { clave: '300', asignatura: 'Derecho', grupo: '1301', miercoles: '16:00-18:00' }),
      ...row(1, 140, { clave: '301', asignatura: 'Metodologia', grupo: '1301', jueves: '17:00-19:00' }),
    ];
    const { dataset, warnings } = tableToDataset(items);
    expect(warnings).toEqual([]);
    expect(dataset.subjects.find((s) => s.code === '300')?.sections[0]?.blocks).toEqual([
      { day: 2, start: '16:00', end: '18:00' },
    ]);
    expect(dataset.subjects.find((s) => s.code === '301')?.sections[0]?.blocks).toEqual([
      { day: 3, start: '17:00', end: '19:00' },
    ]);
  });

  it('splits a data cell that merged with an adjacent time range (regression)', () => {
    // real bug: a long professor name with little visual gap before the next
    // column can come back as one item, e.g. "Irene Correa Esquivel 10:00-12:00"
    // anchored at the professor column — silently corrupting the professor field
    // AND losing that day's time block if left unsplit.
    const items = [
      ...header(1, 100),
      { text: '301', x: COLS.clave, y: 120, page: 1 },
      { text: 'Metodologia', x: COLS.asignatura, y: 120, page: 1 },
      { text: '1301', x: COLS.grupo, y: 120, page: 1 },
      { text: 'Irene Correa Esquivel 10:00-12:00', x: COLS.profesor, y: 120, page: 1 },
    ];
    const { dataset } = tableToDataset(items);
    const subject = dataset.subjects.find((s) => s.code === '301');
    expect(subject?.sections[0]?.professor).toBe('Irene Correa Esquivel');
    expect(subject?.sections[0]?.blocks).toEqual([{ day: 0, start: '10:00', end: '12:00' }]);
  });

  it('reports a warning and an empty dataset when no header row can be found', () => {
    const items: PositionedItem[] = [{ text: 'esto no es una tabla de horarios', x: 10, y: 10, page: 1 }];
    const { dataset, warnings } = tableToDataset(items);
    expect(dataset.subjects).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
  });
});
