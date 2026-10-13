const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    // en-CA formats a date as YYYY-MM-DD, the same shape all-day events are stored in.
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

export function isTimeZone(value: string): boolean {
  try {
    formatterFor(value);
    return true;
  } catch {
    return false;
  }
}

/** The calendar date (YYYY-MM-DD) an instant falls on for someone in `timeZone`. */
export function localDateOf(instant: Date, timeZone: string): string {
  return formatterFor(timeZone).format(instant);
}

export interface LocalDateSpan {
  first: string;
  last: string;
}

/**
 * The calendar dates touched by the half-open instant range `[from, to)` in
 * `timeZone`. A range that ends exactly at local midnight does not touch the
 * day that starts there.
 */
export function localDateSpan(from: Date, to: Date, timeZone: string): LocalDateSpan {
  return {
    first: localDateOf(from, timeZone),
    last: localDateOf(new Date(to.getTime() - 1), timeZone),
  };
}
