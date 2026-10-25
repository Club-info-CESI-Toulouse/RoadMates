import { z } from "zod";
import { placeSchema } from "@/lib/geo/types";

export const MAX_ADDRESSES = 10;
export const ADDRESS_NAME_MAX_LENGTH = 40;

export const ADDRESS_ICONS = ["home", "work", "star"] as const;
export type AddressIcon = (typeof ADDRESS_ICONS)[number];

export const ADDRESS_ICON_LABELS: Record<AddressIcon, string> = {
  home: "Maison",
  work: "Mallette",
  star: "Étoile",
};

export const addressInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Donne un nom à cette adresse")
    .max(ADDRESS_NAME_MAX_LENGTH, `${ADDRESS_NAME_MAX_LENGTH} caractères maximum`),
  icon: z.enum(ADDRESS_ICONS),
  place: placeSchema,
});
export type AddressInput = z.infer<typeof addressInputSchema>;

/** What other screens need to pick an address (no location). */
export type AddressOption = { id: string; name: string; icon: AddressIcon };
