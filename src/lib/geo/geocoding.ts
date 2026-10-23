import "server-only";
import { cacheLife } from "next/cache";
import { z } from "zod";
import type { LatLon, Place } from "./types";

// Géoplateforme IGN (Base Adresse Nationale), France only, 50 req/s/IP, no key.
const BASE_URL = "https://data.geopf.fr/geocodage";
const TIMEOUT_MS = 5000;

const responseSchema = z.object({
  features: z.array(
    z.object({
      geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
      properties: z.object({ label: z.string() }),
    }),
  ),
});

async function query(path: string, params: Record<string, string>): Promise<Place[]> {
  const url = `${BASE_URL}/${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const parsed = responseSchema.safeParse(await res.json());
  if (!parsed.success) return [];
  return parsed.data.features.map((f) => ({
    label: f.properties.label,
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
}

export function searchAddresses(text: string, near?: LatLon): Promise<Place[]> {
  return query("search", {
    q: text,
    limit: "6",
    autocomplete: "1",
    index: "address",
    ...(near && { lat: String(near.lat), lon: String(near.lon) }),
  });
}

/** Cached: meeting points repeat on every page load. */
export async function reverseGeocode(point: LatLon): Promise<Place | null> {
  "use cache";
  cacheLife("weeks");
  const [place] = await query("reverse", {
    lat: String(point.lat),
    lon: String(point.lon),
    limit: "1",
    index: "address",
  });
  return place ?? null;
}
