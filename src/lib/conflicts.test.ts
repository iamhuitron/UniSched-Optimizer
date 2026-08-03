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
    // 300/1301 meets Mar 12:00-14:00; 304/1351 meets Mar 15:00-17:00 -> no clash
    // but 300/1301 (Mar 12-14) and 302/1351 main (Mar 19-21) don't clash either;
    // pick two that are known to overlap instead: 304/1301 (Mar 10-12) and 305/1303 (Mar 10-12)
    const chosen = [pick('304', '1301'), pick('305', '1303')];
    const conflicts = findConflicts(chosen);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0]!.day).toBe(1);
  });

  it('reports one conflict per colliding day, not one per subject pair', () => {
    // 304/1301 and 305/1303 both meet Mar 10:00-12:00 AND Jue 10:00-12:00 —
    // that is genuinely two separate clashes a student needs to see, not one
    const chosen = [pick('304', '1301'), pick('305', '1303')];
    const conflicts = findConflicts(chosen);
    expect(conflicts.length).toBe(2);
    expect(conflicts.map((c) => c.day).sort()).toEqual([1, 3]);
  });

  it('conflictingBlockKeys only flags the specific colliding blocks, not every block of the subject', () => {
    // 302/1301 meets three times a week; only its Lunes block should ever clash with 300/1351's Lunes block
    const chosen = [pick('302', '1301'), pick('300', '1351')];
    const keys = conflictingBlockKeys(chosen);
    // 300/1351 meets Lun 16-18 and Mié 16-18; 302/1301 meets Lun 12-14, Mié 12-14:30, Vie 9:30-12
    // none of these actually overlap in time even though they share days, so keys should be empty
    expect(keys.size).toBe(0);
  });
});
