'use client';

import { useState } from 'react';
import type { ScheduleDataset } from '@/lib/types';
import styles from './UploadPanel.module.css';

interface ExtractWarning {
  page: number;
  message: string;
}

export default function UploadPanel({ onExtracted }: { onExtracted: (dataset: ScheduleDataset) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<ExtractWarning[]>([]);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(f: File | null) {
    setFile(f);
    setError(null);
    setWarnings([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Elige un PDF o una imagen primero.');
      return;
    }
    setLoading(true);
    setError(null);
    setWarnings([]);
    try {
      const form = new FormData();
      form.append('file', file);
      if (hint.trim()) form.append('hint', hint.trim());
      const res = await fetch('/api/extract', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo leer el archivo.');
      if (Array.isArray(data.warnings) && data.warnings.length > 0) setWarnings(data.warnings);
      onExtracted(data.dataset as ScheduleDataset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label
        className={styles.dropzone}
        data-dragover={dragOver}
        data-has-file={Boolean(file)}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0] ?? null);
        }}
      >
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          className={styles.fileInput}
        />
        <svg className={styles.icon} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3v12m0-12 4 4m-4-4-4 4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className={styles.dropzoneTitle}>{file ? file.name : 'Sube el PDF o la imagen de tu horario'}</span>
        <span className={styles.dropzoneSub}>
          {file ? 'Listo — puedes cambiarlo o continuar abajo' : 'Arrastra el archivo aquí, o haz clic · PDF, JPG, PNG o WEBP · máx. 15MB'}
        </span>
      </label>

      <label className={styles.hintLabel}>
        Nombre de la universidad/facultad (opcional, para etiquetar el resultado)
        <input
          type="text"
          className={styles.hintInput}
          placeholder="ej. Facultad de Ingeniería, UANL"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
        />
      </label>

      <button type="submit" className={styles.submit} disabled={loading}>
        {loading && <span className={styles.spinner} aria-hidden="true" />}
        {loading ? 'Leyendo el horario…' : 'Leer materias y horarios'}
      </button>

      {error && <p className={styles.error}>{error}</p>}
      {warnings.length > 0 && (
        <div className={styles.warnings}>
          <strong>Revisa esto antes de continuar:</strong>
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
