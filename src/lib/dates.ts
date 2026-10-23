// Calendar helpers in the app time zone (all trips are local to France).
export const APP_TIME_ZONE = "Europe/Paris";

const pad = (n: number) => String(n).padStart(2, "0");

/** YYYY-MM-DD of an instant in the app time zone. */
export function localDate(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Minutes since local midnight of an instant in the app time zone. */
export function localMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return get("hour") * 60 + get("minute");
}

/** Offset (minutes) of the app time zone from UTC at a given instant. */
function zoneOffsetMin(at: Date): number {
  const local = new Date(`${localDate(at)}T00:00:00Z`).getTime() + localMinutes(at) * 60_000;
  return Math.round((local - Math.floor(at.getTime() / 60_000) * 60_000) / 60_000);
}

/** Instant of a local date + minutes since midnight in the app time zone. */
export function zonedInstant(date: string, minutes: number): Date {
  const naive = new Date(`${date}T00:00:00Z`).getTime() + minutes * 60_000;
  // Two passes handle DST transitions.
  let at = new Date(naive - zoneOffsetMin(new Date(naive)) * 60_000);
  at = new Date(naive - zoneOffsetMin(at) * 60_000);
  return at;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: string): number {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

const WEEKDAY_SHORT = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export const weekdayShort = (date: string) => WEEKDAY_SHORT[isoWeekday(date) - 1];

/** e.g. "ven. 23 oct." */
export function formatDayLabel(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${weekdayShort(date)} ${d} ${MONTHS[m - 1]}`;
}

/** HH:MM in the app time zone. */
export function formatClock(at: Date | string): string {
  const m = localMinutes(new Date(at));
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}
