import { z } from "zod";

// Provider-agnostic geo types. Coordinates are WGS84 (EPSG:4326).
export type LatLon = { lat: number; lon: number };
export type Place = LatLon & { label: string };

export const latLonSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const placeSchema = latLonSchema.extend({
  label: z.string().trim().min(1, "Adresse requise").max(200),
});
