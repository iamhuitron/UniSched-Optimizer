/**
 * Core schema for horario-optimo.
 *
 * This is the contract between the two hard problems the project solves:
 *   1. Parsing   — turn a university's PDF/image of course offerings into a ScheduleDataset
 *   2. Solving   — given a ScheduleDataset + Preferences, find the best non-conflicting combos
 *
 * Any university's data, once normalized into a ScheduleDataset, works with the same
 * solver. Nothing here assumes a specific institution's naming conventions.
 */

/** 0 = Monday ... 5 = Saturday, 6 = Sunday (rarely used but kept for completeness). */
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_LABELS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

/** A single weekly meeting time. A section can have more than one of these
 *  (e.g. a lecture block plus a separate lab block on another day/room). */
export interface TimeBlock {
  day: DayIndex;
  /** 24h "HH:MM" */
  start: string;
  /** 24h "HH:MM" */
  end: string;
  room?: string;
}

/** One offering of a subject (what a Mexican schedule usually calls a "grupo").
 *  Choosing a section commits the student to ALL of its blocks as a package —
 *  you can't take the lecture from one section and the lab from another. */
export interface Section {
  /** e.g. "1301" or "1301A" merged into one section id such as "1301" */
  id: string;
  professor?: string;
  blocks: TimeBlock[];
}

export interface Subject {
  /** institution's own course code, e.g. "302" */
  code: string;
  name: string;
  credits?: number;
  /** every section a student could pick for this subject */
  sections: Section[];
}

export interface ScheduleDataset {
  institution: string;
  program?: string;
  term?: string;
  subjects: Subject[];
  sourceFile?: string;
  extractedAt?: string;
}

export interface Preferences {
  /** subset of subject codes to schedule; defaults to every subject in the dataset */
  requiredSubjectCodes?: string[];
  /** no class may start before this time, "HH:MM" */
  earliestStart?: string;
  /** no class may end after this time, "HH:MM" */
  latestEnd?: string;
  /** days that must stay completely free */
  daysOff?: DayIndex[];
  /** how many ranked options to return, default 5 */
  maxResults?: number;
}

export interface ChosenSection {
  subjectCode: string;
  subjectName: string;
  section: Section;
}

export interface ScheduleOption {
  sections: ChosenSection[];
  /** higher is better; used only to rank/sort results against each other */
  score: number;
  stats: {
    daysUsed: DayIndex[];
    earliestStart: string;
    latestEnd: string;
    weeklyHours: number;
    totalGapMinutes: number;
  };
}
