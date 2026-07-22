'use client';

import type { ScheduleOption, TimeBlock } from '@/lib/types';
import styles from './ScheduleGrid.module.css';

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function parseTime(t: string): { h: number; m: number } {
  const parts = t.split(':');
  return { h: Number(parts[0] ?? 0), m: Number(parts[1] ?? 0) };
}

// earliest/latest hour shown adapts to the data instead of always spanning 7:00-21:00,
// so a purely-morning schedule doesn't render nine empty evening rows
function hourRange(blocks: TimeBlock[]): { first: number; last: number } {
  const starts = blocks.map((b) => parseTime(b.start).h);
  const ends = blocks.map((b) => {
    const { h, m } = parseTime(b.end);
    return m > 0 ? h + 1 : h;
  });
  return {
    first: Math.max(0, Math.min(...starts) - 1),
    last: Math.min(23, Math.max(...ends) + 1),
  };
}

function slot(t: string, firstHour: number): number {
  const { h, m } = parseTime(t);
  return (h - firstHour) * 2 + (m >= 30 ? 2 : 1);
}

function rowRange(a: string, b: string, firstHour: number): string {
  return `${slot(a, firstHour) + 1} / ${slot(b, firstHour) + 1}`;
}

const PALETTE = ['#3b5a80', '#6b4c8a', '#b8641c', '#2f7d5c', '#a63d4f', '#1e7a80', '#7a6a3d', '#4a5a8a'];

function colorFor(code: string, allCodes: string[]): string {
  const idx = Math.max(0, allCodes.indexOf(code));
  return PALETTE[idx % PALETTE.length] ?? '#4a4a4a';
}

export default function ScheduleGrid({ option }: { option: ScheduleOption }) {
  const allBlocks = option.sections.flatMap((s) =>
    s.section.blocks.map((b) => ({ ...b, subjectCode: s.subjectCode, subjectName: s.subjectName }))
  );
  const codes = Array.from(new Set(option.sections.map((s) => s.subjectCode)));
  const daysPresent = Array.from(new Set(allBlocks.map((b) => b.day))).sort((a, b) => a - b);
  const dayCols = daysPresent.length > 0 ? daysPresent : [0, 1, 2, 3, 4];
  const { first, last } = hourRange(allBlocks);
  const hourCount = last - first;
  const hourMarks = Array.from({ length: hourCount + 1 }, (_, i) => first + i);

  return (
    <div className={styles.wrap}>
      <div className={styles.board}>
        <div
          className={styles.grid}
          style={{
            gridTemplateColumns: `52px repeat(${dayCols.length}, 108px)`,
            gridTemplateRows: `34px repeat(${hourCount * 2}, 19px)`,
          }}
        >
          {dayCols.map((day, i) => (
            <div key={'col' + day} className={styles.daycol} style={{ gridColumn: `${i + 2} / ${i + 3}` }} />
          ))}
          {hourMarks.map((h) => (
            <div
              key={'line' + h}
              className={styles.hline}
              style={{ gridColumn: `1 / ${dayCols.length + 2}`, gridRow: slot(`${h}:00`, first) + 1 }}
            />
          ))}
          {dayCols.map((day, i) => (
            <div key={'head' + day} className={styles.head} style={{ gridColumn: `${i + 2} / ${i + 3}` }}>
              {DAY_LABELS[day]}
            </div>
          ))}
          {hourMarks.slice(0, -1).map((h) => (
            <div
              key={'time' + h}
              className={styles.time}
              style={{ gridColumn: '1 / 2', gridRow: `${slot(`${h}:00`, first) + 1} / ${slot(`${h}:00`, first) + 2}` }}
            >
              {h}:00
            </div>
          ))}
          {allBlocks.map((b, i) => {
            const colIndex = dayCols.indexOf(b.day);
            if (colIndex === -1) return null;
            const span = slot(b.end, first) - slot(b.start, first);
            return (
              <div
                key={i}
                className={styles.ev}
                style={{
                  gridColumn: `${colIndex + 2} / ${colIndex + 3}`,
                  gridRow: rowRange(b.start, b.end, first),
                  background: colorFor(b.subjectCode, codes),
                }}
              >
                <b>{b.subjectName}</b>
                <span>
                  {b.start}–{b.end}
                </span>
                {span >= 3 && b.room && <span>{b.room}</span>}
              </div>
            );
          })}
        </div>
      </div>
      <div className={styles.legend}>
        {option.sections.map((s) => (
          <div key={s.subjectCode} className={styles.legendItem}>
            <span className={styles.dot} style={{ background: colorFor(s.subjectCode, codes) }} />
            <span>
              {s.subjectName} — grupo {s.section.id}
              {s.section.professor ? ` · ${s.section.professor}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
