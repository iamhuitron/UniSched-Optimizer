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
  const [customSubjects, setCustomSubjects] = useState<Subject[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({});

  // Form state for adding custom course
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubjName, setNewSubjName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newProfName, setNewProfName] = useState('');
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 2]); // Mon, Wed default

  const allSubjects = useMemo(() => [...subjects, ...customSubjects], [subjects, customSubjects]);

  function pickSection(subjectCode: string, sectionId: string) {
    setPicks((prev) => ({
      ...prev,
      [subjectCode]: prev[subjectCode] === sectionId ? '' : sectionId,
    }));
  }

  function toggleDay(day: number) {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  function handleAddSubject(e: React.FormEvent) {
    e.preventDefault();
    const name = newSubjName.trim();
    const group = newGroupName.trim() || '101';
    if (!name || selectedDays.length === 0) return;

    const code = `CUSTOM-${Date.now()}`;
    const newSubject: Subject = {
      code,
      name,
      sections: [
        {
          id: group,
          professor: newProfName.trim() || undefined,
          blocks: selectedDays.map((day) => ({
            day: day as any,
            start: newStartTime,
            end: newEndTime,
          })),
        },
      ],
    };

    setCustomSubjects((prev) => [...prev, newSubject]);
    setPicks((prev) => ({ ...prev, [code]: group }));
    setNewSubjName('');
    setNewGroupName('');
    setNewProfName('');
    setShowAddForm(false);
  }

  const chosen: ChosenSection[] = useMemo(() => {
    const result: ChosenSection[] = [];
    for (const subject of allSubjects) {
      const sectionId = picks[subject.code];
      if (!sectionId) continue;
      const section = subject.sections.find((s) => s.id === sectionId);
      if (section) result.push({ subjectCode: subject.code, subjectName: subject.name, section });
    }
    return result;
  }, [allSubjects, picks]);

  const conflicts = useMemo(() => findConflicts(chosen), [chosen]);
  const pickedCount = Object.values(picks).filter(Boolean).length;

  return (
    <div className={styles.wrap}>
      <div className={styles.progress}>
        {pickedCount} de {allSubjects.length} materias elegidas
      </div>

      <div className={styles.pickers}>
        {allSubjects.map((subject) => (
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

        {!showAddForm ? (
          <button type="button" className={styles.addSubjectBtn} onClick={() => setShowAddForm(true)}>
            + Agregar materia o grupo a mano
          </button>
        ) : (
          <form className={styles.customForm} onSubmit={handleAddSubject}>
            <h4 className={styles.customFormTitle}>Agregar materia manualmente</h4>
            <div className={styles.customFormRow}>
              <input
                type="text"
                placeholder="Nombre de la materia (ej. Cálculo I)"
                className={styles.customInput}
                value={newSubjName}
                onChange={(e) => setNewSubjName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Grupo (ej. 1301)"
                className={styles.customInput}
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Profesor (opcional)"
                className={styles.customInput}
                value={newProfName}
                onChange={(e) => setNewProfName(e.target.value)}
              />
            </div>

            <div className={styles.customFormRow}>
              <div className={styles.daysSelect}>
                <span>Días:</span>
                {DAY_LABELS.slice(0, 6).map((label, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={styles.dayBtn}
                    data-active={selectedDays.includes(idx)}
                    onClick={() => toggleDay(idx)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className={styles.daysSelect}>
                <span>Horario:</span>
                <input
                  type="time"
                  className={styles.customInput}
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  style={{ minWidth: '85px', flex: 'none' }}
                />
                <span>a</span>
                <input
                  type="time"
                  className={styles.customInput}
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  style={{ minWidth: '85px', flex: 'none' }}
                />
              </div>
            </div>

            <div className={styles.customActions}>
              <button type="submit" className={styles.saveBtn}>
                Guardar materia
              </button>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowAddForm(false)}>
                Cancelar
              </button>
            </div>
          </form>
        )}
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
