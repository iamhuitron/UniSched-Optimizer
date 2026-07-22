import type { DayIndex, TimeBlock } from './types';

/** "HH:MM" -> minutes since 00:00. Accepts single-digit hours ("9:30"). */
export function toMinutes(t: string): number {
  const parts = t.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  return h * 60 + m;
}

/** minutes since 00:00 -> "HH:MM" */
export function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** True if two blocks are on the same day and their time ranges intersect. */
export function blocksOverlap(
  a: Pick<TimeBlock, 'day' | 'start' | 'end'>,
  b: Pick<TimeBlock, 'day' | 'start' | 'end'>
): boolean {
  if (a.day !== b.day) return false;
  return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

/** Total idle minutes between consecutive blocks on the same day, summed across all days used. */
export function computeGapMinutes(blocks: TimeBlock[]): number {
  const byDay = new Map<DayIndex, TimeBlock[]>();
  for (const b of blocks) {
    const list = byDay.get(b.day) ?? [];
    list.push(b);
    byDay.set(b.day, list);
  }
  let total = 0;
  for (const dayBlocks of byDay.values()) {
    const sorted = [...dayBlocks].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    for (let i = 1; i < sorted.length; i++) {
      const curr = sorted[i];
      const prev = sorted[i - 1];
      if (!curr || !prev) continue; // unreachable: i < sorted.length is the loop invariant here
      const gap = toMinutes(curr.start) - toMinutes(prev.end);
      if (gap > 0) total += gap;
    }
  }
  return total;
}

export function daysUsed(blocks: TimeBlock[]): DayIndex[] {
  return Array.from(new Set(blocks.map((b) => b.day))).sort((a, b) => a - b) as DayIndex[];
}
