const MINUTE_MS = 60_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

function wallClockFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** How far the zone's wall clock is ahead of UTC at `instant`, in milliseconds. */
function utcOffsetAt(instant: Date, timeZone: string): number {
  const fields: Record<string, number> = {};
  for (const { type, value } of wallClockFormatter(timeZone).formatToParts(instant)) {
    fields[type] = Number(value);
  }

  const wallClockAsUtc = Date.UTC(
    fields.year ?? 0,
    (fields.month ?? 1) - 1,
    fields.day ?? 1,
    fields.hour ?? 0,
    fields.minute ?? 0,
  );
  const instantToTheMinute = Math.floor(instant.getTime() / MINUTE_MS) * MINUTE_MS;
  return wallClockAsUtc - instantToTheMinute;
}

/**
 * The instant at which the wall clock in `timeZone` shows `minutesFromMidnight`
 * on the calendar date `date` (YYYY-MM-DD).
 *
 * The offset depends on the instant being looked for, so it is resolved in two
 * passes: the first guess lands within a transition's width of the answer, and
 * the second uses the offset that is actually in force there. A wall time
 * skipped by a spring-forward change resolves to the time after the gap.
 */
export function instantAt(date: string, minutesFromMidnight: number, timeZone: string): Date {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, 0, minutesFromMidnight);

  const firstGuess = wallClockAsUtc - utcOffsetAt(new Date(wallClockAsUtc), timeZone);
  return new Date(wallClockAsUtc - utcOffsetAt(new Date(firstGuess), timeZone));
}

/** The calendar date `days` after `date` (YYYY-MM-DD); negative values go back. */
export function addDays(date: string, days: number): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
