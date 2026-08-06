import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { extractPdfText } from './pdf';
import { tableToDataset } from './table-to-dataset';

const COLS = {
  clave: 40,
  asignatura: 90,
  cr: 260,
  grupo: 285,
  aula: 320,
  profesor: 380,
  lunes: 470,
  martes: 510,
  miercoles: 550,
  jueves: 590,
  viernes: 630,
  sabado: 670,
};

async function buildSyntheticSchedulePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([760, 400]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const size = 9;
  let y = 360;
  const lineHeight = 16;

  function drawRow(cells: Partial<Record<keyof typeof COLS, string>>) {
    for (const [key, text] of Object.entries(cells)) {
      page.drawText(text as string, { x: COLS[key as keyof typeof COLS], y, size, font });
    }
    y -= lineHeight;
  }

  drawRow({
    clave: 'Clave',
    asignatura: 'Asignatura',
    cr: 'Cr',
    grupo: 'Grupo',
    aula: 'Aula',
    profesor: 'Profesor',
    lunes: 'Lunes',
    martes: 'Martes',
    miercoles: 'Miercoles',
    jueves: 'Jueves',
    viernes: 'Viernes',
    sabado: 'Sabado',
  });
  drawRow({
    clave: '300',
    asignatura: 'Derecho Informatico',
    cr: '8',
    grupo: '1301',
    aula: 'A11-1102',
    profesor: 'Xochitl Munoz Garcia',
    martes: '12:00-14:00',
    jueves: '12:00-14:00',
  });
  drawRow({
    clave: '301',
    asignatura: 'Metodologia de la Investigacion',
    cr: '8',
    grupo: '1301',
    aula: 'A11-1102',
    profesor: 'Irene Correa Esquivel',
    lunes: '10:00-12:00',
    miercoles: '10:00-12:00',
  });
  drawRow({
    clave: '302',
    asignatura: 'Informatica III',
    cr: '12',
    grupo: '1301',
    aula: 'A11-1102',
    profesor: 'Valentin Roldan Vazquez',
    miercoles: '12:00-14:30',
    viernes: '09:30-12:00',
  });
  drawRow({
    clave: '302',
    grupo: '1301A',
    aula: 'A14-14113',
    lunes: '12:00-14:00',
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

describe('extractPdfText + tableToDataset (end to end)', () => {
  it('reconstructs subjects and sections from a real PDF byte stream', async () => {
    const pdfBuffer = await buildSyntheticSchedulePdf();
    const items = await extractPdfText(pdfBuffer);
    expect(items.length).toBeGreaterThan(20);

    const { dataset, warnings } = tableToDataset(items, { institution: 'Test University' });
    expect(warnings).toEqual([]);
    expect(dataset.subjects.map((s) => s.code).sort()).toEqual(['300', '301', '302']);

    const derecho = dataset.subjects.find((s) => s.code === '300')!;
    expect(derecho.name.toLowerCase()).toContain('derecho');
    expect(derecho.sections).toHaveLength(1);
    expect(derecho.sections[0]?.professor).toMatch(/Munoz/i);
    expect(derecho.sections[0]?.blocks).toHaveLength(2);

    // this subject was the one that originally hid two real bugs (see table-to-dataset.test.ts
    // regression cases): a merged "Miercoles Jueves" header word dropping a column anchor, and
    // this row's own professor name merging with its Monday time range into one text item
    const metodologia = dataset.subjects.find((s) => s.code === '301')!;
    expect(metodologia.sections).toHaveLength(1);
    expect(metodologia.sections[0]?.professor).toMatch(/^Irene Correa Esquivel$/i);
    expect(metodologia.sections[0]?.blocks).toEqual(
      expect.arrayContaining([
        { day: 0, start: '10:00', end: '12:00' },
        { day: 2, start: '10:00', end: '12:00' },
      ])
    );
    expect(metodologia.sections[0]?.blocks).toHaveLength(2);

    const informatica = dataset.subjects.find((s) => s.code === '302')!;
    // the 1301 + 1301A rows must merge into one section with all three weekly blocks
    expect(informatica.sections).toHaveLength(1);
    expect(informatica.sections[0]?.blocks).toHaveLength(3);
    expect(informatica.credits).toBe(12);
  }, 20000);
});
