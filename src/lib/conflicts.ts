import type { ChosenSection, DayIndex, TimeBlock } from './types';
import { blocksOverlap } from './time';

export interface BlockConflict {
  subjectCodeA: string;
  subjectNameA: string;
  sectionIdA: string;
  subjectCodeB: string;
  subjectNameB: string;
  sectionIdB: string;
  day: DayIndex;
  startA: string;
  endA: string;
  startB: string;
  endB: string;
}

/** Pairwise, human-readable list of every clash among the chosen sections — used to
 *  render "X choca con Y, martes 12:00-14:00" style messages under the grid. */
export function findConflicts(chosen: ChosenSection[]): BlockConflict[] {
  const conflicts: BlockConflict[] = [];
  for (let i = 0; i < chosen.length; i++) {
    for (let j = i + 1; j < chosen.length; j++) {
      const a = chosen[i];
      const b = chosen[j];
      if (!a || !b) continue;
      for (const ba of a.section.blocks) {
        for (const bb of b.section.blocks) {
          if (blocksOverlap(ba, bb)) {
            conflicts.push({
              subjectCodeA: a.subjectCode,
              subjectNameA: a.subjectName,
              sectionIdA: a.section.id,
              subjectCodeB: b.subjectCode,
              subjectNameB: b.subjectName,
              sectionIdB: b.section.id,
              day: ba.day,
              startA: ba.start,
              endA: ba.end,
              startB: bb.start,
              endB: bb.end,
            });
          }
        }
      }
    }
  }
  return conflicts;
}

function blockKey(subjectCode: string, block: Pick<TimeBlock, 'day' | 'start' | 'end'>): string {
  return `${subjectCode}|${block.day}|${block.start}|${block.end}`;
}

/** Which specific blocks (not just which subjects) are involved in a clash, so the
 *  calendar can outline exactly the two colliding cells instead of an entire subject. */
export function conflictingBlockKeys(chosen: ChosenSection[]): Set<string> {
  const keys = new Set<string>();
  for (let i = 0; i < chosen.length; i++) {
    for (let j = i + 1; j < chosen.length; j++) {
      const a = chosen[i];
      const b = chosen[j];
      if (!a || !b) continue;
      for (const ba of a.section.blocks) {
        for (const bb of b.section.blocks) {
          if (blocksOverlap(ba, bb)) {
            keys.add(blockKey(a.subjectCode, ba));
            keys.add(blockKey(b.subjectCode, bb));
          }
        }
      }
    }
  }
  return keys;
}

export { blockKey };
