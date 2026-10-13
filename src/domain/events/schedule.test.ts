import { describe, expect, it } from 'vitest';
import { findSchedulePatchProblem, isOrderedSchedule, type EventSchedule } from './schedule.js';

const timed: EventSchedule = {
  startUtc: new Date('2026-10-12T09:00:00.000Z'),
  endUtc: new Date('2026-10-12T10:00:00.000Z'),
  timeZone: 'Europe/Madrid',
  startDate: null,
  endDate: null,
};

const allDay: EventSchedule = {
  startUtc: null,
  endUtc: null,
  timeZone: null,
  startDate: '2026-10-12',
  endDate: '2026-10-13',
};

describe('isOrderedSchedule', () => {
  it('accepts a timed event that ends after it starts', () => {
    expect(isOrderedSchedule('timed', timed)).toBe(true);
  });

  it('rejects a timed event with no duration', () => {
    expect(isOrderedSchedule('timed', { ...timed, endUtc: timed.startUtc })).toBe(false);
  });

  it('accepts an all-day event with an exclusive end date after the start', () => {
    expect(isOrderedSchedule('allDay', allDay)).toBe(true);
  });

  it('rejects an all-day event that ends on its start date', () => {
    expect(isOrderedSchedule('allDay', { ...allDay, endDate: '2026-10-12' })).toBe(false);
  });

  it('rejects a schedule missing the bounds of its kind', () => {
    expect(isOrderedSchedule('timed', allDay)).toBe(false);
    expect(isOrderedSchedule('allDay', timed)).toBe(false);
  });
});

describe('findSchedulePatchProblem', () => {
  it('accepts a patch that changes nothing about the schedule', () => {
    expect(findSchedulePatchProblem('timed', timed, {})).toBeNull();
  });

  it('accepts moving both bounds', () => {
    const patch = {
      startUtc: new Date('2026-10-12T14:00:00.000Z'),
      endUtc: new Date('2026-10-12T15:30:00.000Z'),
    };

    expect(findSchedulePatchProblem('timed', timed, patch)).toBeNull();
  });

  it('rejects a new end before the stored start', () => {
    const patch = { endUtc: new Date('2026-10-12T08:00:00.000Z') };

    expect(findSchedulePatchProblem('timed', timed, patch)).toEqual({
      reason: 'end_not_after_start',
    });
  });

  it('rejects a new start after the stored end', () => {
    const patch = { startUtc: new Date('2026-10-12T11:00:00.000Z') };

    expect(findSchedulePatchProblem('timed', timed, patch)).toEqual({
      reason: 'end_not_after_start',
    });
  });

  it('rejects all-day dates on a timed event', () => {
    expect(findSchedulePatchProblem('timed', timed, { startDate: '2026-10-12' })).toEqual({
      reason: 'fields_of_other_kind',
      fields: ['startDate'],
    });
  });

  it('rejects instants and a time zone on an all-day event', () => {
    const patch = { startUtc: new Date('2026-10-12T09:00:00.000Z'), timeZone: 'UTC' };

    expect(findSchedulePatchProblem('allDay', allDay, patch)).toEqual({
      reason: 'fields_of_other_kind',
      fields: ['startUtc', 'timeZone'],
    });
  });

  it('rejects an all-day end date that is not after the stored start date', () => {
    expect(findSchedulePatchProblem('allDay', allDay, { endDate: '2026-10-12' })).toEqual({
      reason: 'end_not_after_start',
    });
  });
});
