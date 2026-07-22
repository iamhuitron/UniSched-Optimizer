'use client';

import { useState } from 'react';
import type { Preferences, ScheduleDataset, ScheduleOption } from '@/lib/types';
import { solve } from '@/lib/solver';
import UploadPanel from '@/components/UploadPanel';
import PreferencesForm from '@/components/PreferencesForm';
import ResultsList from '@/components/ResultsList';
import styles from './page.module.css';

export default function Home() {
  const [dataset, setDataset] = useState<ScheduleDataset | null>(null);
  const [options, setOptions] = useState<ScheduleOption[] | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);

  async function loadDemo() {
    setLoadingDemo(true);
    try {
      const res = await fetch('/fixtures/fes-cuautitlan-3er-semestre.json');
      const data = (await res.json()) as ScheduleDataset;
      setDataset(data);
    } finally {
      setLoadingDemo(false);
    }
  }

  function handlePrefs(prefs: Preferences) {
    if (!dataset) return;
    setOptions(solve(dataset.subjects, prefs));
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.h1}>horario-óptimo</h1>
      <p className={styles.subhead}>
        Sube el horario oficial de tu universidad, dile tus restricciones, y obtén las mejores combinaciones de
        grupos sin choques.
      </p>

      {!dataset && (
        <div className={styles.step}>
          <UploadPanel onExtracted={setDataset} />
          <button type="button" className={styles.demoLink} onClick={loadDemo} disabled={loadingDemo}>
            {loadingDemo ? 'Cargando…' : 'O prueba con el ejemplo real de FES Cuautitlán →'}
          </button>
        </div>
      )}

      {dataset && !options && (
        <div className={styles.step}>
          <p className={styles.meta}>
            {dataset.institution}
            {dataset.program ? ` · ${dataset.program}` : ''}
            {dataset.term ? ` · ${dataset.term}` : ''} — {dataset.subjects.length} materias detectadas
          </p>
          <PreferencesForm subjects={dataset.subjects} onSubmit={handlePrefs} />
          <button type="button" className={styles.demoLink} onClick={() => setDataset(null)}>
            ← Subir otro archivo
          </button>
        </div>
      )}

      {dataset && options && (
        <div className={styles.step}>
          <button type="button" className={styles.demoLink} onClick={() => setOptions(null)}>
            ← Ajustar restricciones
          </button>
          <ResultsList options={options} />
        </div>
      )}
    </main>
  );
}
