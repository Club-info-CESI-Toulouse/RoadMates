import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { decrypt, encrypt } from "@/lib/crypto/address";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LatLon } from "./types";

// OpenRouteService directions (free-flow durations, no live traffic). Server-only key.
// Results are cached in route_cache, encrypted (a geometry reveals its endpoints).
const BASE_URL = "https://api.openrouteservice.org/v2/directions";
const TIMEOUT_MS = 8000;
const PROFILES = { driving: "driving-car", walking: "foot-walking" } as const;

export type RouteProfile = keyof typeof PROFILES;
export type Route = {
  distanceM: number;
  durationS: number;
  /** [lon, lat] pairs along the route. */
  geometry: [number, number][];
  /** One leg per pair of consecutive points (absent in old cache entries). */
  legs?: { distanceM: number; durationS: number }[];
};

export class RoutingUnavailableError extends Error {}

const responseSchema = z.object({
  features: z
    .array(
      z.object({
        geometry: z.object({ coordinates: z.array(z.tuple([z.number(), z.number()])) }),
        properties: z.object({
          summary: z.object({ distance: z.number().default(0), duration: z.number().default(0) }),
          segments: z
            .array(z.object({ distance: z.number().default(0), duration: z.number().default(0) }))
            .optional(),
        }),
      }),
    )
    .min(1),
});

const round = (n: number) => n.toFixed(5);
// Two-point keys keep their original format so existing cache entries stay valid.
const cacheKey = (profile: RouteProfile, points: LatLon[]) =>
  createHash("sha256")
    .update([profile, ...points.map((p) => `${round(p.lat)},${round(p.lon)}`)].join("|"))
    .digest("hex");

async function fetchRoute(profile: RouteProfile, points: LatLon[]): Promise<Route> {
  const key = process.env.ORS_API_KEY;
  if (!key) throw new RoutingUnavailableError("ORS_API_KEY missing");

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/${PROFILES[profile]}/geojson`, {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: points.map((p) => [p.lon, p.lat]) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new RoutingUnavailableError("ORS unreachable");
  }
  if (!res.ok) throw new RoutingUnavailableError(`ORS ${res.status}`);

  const parsed = responseSchema.safeParse(await res.json());
  if (!parsed.success) throw new RoutingUnavailableError("ORS bad response");
  const [feature] = parsed.data.features;
  return {
    distanceM: Math.round(feature.properties.summary.distance),
    durationS: Math.round(feature.properties.summary.duration),
    geometry: feature.geometry.coordinates,
    legs: feature.properties.segments?.map((s) => ({
      distanceM: Math.round(s.distance),
      durationS: Math.round(s.duration),
    })),
  };
}

/** Route from the first to the last point, through the others in order. */
export async function getRoute(profile: RouteProfile, ...points: LatLon[]): Promise<Route> {
  if (points.length < 2) throw new RoutingUnavailableError("At least two points required");
  const key = cacheKey(profile, points);
  const db = createAdminClient();

  const { data: cached } = await db
    .from("route_cache")
    .select("payload_encrypted")
    .eq("key", key)
    .maybeSingle();
  if (cached) return decrypt<Route>(cached.payload_encrypted);

  const route = await fetchRoute(profile, points);
  await db.from("route_cache").upsert({ key, payload_encrypted: encrypt(route) });
  return route;
}
