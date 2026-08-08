'use client';

import { useState } from 'react';
import { CATALOG, type CatalogEntry } from '@/lib/catalog';
import type { ScheduleDataset } from '@/lib/types';
import styles from './CatalogBrowser.module.css';

/** groups entries by career so "Informática" shows its 6 semester buttons
 *  together instead of as 6 separate unrelated-looking rows */
function groupByCareer(entries: CatalogEntry[]): { careerName: string; entries: CatalogEntry[] }[] {
  const order: string[] = [];
  const byCareer = new Map<string, CatalogEntry[]>();
  for (const entry of entries) {
    if (!byCareer.has(entry.careerName)) {
      byCareer.set(entry.careerName, []);
      order.push(entry.careerName);
    }
    byCareer.get(entry.careerName)!.push(entry);
  }
  return order.map((careerName) => ({ careerName, entries: byCareer.get(careerName)! }));
}

export default function CatalogBrowser({ onSelect }: { onSelect: (dataset: ScheduleDataset) => void }) {
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadEntry(entry: CatalogEntry) {
    if (!entry.datasetPath) return;
    setLoadingId(entry.id);
    setError(null);
    try {
      const res = await fetch(entry.datasetPath);
      if (!res.ok) throw new Error('No se pudo cargar ese catálogo.');
      const data = (await res.json()) as ScheduleDataset;
      onSelect(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? 'Ocultar catálogo ↑' : 'Explorar catálogo de universidades →'}
      </button>

      {open && (
        <div className={styles.panel}>
          {CATALOG.map((uni) => (
            <div key={uni.id} className={styles.university}>
              <div className={styles.uniHeader}>
                <span className={styles.uniShort}>{uni.shortName}</span>
                <span className={styles.uniName}>{uni.name}</span>
              </div>
              <div className={styles.faculties}>
                {uni.faculties.map((fac) => (
                  <div key={fac.id} className={styles.faculty}>
                    <div className={styles.facultyHead}>
                      <span className={styles.facultyName}>{fac.name}</span>
                      {fac.entries.length === 0 && <span className={styles.soon}>Próximamente</span>}
                    </div>

                    {fac.entries.length > 0 && (
                      <div className={styles.careers}>
                        {groupByCareer(fac.entries).map((group) => {
                          const available = group.entries.filter((e) => e.datasetPath);
                          return (
                            <div key={group.careerName} className={styles.careerRow}>
                              <span className={styles.careerName}>{group.careerName}</span>
                              {available.length === 0 ? (
                                <span className={styles.soon}>Próximamente</span>
                              ) : (
                                <div className={styles.entries}>
                                  {available.map((entry) => (
                                    <button
                                      key={entry.id}
                                      type="button"
                                      className={styles.entryBtn}
                                      disabled={loadingId === entry.id}
                                      onClick={() => loadEntry(entry)}
                                    >
                                      {loadingId === entry.id ? 'Cargando…' : entry.detail || entry.careerName}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {error && <p className={styles.error}>{error}</p>}

          <p className={styles.contribute}>
            ¿Tienes el PDF de tu universidad? Súbelo arriba — el catálogo crece con cada dataset que alguien
            verifica y agrega al repositorio.
          </p>
        </div>
      )}
    </div>
  );
}
