'use client';

import { useState } from 'react';
import type { ScheduleDataset } from '@/lib/types';
import styles from './UploadPanel.module.css';

export default function UploadPanel({ onExtracted }: { onExtracted: (dataset: ScheduleDataset) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Elige un PDF o una imagen primero.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      if (hint.trim()) form.append('hint', hint.trim());
      const res = await fetch('/api/extract', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo leer el archivo.');
      onExtracted(data.dataset as ScheduleDataset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.dropzone}>
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className={styles.fileInput}
        />
        <span className={styles.dropzoneTitle}>{file ? file.name : 'Sube el PDF o la imagen de tu horario'}</span>
        <span className={styles.dropzoneSub}>PDF, JPG, PNG o WEBP · máx. 15MB</span>
      </label>

      <label className={styles.hintLabel}>
        Contexto opcional (universidad, facultad, semestre)
        <input
          type="text"
          className={styles.hintInput}
          placeholder="ej. Facultad de Ingeniería, UANL, 4to semestre"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
        />
      </label>

      <button type="submit" className={styles.submit} disabled={loading}>
        {loading ? 'Leyendo el horario…' : 'Leer materias y horarios'}
      </button>

      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}
