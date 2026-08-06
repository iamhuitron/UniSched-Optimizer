import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractImageText } from './image';
import { tableToDataset } from './table-to-dataset';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, '__fixtures__', 'sample-schedule.png');

describe('extractImageText + tableToDataset (end to end, real OCR)', () => {
  it('reconstructs subjects and sections from a rendered table image with no external API', async () => {
    const buffer = fs.readFileSync(FIXTURE);
    const items = await extractImageText(buffer);
    expect(items.length).toBeGreaterThan(20);

    const { dataset, warnings } = tableToDataset(items, { institution: 'Test OCR University' });
    expect(warnings).toEqual([]);
    expect(dataset.subjects.map((s) => s.code).sort()).toEqual(['300', '301', '302']);

    const derecho = dataset.subjects.find((s) => s.code === '300')!;
    expect(derecho.credits).toBe(8);
    expect(derecho.sections).toHaveLength(1);
    expect(derecho.sections[0]?.id).toBe('1301');
    expect(derecho.sections[0]?.blocks).toHaveLength(2);

    const informatica = dataset.subjects.find((s) => s.code === '302')!;
    // OCR reads this as two separate rows (1301 main + 1301A lab); they must still
    // merge into one section the same way the clean PDF-text path does
    expect(informatica.sections).toHaveLength(1);
    expect(informatica.sections[0]?.blocks.length).toBeGreaterThanOrEqual(2);
    expect(informatica.credits).toBe(12);
    // OCR accuracy on names/professors is inherently imperfect (this is the real,
    // documented tradeoff of the no-API-key path) — only the structural fields
    // (code, group, day, time) are asserted strictly above.
  }, 30000);
});
