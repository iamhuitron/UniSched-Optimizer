import { describe, expect, it } from 'vitest';
import { CATALOG } from './catalog';

function idsAt<T extends { id: string }>(items: T[]): string[] {
  return items.map((i) => i.id);
}

function hasDuplicates(ids: string[]): boolean {
  return new Set(ids).size !== ids.length;
}

describe('CATALOG', () => {
  it('has no duplicate university ids', () => {
    expect(hasDuplicates(idsAt(CATALOG))).toBe(false);
  });

  it('has no duplicate faculty ids within a university', () => {
    for (const uni of CATALOG) {
      expect(hasDuplicates(idsAt(uni.faculties))).toBe(false);
    }
  });

  it('has no duplicate entry ids across the whole catalog', () => {
    const allEntryIds = CATALOG.flatMap((uni) => uni.faculties.flatMap((f) => idsAt(f.entries)));
    expect(hasDuplicates(allEntryIds)).toBe(false);
  });

  it('every entry has a non-empty datasetPath pointing under /fixtures/', () => {
    for (const uni of CATALOG) {
      for (const fac of uni.faculties) {
        for (const entry of fac.entries) {
          expect(entry.datasetPath).toMatch(/^\/fixtures\/.+\.json$/);
        }
      }
    }
  });

  it('includes the real, verified FES Cuautitlán entry', () => {
    const unam = CATALOG.find((u) => u.id === 'unam');
    const fesc = unam?.faculties.find((f) => f.id === 'fes-cuautitlan');
    expect(fesc?.entries).toHaveLength(1);
    expect(fesc?.entries[0]?.datasetPath).toBe('/fixtures/fes-cuautitlan-3er-semestre.json');
  });

  it('starts with UNAM, IPN and UAM as the top-level universities', () => {
    expect(idsAt(CATALOG)).toEqual(['unam', 'ipn', 'uam']);
  });
});
