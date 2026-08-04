import { describe, expect, it } from 'vitest';
import { conflictingBlockKeys, findConflicts } from './conflicts';
import type { ChosenSection, ScheduleDataset } from './types';
import fixture from '../../fixtures/fes-cuautitlan-3er-semestre.json';

const dataset = fixture as ScheduleDataset;

function pick(code: string, sectionId: string): ChosenSection {
  const subject = dataset.subjects.find((s) => s.code === code)!;
  const section = subject.sections.find((s) => s.id === sectionId)!;
  return { subjectCode: subject.code, subjectName: subject.name, section };
}

describe('findConflicts', () => {
  it('finds no conflicts when every section comes from the same well-formed group', () => {
    const chosen = [
      pick('300', '1301'),
      pick('301', '1301'),
      pick('302', '1301'),
      pick('303', '1301'),
      pick('304', '1301'),
      pick('305', '1301'),
    ];
    expect(findConflicts(chosen)).toEqual([]);
  });

  it('finds a real conflict when two hand-picked sections overlap', () => {
    const chosen = [pick('304', '1301'), pick('305', '1303')];
    const conflicts = findConflicts(chosen);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0]!.day).toBe(1);
  });

  it('reports one conflict per colliding day, not one per subject pair', () => {
    const chosen = [pick('304', '1301'), pick('305', '1303')];
    const conflicts = findConflicts(chosen);
    expect(conflicts.length).toBe(2);
    expect(conflicts.map((c) => c.day).sort()).toEqual([1, 3]);
  });

  it('conflictingBlockKeys only flags the specific colliding blocks, not every block of the subject', () => {
    const chosen = [pick('302', '1301'), pick('300', '1351')];
    const keys = conflictingBlockKeys(chosen);
    expect(keys.size).toBe(0);
  });
});
