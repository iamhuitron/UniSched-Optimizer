import type { ChosenSection, Preferences, ScheduleOption, Subject, TimeBlock } from './types';
import { blocksOverlap, computeGapMinutes, daysUsed, fromMinutes, toMinutes } from './time';

/**
 * Finds ranked, non-conflicting combinations of one section per subject.
 *
 * Approach: backtracking search, one subject at a time. Subjects with fewer
 * candidate sections are tried first so bad branches get pruned early — for
 * realistic course counts (roughly 5-10 subjects, up to a dozen sections
 * each) this explores in well under a second, so no need for a heavier
 * solver (SAT/ILP) at this scale.
 *
 * `earliestStart`, `latestEnd` and `daysOff` are treated as hard filters:
 * a combination that violates any of them is discarded, not just penalized.
 * Among the combinations that pass, results are ranked by a compactness
 * score (fewer/shorter gaps, fewer distinct days on campus).
 */
export function solve(subjects: Subject[], prefs: Preferences = {}): ScheduleOption[] {
  const required = prefs.requiredSubjectCodes
    ? subjects.filter((s) => prefs.requiredSubjectCodes!.includes(s.code))
    : subjects;

  // most-constrained-first ordering improves pruning but doesn't change correctness
  const ordered = [...required].sort((a, b) => a.sections.length - b.sections.length);

  const results: ScheduleOption[] = [];
  const chosen: ChosenSection[] = [];

  function blockAllowed(block: TimeBlock): boolean {
    if (prefs.earliestStart && toMinutes(block.start) < toMinutes(prefs.earliestStart)) return false;
    if (prefs.latestEnd && toMinutes(block.end) > toMinutes(prefs.latestEnd)) return false;
    if (prefs.daysOff && prefs.daysOff.includes(block.day)) return false;
    return true;
  }

  function fitsWithChosen(blocks: TimeBlock[]): boolean {
    for (const block of blocks) {
      if (!blockAllowed(block)) return false;
      for (const c of chosen) {
        for (const cb of c.section.blocks) {
          if (blocksOverlap(block, cb)) return false;
        }
      }
    }
    return true;
  }

  function backtrack(i: number) {
    if (i === ordered.length) {
      results.push(buildOption(chosen));
      return;
    }
    const subject = ordered[i];
    if (!subject) return; // unreachable: i < ordered.length is the loop invariant here
    for (const section of subject.sections) {
      if (!fitsWithChosen(section.blocks)) continue;
      chosen.push({ subjectCode: subject.code, subjectName: subject.name, section });
      backtrack(i + 1);
      chosen.pop();
    }
  }

  if (ordered.some((s) => s.sections.length === 0)) {
    // a required subject has no offered sections at all — no combination can ever succeed
    return [];
  }

  backtrack(0);
  results.sort((a, b) => b.score - a.score);

  const max = prefs.maxResults ?? 5;
  return results.slice(0, max);
}

function buildOption(chosen: ChosenSection[]): ScheduleOption {
  const allBlocks = chosen.flatMap((c) => c.section.blocks);
  const starts = allBlocks.map((b) => toMinutes(b.start));
  const ends = allBlocks.map((b) => toMinutes(b.end));
  const gapMinutes = computeGapMinutes(allBlocks);
  const days = daysUsed(allBlocks);
  const weeklyHours =
    Math.round(
      allBlocks.reduce((sum, b) => sum + (toMinutes(b.end) - toMinutes(b.start)), 0) / 6
    ) / 10; // minutes -> hours, rounded to 1 decimal

  // Higher is better. Gaps and extra days on campus are the two costs students
  // consistently care about; weights are deliberately simple and easy to retune.
  const score = 1000 - gapMinutes - days.length * 30;

  return {
    sections: [...chosen],
    score,
    stats: {
      daysUsed: days,
      earliestStart: fromMinutes(Math.min(...starts)),
      latestEnd: fromMinutes(Math.max(...ends)),
      weeklyHours,
      totalGapMinutes: gapMinutes,
    },
  };
}
