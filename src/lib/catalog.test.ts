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

  it('every entry that claims a datasetPath points under /fixtures/ as a .json file', () => {
    for (const uni of CATALOG) {
      for (const fac of uni.faculties) {
        for (const entry of fac.entries) {
          if (entry.datasetPath !== undefined) {
            expect(entry.datasetPath).toMatch(/^\/fixtures\/.+\.json$/);
          }
        }
      }
    }
  });

  it('includes all six real, verified FES Cuautitlán Informática semesters', () => {
    const unam = CATALOG.find((u) => u.id === 'unam');
    const fesc = unam?.faculties.find((f) => f.id === 'fes-cuautitlan');
    const informatica = fesc?.entries.filter((e) => e.careerName === 'Licenciatura en Informática') ?? [];
    expect(informatica).toHaveLength(6);
    for (const entry of informatica) {
      expect(entry.datasetPath).toBeDefined();
    }
    expect(fesc?.entries.find((e) => e.id === 'fesc-informatica-3er')?.datasetPath).toBe(
      '/fixtures/fes-cuautitlan-3er-semestre.json'
    );
  });

  it('lists the rest of FES Cuautitlán\'s real careers without fabricating data for them', () => {
    const unam = CATALOG.find((u) => u.id === 'unam');
    const fesc = unam?.faculties.find((f) => f.id === 'fes-cuautitlan');
    const others = fesc?.entries.filter((e) => e.careerName !== 'Licenciatura en Informática') ?? [];
    // real careers, but genuinely not verified yet -> no datasetPath
    expect(others.length).toBeGreaterThan(10);
    for (const entry of others) {
      expect(entry.datasetPath).toBeUndefined();
    }
  });

  it('starts with UNAM, IPN and UAM as the top-level universities', () => {
    expect(idsAt(CATALOG)).toEqual(['unam', 'ipn', 'uam']);
  });
});
