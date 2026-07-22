import { describe, expect, it } from 'vitest';
import { solve } from './solver';
import { blocksOverlap } from './time';
import type { ScheduleDataset, Subject } from './types';
import fixture from '../../fixtures/fes-cuautitlan-3er-semestre.json';

const dataset = fixture as ScheduleDataset;
const coreSubjects: Subject[] = dataset.subjects.filter((s) => s.code !== '8001');

function assertNoInternalOverlap(option: ReturnType<typeof solve>[number]) {
  const blocks = option.sections.flatMap((c) => c.section.blocks);
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      expect(blocksOverlap(blocks[i]!, blocks[j]!)).toBe(false);
    }
  }
}

describe('solve', () => {
  it('returns only conflict-free combinations', () => {
    const options = solve(coreSubjects, { maxResults: 20 });
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) assertNoInternalOverlap(option);
  });

  it('covers every required subject exactly once per option', () => {
    const options = solve(coreSubjects, { maxResults: 5 });
    for (const option of options) {
      const codes = option.sections.map((s) => s.subjectCode).sort();
      expect(codes).toEqual(['300', '301', '302', '303', '304', '305']);
    }
  });

  it('finds the pure-morning combo (all sections from grupo 1301) as a valid option', () => {
    const options = solve(coreSubjects, { latestEnd: '15:00', maxResults: 50 });
    const pure1301 = options.find((o) => o.sections.every((s) => s.section.id === '1301'));
    expect(pure1301).toBeDefined();
  });

  it('returns no options when a hard filter makes every section of some subject infeasible', () => {
    // every offered section of Informática III (302) has at least one block before 15:00,
    // so "nothing before 15:00" makes 302 impossible to satisfy no matter which group is picked
    const options = solve(coreSubjects, { earliestStart: '15:00', maxResults: 50 });
    expect(options).toEqual([]);
  });

  it('respects a hard daysOff constraint (no Saturday)', () => {
    const options = solve(coreSubjects, { daysOff: [5], maxResults: 50 });
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      const usesSaturday = option.sections.some((s) => s.section.blocks.some((b) => b.day === 5));
      expect(usesSaturday).toBe(false);
    }
  });

  it('mixes sections from different groups when that is the only way to satisfy the constraints', () => {
    // grupo 1351's own Informática III section requires Saturday, so with Saturday off,
    // a fully-evening student is forced to borrow 302 from a morning group (1301/1302/1303) —
    // this is exactly the "horario mixto" idea, discovered automatically rather than hand-built
    const options = solve(coreSubjects, { daysOff: [5], maxResults: 50 });
    const crossGroup = options.find((o) => new Set(o.sections.map((s) => s.section.id)).size > 1);
    expect(crossGroup).toBeDefined();
  });

  it('returns an empty array when a required subject has no offered sections', () => {
    const broken: Subject[] = [
      ...coreSubjects,
      { code: '999', name: 'Materia inexistente', sections: [] },
    ];
    const options = solve(broken, { requiredSubjectCodes: [...broken.map((s) => s.code)] });
    expect(options).toEqual([]);
  });

  it('ranks tighter, more compact schedules above ones with bigger gaps', () => {
    const options = solve(coreSubjects, { maxResults: 50 });
    for (let i = 1; i < options.length; i++) {
      expect(options[i - 1]!.score).toBeGreaterThanOrEqual(options[i]!.score);
    }
  });

  it('can include the optional 0-credit activity without breaking anything', () => {
    const withActivity = [...coreSubjects, dataset.subjects.find((s) => s.code === '8001')!];
    const options = solve(withActivity, { maxResults: 10 });
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) assertNoInternalOverlap(option);
  });
});
