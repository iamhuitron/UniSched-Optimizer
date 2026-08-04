'use client';

import { useState } from 'react';
import type { Preferences, ScheduleDataset, ScheduleOption } from '@/lib/types';
import { solve } from '@/lib/solver';
import UploadPanel from '@/components/UploadPanel';
import PreferencesForm from '@/components/PreferencesForm';
import ResultsList from '@/components/ResultsList';
import ManualBuilder from '@/components/ManualBuilder';
import styles from './page.module.css';

type Mode = 'auto' | 'manual';

export default function Home() {
  const [dataset, setDataset] = useState<ScheduleDataset | null>(null);
  const [mode, setMode] = useState<Mode>('auto');
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

  function reset() {
    setDataset(null);
    setOptions(null);
    setMode('auto');
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Planeador de horarios universitarios</span>
        <h1 className={styles.h1}>horario-óptimo</h1>
        {!dataset && (
          <p className={styles.subhead}>
            Sube el horario oficial de tu universidad, dile tus restricciones, y obtén las mejores combinaciones de
            grupos sin choques. O arma el tuyo a mano y te avisamos si algo se empalma.
          </p>
        )}
      </header>

      {!dataset && (
        <div className={styles.card}>
          <UploadPanel onExtracted={setDataset} />
          <button type="button" className={styles.demoLink} onClick={loadDemo} disabled={loadingDemo}>
            {loadingDemo ? (
              <>
                <span className={styles.spinner} aria-hidden="true" /> Cargando…
              </>
            ) : (
              'O prueba con el ejemplo real de FES Cuautitlán →'
            )}
          </button>
        </div>
      )}

      {dataset && (
        <div className={styles.working}>
          <div className={styles.datasetBar}>
            <div className={styles.datasetInfo}>
              <span className={styles.datasetName}>{dataset.institution}</span>
              <span className={styles.datasetMeta}>
                {[dataset.program, dataset.term].filter(Boolean).join(' · ')}
                {dataset.program || dataset.term ? ' · ' : ''}
                {dataset.subjects.length} materias detectadas
              </span>
            </div>
            <button type="button" className={styles.changeFile} onClick={reset}>
              Cambiar archivo
            </button>
          </div>

          <div className={styles.modeTabs}>
            <button
              type="button"
              className={styles.modeTab}
              data-active={mode === 'auto'}
              onClick={() => setMode('auto')}
            >
              Automático
              <span>que lo arme la computadora</span>
            </button>
            <button
              type="button"
              className={styles.modeTab}
              data-active={mode === 'manual'}
              onClick={() => {
                setMode('manual');
                setOptions(null);
              }}
            >
              Manual
              <span>lo armo yo, grupo por grupo</span>
            </button>
          </div>

          <div className={styles.card}>
            {mode === 'auto' && !options && <PreferencesForm subjects={dataset.subjects} onSubmit={handlePrefs} />}

            {mode === 'auto' && options && (
              <>
                <button type="button" className={styles.backLink} onClick={() => setOptions(null)}>
                  ← Ajustar restricciones
                </button>
                <ResultsList options={options} />
              </>
            )}

            {mode === 'manual' && <ManualBuilder subjects={dataset.subjects} />}
          </div>
        </div>
      )}
    </main>
  );
}
