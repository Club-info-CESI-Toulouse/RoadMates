import { z } from "zod";
import {
  DRIVER_SEATS,
  FLEX_AFTER_MIN,
  FLEX_BEFORE_MIN,
  MAX_WALK_MIN,
  SLOTS,
  TRIP_ROLES,
} from "./constants";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide");
const date = z.iso.date();

export const tripSchema = z
  .object({
    role: z.enum(TRIP_ROLES),
    seats: z.int().min(DRIVER_SEATS.min).max(DRIVER_SEATS.max).nullable(),
    slot: z.enum(SLOTS),
    originAddressId: z.uuid("Choisis une adresse de départ"),
    destinationAddressId: z.uuid("Choisis une adresse d'arrivée"),
    weekdays: z
      .array(z.int().min(1).max(7))
      .min(1, "Choisis au moins un jour")
      .refine((d) => new Set(d).size === d.length, "Jours en double"),
    departureTime: time.nullable(),
    arrivalTime: time.nullable(),
    flexBeforeMin: z
      .int()
      .min(FLEX_BEFORE_MIN.min)
      .max(FLEX_BEFORE_MIN.max)
      .default(FLEX_BEFORE_MIN.default),
    flexAfterMin: z
      .int()
      .min(FLEX_AFTER_MIN.min)
      .max(FLEX_AFTER_MIN.max)
      .default(FLEX_AFTER_MIN.default),
    maxWalkMin: z
      .int()
      .min(MAX_WALK_MIN.min)
      .max(MAX_WALK_MIN.max)
      .default(MAX_WALK_MIN.default),
    validFrom: date.nullable(),
    validUntil: date.nullable(),
    isActive: z.boolean().default(true),
  })
  .refine((t) => t.originAddressId !== t.destinationAddressId, {
    message: "Le départ et l'arrivée doivent être différents",
    path: ["destinationAddressId"],
  })
  .refine((t) => t.departureTime !== null || t.arrivalTime !== null, {
    message: "Indique une heure de départ ou d'arrivée",
    path: ["departureTime"],
  })
  .refine((t) => (t.role === "driver") === (t.seats !== null), {
    message: "Le nombre de places est requis pour un conducteur",
    path: ["seats"],
  })
  .refine(
    (t) => !t.validFrom || !t.validUntil || t.validFrom <= t.validUntil,
    { message: "La date de fin précède la date de début", path: ["validUntil"] },
  );

export type TripInput = z.input<typeof tripSchema>;
export type Trip = z.output<typeof tripSchema>;
