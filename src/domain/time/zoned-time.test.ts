import { describe, expect, it } from 'vitest';
import { addDays, instantAt } from './zoned-time.js';

const NINE_AM = 9 * 60;

function iso(date: string, minutes: number, timeZone: string): string {
  return instantAt(date, minutes, timeZone).toISOString();
}

describe('instantAt', () => {
  it('is the same clock time in UTC', () => {
    expect(iso('2026-10-12', NINE_AM, 'UTC')).toBe('2026-10-12T09:00:00.000Z');
  });

  it('is earlier in UTC for a zone east of it, in summer and in winter', () => {
    expect(iso('2026-07-01', NINE_AM, 'Europe/Madrid')).toBe('2026-07-01T07:00:00.000Z');
    expect(iso('2026-12-01', NINE_AM, 'Europe/Madrid')).toBe('2026-12-01T08:00:00.000Z');
  });

  it('is later in UTC for a zone west of it', () => {
    expect(iso('2026-10-12', NINE_AM, 'America/New_York')).toBe('2026-10-12T13:00:00.000Z');
  });

  it('can land on the previous UTC date', () => {
    expect(iso('2026-10-12', 0, 'Europe/Madrid')).toBe('2026-10-11T22:00:00.000Z');
  });

  it('handles half-hour and 45-minute offsets', () => {
    expect(iso('2026-10-12', NINE_AM, 'Asia/Kolkata')).toBe('2026-10-12T03:30:00.000Z');
    expect(iso('2026-10-12', NINE_AM, 'Asia/Kathmandu')).toBe('2026-10-12T03:15:00.000Z');
  });

  it('uses the offset in force on each side of an autumn change', () => {
    // Madrid goes from UTC+2 to UTC+1 at 03:00 local on 2026-10-25.
    expect(iso('2026-10-25', 60, 'Europe/Madrid')).toBe('2026-10-24T23:00:00.000Z');
    expect(iso('2026-10-25', 4 * 60, 'Europe/Madrid')).toBe('2026-10-25T03:00:00.000Z');
  });

  it('uses the offset in force on each side of a spring change', () => {
    // Madrid goes from UTC+1 to UTC+2 at 02:00 local on 2026-03-29.
    expect(iso('2026-03-29', 60, 'Europe/Madrid')).toBe('2026-03-29T00:00:00.000Z');
    expect(iso('2026-03-29', 4 * 60, 'Europe/Madrid')).toBe('2026-03-29T02:00:00.000Z');
  });

  it('resolves a wall time skipped by a spring change to the time after the gap', () => {
    // 02:30 does not exist in Madrid on 2026-03-29; the clock reads 03:30 at that instant.
    expect(iso('2026-03-29', 150, 'Europe/Madrid')).toBe('2026-03-29T01:30:00.000Z');
  });
});

describe('addDays', () => {
  it('moves forward across a month and a year', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('moves back, and leaves the date alone for zero', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-10-12', 0)).toBe('2026-10-12');
  });
});
