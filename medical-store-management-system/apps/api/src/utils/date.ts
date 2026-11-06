/**
 * Date utility helpers for inventory, batch expiry, and dashboard queries.
 * Standardized on Asia/Kolkata timezone as required by pharmacy regulatory guidelines.
 */

export const STORE_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns today's calendar date string in Asia/Kolkata (YYYY-MM-DD).
 */
export function getTodayKolkataString(refDate = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: STORE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(refDate);
}

/**
 * Returns a Date object representing 00:00:00.000 on the start of day in Kolkata.
 */
export function startOfDayKolkata(refDate = new Date()): Date {
  const dateStr = getTodayKolkataString(refDate);
  return new Date(`${dateStr}T00:00:00.000+05:30`);
}

/**
 * Returns a Date object representing 23:59:59.999 on the end of day in Kolkata.
 */
export function endOfDayKolkata(refDate = new Date()): Date {
  const dateStr = getTodayKolkataString(refDate);
  return new Date(`${dateStr}T23:59:59.999+05:30`);
}

export function startOfDay(date: Date): Date {
  return startOfDayKolkata(date);
}

export function endOfDay(date: Date): Date {
  return endOfDayKolkata(date);
}
