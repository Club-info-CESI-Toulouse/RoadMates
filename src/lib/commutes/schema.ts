import { z } from "zod";
import { DRIVER_SEATS, FLEX_AFTER_MIN, FLEX_BEFORE_MIN, MAX_WALK_MIN, SLOTS, TRIP_ROLES } from "@/lib/trips/constants";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide");
const date = z.iso.date();

/** Habitual trip: Aller = origin → destination (morning), Retour = reverse (evening). */
export const commuteSchema = z
  .object({
    role: z.enum(TRIP_ROLES),
    seats: z.int().min(DRIVER_SEATS.min).max(DRIVER_SEATS.max).nullable(),
    originAddressId: z.uuid("Choisis une adresse de départ"),
    destinationAddressId: z.uuid("Choisis une adresse d'arrivée"),
    maxWalkMin: z.int().min(MAX_WALK_MIN.min).max(MAX_WALK_MIN.max).default(MAX_WALK_MIN.default),
  })
  .refine((c) => c.originAddressId !== c.destinationAddressId, {
    message: "Le départ et l'arrivée doivent être différents",
    path: ["destinationAddressId"],
  })
  .refine((c) => (c.role === "driver") === (c.seats !== null), {
    message: "Le nombre de places est requis pour un conducteur",
    path: ["seats"],
  });
export type CommuteInput = z.input<typeof commuteSchema>;
export type Commute = z.output<typeof commuteSchema>;

/** Values of one day's slot; the same values can be written to several days at once. */
export const slotValuesSchema = z
  .object({
    anchor: z.enum(["departure", "arrival"]),
    time,
    flexBeforeMin: z.int().min(FLEX_BEFORE_MIN.min).max(FLEX_BEFORE_MIN.max),
    flexAfterMin: z.int().min(FLEX_AFTER_MIN.min).max(FLEX_AFTER_MIN.max),
    validFrom: date.nullable(),
    validUntil: date.nullable(),
  })
  .refine((v) => !v.validFrom || !v.validUntil || v.validFrom <= v.validUntil, {
    message: "La date de fin précède la date de début",
    path: ["validUntil"],
  });
export type SlotValues = z.infer<typeof slotValuesSchema>;

export const directionSchema = z.enum(SLOTS);
export const daysSchema = z
  .array(z.int().min(1).max(7))
  .min(1, "Choisis au moins un jour")
  .refine((d) => new Set(d).size === d.length, "Jours en double");

export const DEFAULT_SLOT_VALUES: SlotValues = {
  anchor: "arrival",
  time: "08:30",
  flexBeforeMin: FLEX_BEFORE_MIN.default,
  flexAfterMin: FLEX_AFTER_MIN.default,
  validFrom: null,
  validUntil: null,
};

export const DIRECTION_LABELS = { morning: "Aller", evening: "Retour" } as const;
