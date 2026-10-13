import { describe, expect, it } from 'vitest';
import { isTimeZone, localDateOf, localDateSpan } from './local-date.js';

describe('localDateOf', () => {
  it('returns the UTC date in UTC', () => {
    expect(localDateOf(new Date('2026-10-12T23:59:59.999Z'), 'UTC')).toBe('2026-10-12');
  });

  it('moves to the next date east of UTC', () => {
    expect(localDateOf(new Date('2026-10-11T22:00:00.000Z'), 'Europe/Madrid')).toBe('2026-10-12');
  });

  it('stays on the previous date west of UTC', () => {
    expect(localDateOf(new Date('2026-10-12T02:00:00.000Z'), 'America/New_York')).toBe(
      '2026-10-11',
    );
  });

  it('follows the offset change on a daylight saving transition', () => {
    // Madrid leaves summer time on 2026-10-25: midnight is 22:00Z before, 23:00Z after.
    expect(localDateOf(new Date('2026-10-24T22:00:00.000Z'), 'Europe/Madrid')).toBe('2026-10-25');
    expect(localDateOf(new Date('2026-10-25T22:30:00.000Z'), 'Europe/Madrid')).toBe('2026-10-25');
    expect(localDateOf(new Date('2026-10-25T23:00:00.000Z'), 'Europe/Madrid')).toBe('2026-10-26');
  });

  it('handles a half-hour offset', () => {
    expect(localDateOf(new Date('2026-10-12T18:29:00.000Z'), 'Asia/Kolkata')).toBe('2026-10-12');
    expect(localDateOf(new Date('2026-10-12T18:30:00.000Z'), 'Asia/Kolkata')).toBe('2026-10-13');
  });
});

describe('localDateSpan', () => {
  it('covers one date for a local day', () => {
    const span = localDateSpan(
      new Date('2026-10-11T22:00:00.000Z'),
      new Date('2026-10-12T22:00:00.000Z'),
      'Europe/Madrid',
    );

    expect(span).toEqual({ first: '2026-10-12', last: '2026-10-12' });
  });

  it('covers seven dates for a local week', () => {
    const span = localDateSpan(
      new Date('2026-10-12T04:00:00.000Z'),
      new Date('2026-10-19T04:00:00.000Z'),
      'America/New_York',
    );

    expect(span).toEqual({ first: '2026-10-12', last: '2026-10-18' });
  });

  it('includes the date a range ends inside', () => {
    const span = localDateSpan(
      new Date('2026-10-12T10:00:00.000Z'),
      new Date('2026-10-13T00:00:00.001Z'),
      'UTC',
    );

    expect(span).toEqual({ first: '2026-10-12', last: '2026-10-13' });
  });
});

describe('isTimeZone', () => {
  it('accepts IANA zones and UTC', () => {
    expect(isTimeZone('Europe/Madrid')).toBe(true);
    expect(isTimeZone('UTC')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isTimeZone('Mars/Olympus_Mons')).toBe(false);
    expect(isTimeZone('')).toBe(false);
  });
});
