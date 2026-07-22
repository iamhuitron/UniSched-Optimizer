'use client';

import { useState } from 'react';
import type { DayIndex, Preferences, Subject } from '@/lib/types';
import styles from './PreferencesForm.module.css';

const DAYS: { value: DayIndex; label: string }[] = [
  { value: 0, label: 'Lun' },
  { value: 1, label: 'Mar' },
  { value: 2, label: 'Mié' },
  { value: 3, label: 'Jue' },
  { value: 4, label: 'Vie' },
  { value: 5, label: 'Sáb' },
];

export default function PreferencesForm({
  subjects,
  onSubmit,
}: {
  subjects: Subject[];
  onSubmit: (prefs: Preferences) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(subjects.map((s) => s.code)));
  const [earliestStart, setEarliestStart] = useState('');
  const [latestEnd, setLatestEnd] = useState('');
  const [daysOff, setDaysOff] = useState<Set<DayIndex>>(new Set());

  function toggleSubject(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleDay(day: DayIndex) {
    setDaysOff((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      requiredSubjectCodes: Array.from(selected),
      earliestStart: earliestStart || undefined,
      latestEnd: latestEnd || undefined,
      daysOff: daysOff.size ? Array.from(daysOff) : undefined,
      maxResults: 5,
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <fieldset className={styles.fieldset}>
        <legend>Materias de este semestre</legend>
        <div className={styles.subjectList}>
          {subjects.map((s) => (
            <label key={s.code} className={styles.checkRow}>
              <input type="checkbox" checked={selected.has(s.code)} onChange={() => toggleSubject(s.code)} />
              <span>
                {s.name}
                {s.credits !== undefined ? ` · ${s.credits} créditos` : ''}
                <span className={styles.sectionCount}> ({s.sections.length} grupos)</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Ventana de horario</legend>
        <div className={styles.timeRow}>
          <label className={styles.timeField}>
            No entrar antes de
            <input type="time" value={earliestStart} onChange={(e) => setEarliestStart(e.target.value)} />
          </label>
          <label className={styles.timeField}>
            No salir después de
            <input type="time" value={latestEnd} onChange={(e) => setLatestEnd(e.target.value)} />
          </label>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Días que quieres libres</legend>
        <div className={styles.dayRow}>
          {DAYS.map((d) => (
            <label key={d.value} className={styles.dayChip} data-checked={daysOff.has(d.value)}>
              <input type="checkbox" checked={daysOff.has(d.value)} onChange={() => toggleDay(d.value)} />
              {d.label}
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" className={styles.submit} disabled={selected.size === 0}>
        Generar mejores horarios
      </button>
    </form>
  );
}
