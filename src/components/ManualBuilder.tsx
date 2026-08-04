'use client';

import { useMemo, useState } from 'react';
import type { ChosenSection, Subject } from '@/lib/types';
import { findConflicts } from '@/lib/conflicts';
import ScheduleGrid from './ScheduleGrid';
import styles from './ManualBuilder.module.css';

const DAY_LABELS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

function summarizeBlocks(section: { blocks: { day: number; start: string; end: string }[] }): string {
  return section.blocks.map((b) => `${DAY_LABELS[b.day]} ${b.start}`).join(' · ');
}

export default function ManualBuilder({ subjects }: { subjects: Subject[] }) {
  const [picks, setPicks] = useState<Record<string, string>>({});

  function pickSection(subjectCode: string, sectionId: string) {
    setPicks((prev) => ({
      ...prev,
      [subjectCode]: prev[subjectCode] === sectionId ? '' : sectionId,
    }));
  }

  const chosen: ChosenSection[] = useMemo(() => {
    const result: ChosenSection[] = [];
    for (const subject of subjects) {
      const sectionId = picks[subject.code];
      if (!sectionId) continue;
      const section = subject.sections.find((s) => s.id === sectionId);
      if (section) result.push({ subjectCode: subject.code, subjectName: subject.name, section });
    }
    return result;
  }, [subjects, picks]);

  const conflicts = useMemo(() => findConflicts(chosen), [chosen]);
  const pickedCount = Object.values(picks).filter(Boolean).length;

  return (
    <div className={styles.wrap}>
      <div className={styles.progress}>
        {pickedCount} de {subjects.length} materias elegidas
      </div>

      <div className={styles.pickers}>
        {subjects.map((subject) => (
          <div key={subject.code} className={styles.subjectRow}>
            <span className={styles.subjectName}>
              {subject.name}
              {picks[subject.code] && <span className={styles.pickedDot} aria-hidden="true" />}
            </span>
            <div className={styles.chips}>
              {subject.sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={styles.chip}
                  data-active={picks[subject.code] === section.id}
                  onClick={() => pickSection(subject.code, section.id)}
                >
                  <span className={styles.chipGroup}>{section.id}</span>
                  <span className={styles.chipTimes}>{summarizeBlocks(section)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {pickedCount === 0 ? (
        <p className={styles.hint}>Elige un grupo por materia arriba para armar tu horario a mano.</p>
      ) : (
        <>
          {conflicts.length > 0 && (
            <div className={styles.conflictBox}>
              <strong>
                {conflicts.length === 1 ? 'Hay un choque:' : `Hay ${conflicts.length} choques:`}
              </strong>
              <ul>
                {conflicts.map((c, i) => (
                  <li key={i}>
                    {c.subjectNameA} (grupo {c.sectionIdA}) se empalma con {c.subjectNameB} (grupo {c.sectionIdB}) el{' '}
                    {DAY_LABELS[c.day]}: {c.startA}–{c.endA} vs {c.startB}–{c.endB}.
                  </li>
                ))}
              </ul>
            </div>
          )}
          {conflicts.length === 0 && pickedCount === subjects.length && (
            <div className={styles.okBox}>Sin choques — este horario ya está completo y funciona.</div>
          )}
          <ScheduleGrid sections={chosen} />
        </>
      )}
    </div>
  );
}
