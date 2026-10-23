import type { SLOTS, TRIP_ROLES } from "./constants";

// ISO weekdays: 1 = Monday … 7 = Sunday.
export const WEEKDAYS = [
  { value: 1, short: "L", long: "Lundi" },
  { value: 2, short: "M", long: "Mardi" },
  { value: 3, short: "M", long: "Mercredi" },
  { value: 4, short: "J", long: "Jeudi" },
  { value: 5, short: "V", long: "Vendredi" },
  { value: 6, short: "S", long: "Samedi" },
  { value: 7, short: "D", long: "Dimanche" },
] as const;

export const ROLE_LABELS: Record<(typeof TRIP_ROLES)[number], string> = {
  driver: "Conducteur",
  passenger: "Passager",
};

export const SLOT_LABELS: Record<(typeof SLOTS)[number], string> = {
  morning: "Matin",
  evening: "Soir",
};

export function formatWeekdays(days: number[]): string {
  const sorted = [...days].sort();
  if (sorted.join() === "1,2,3,4,5") return "Du lundi au vendredi";
  if (sorted.length === 7) return "Tous les jours";
  return sorted.map((d) => WEEKDAYS[d - 1].long.slice(0, 3) + ".").join(" ");
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
