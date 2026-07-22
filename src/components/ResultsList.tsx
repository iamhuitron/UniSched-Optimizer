'use client';

import { useState } from 'react';
import type { ScheduleOption } from '@/lib/types';
import ScheduleGrid from './ScheduleGrid';
import styles from './ResultsList.module.css';

const DAY_LABELS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

export default function ResultsList({ options }: { options: ScheduleOption[] }) {
  const [active, setActive] = useState(0);

  if (options.length === 0) {
    return (
      <p className={styles.empty}>
        No encontramos ninguna combinación que cumpla todas las restricciones a la vez. Prueba quitando una
        restricción — normalmente la ventana de horario o el día libre es la que deja sin opciones a alguna materia.
      </p>
    );
  }

  const option = options[active] ?? options[0];
  if (!option) return null; // unreachable: the length === 0 case already returned above

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs}>
        {options.map((o, i) => (
          <button
            key={i}
            type="button"
            className={styles.tab}
            data-active={i === active}
            onClick={() => setActive(i)}
          >
            Opción {i + 1}
          </button>
        ))}
      </div>

      <div className={styles.stats}>
        <span>{option.stats.daysUsed.map((d) => DAY_LABELS[d]).join(', ')}</span>
        <span>
          {option.stats.earliestStart}–{option.stats.latestEnd}
        </span>
        <span>{option.stats.weeklyHours} hrs/semana</span>
        <span>{option.stats.totalGapMinutes} min de huecos</span>
      </div>

      <ScheduleGrid option={option} />
    </div>
  );
}
