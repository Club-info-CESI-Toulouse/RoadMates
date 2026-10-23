// Departure/arrival resolution from the estimated (free-flow) duration.
// No safety margin is added: computed times are the raw estimate.

const DAY_MIN = 24 * 60;

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const durationMinutes = (durationS: number) => Math.max(1, Math.round(durationS / 60));

export type ResolvedTimes =
  | { ok: true; departure: string; arrival: string; durationMin: number }
  | { ok: false; reason: "missing" | "too_short" | "out_of_day"; durationMin: number };

/**
 * Computes the missing time from the duration. When both are given, only the
 * "too short" case is blocked; a large gap is accepted.
 */
export function resolveTimes(
  departure: string | null,
  arrival: string | null,
  durationS: number,
): ResolvedTimes {
  const durationMin = durationMinutes(durationS);
  if (!departure && !arrival) return { ok: false, reason: "missing", durationMin };

  const dep = departure ? toMinutes(departure) : toMinutes(arrival!) - durationMin;
  const arr = arrival ? toMinutes(arrival) : toMinutes(departure!) + durationMin;

  if (departure && arrival && arr - dep < durationMin)
    return { ok: false, reason: "too_short", durationMin };
  if (dep < 0 || arr >= DAY_MIN) return { ok: false, reason: "out_of_day", durationMin };

  return { ok: true, departure: fromMinutes(dep), arrival: fromMinutes(arr), durationMin };
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}
