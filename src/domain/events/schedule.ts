export type EventKind = 'timed' | 'allDay';

/** When an event happens. A timed event uses the instants, an all-day event the dates. */
export interface EventSchedule {
  startUtc: Date | null;
  endUtc: Date | null;
  timeZone: string | null;
  startDate: string | null;
  endDate: string | null;
}

export type SchedulePatch = Partial<EventSchedule>;

export type ScheduleProblem =
  | { reason: 'fields_of_other_kind'; fields: (keyof EventSchedule)[] }
  | { reason: 'end_not_after_start' };

const TIMED_FIELDS = ['startUtc', 'endUtc', 'timeZone'] as const;
const ALL_DAY_FIELDS = ['startDate', 'endDate'] as const;

function endsAfterStart<T extends Date | string>(start: T | null, end: T | null): boolean {
  return start !== null && end !== null && end > start;
}

/** Whether the schedule is a complete, ordered one for its kind. */
export function isOrderedSchedule(kind: EventKind, schedule: EventSchedule): boolean {
  return kind === 'timed'
    ? endsAfterStart(schedule.startUtc, schedule.endUtc)
    : endsAfterStart(schedule.startDate, schedule.endDate);
}

/**
 * Checks a partial change against the event it would be applied to. A patch
 * can move one bound only, so the rule has to hold for the merged schedule,
 * not for the fields that happen to be in the request.
 */
export function findSchedulePatchProblem(
  kind: EventKind,
  current: EventSchedule,
  patch: SchedulePatch,
): ScheduleProblem | null {
  const otherKindFields = kind === 'timed' ? ALL_DAY_FIELDS : TIMED_FIELDS;
  const misplaced = otherKindFields.filter((field) => patch[field] !== undefined);
  if (misplaced.length > 0) {
    return { reason: 'fields_of_other_kind', fields: misplaced };
  }

  return isOrderedSchedule(kind, { ...current, ...patch })
    ? null
    : { reason: 'end_not_after_start' };
}
