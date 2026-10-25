import "server-only";
import { z } from "zod";
import { getRoute, RoutingUnavailableError, type Route } from "./routing";
import type { LatLon } from "./types";

// Driving alternatives from OpenRouteService (one request, up to 3 routes, < ~100 km).
// Falls back to the single fastest route when alternatives are unavailable.
const URL_ALTERNATIVES = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
const TIMEOUT_MS = 10000;
const MAX_ALTERNATIVES = 3;

export type LabelledRoute = Route & { label: string };

const responseSchema = z.object({
  features: z
    .array(
      z.object({
        geometry: z.object({ coordinates: z.array(z.tuple([z.number(), z.number()])) }),
        properties: z.object({
          summary: z.object({ distance: z.number().default(0), duration: z.number().default(0) }),
          segments: z
            .array(z.object({ steps: z.array(z.object({ name: z.string().optional(), distance: z.number().default(0) })).default([]) }))
            .default([]),
        }),
      }),
    )
    .min(1),
});

/** Main road of a route: the named road driven the longest, its number when there is one (e.g. "D 916"). */
export function mainRoad(steps: { name?: string; distance: number }[]): string | null {
  const byName = new Map<string, number>();
  for (const s of steps) {
    if (!s.name || s.name === "-") continue;
    const name = s.name.match(/\b[ADMNR] ?\d+[a-z]?\b/)?.[0]?.replace(/^([ADMNR])(\d)/, "$1 $2") ?? s.name;
    byName.set(name, (byName.get(name) ?? 0) + s.distance);
  }
  return [...byName.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** Alternatives this close are the same road for the user: keep the first only. */
export function isNearDuplicate(a: { distanceM: number; durationS: number }, b: { distanceM: number; durationS: number }) {
  return Math.abs(a.distanceM - b.distanceM) <= Math.max(150, a.distanceM * 0.02) && Math.abs(a.durationS - b.durationS) <= 60;
}

export function dedupeRoutes<T extends { distanceM: number; durationS: number }>(routes: T[]): T[] {
  return routes.filter((r, i) => !routes.slice(0, i).some((kept) => isNearDuplicate(kept, r)));
}

/** "Via <road>" when it tells the routes apart, otherwise "Itinéraire n". */
export function labelRoutes(roads: (string | null)[]): string[] {
  return roads.map((road, i) =>
    road && roads.filter((r) => r === road).length === 1 ? `Via ${road}` : `Itinéraire ${i + 1}`,
  );
}

export async function getRouteAlternatives(from: LatLon, to: LatLon): Promise<LabelledRoute[]> {
  const key = process.env.ORS_API_KEY;
  if (!key) throw new RoutingUnavailableError("ORS_API_KEY missing");
  try {
    const res = await fetch(URL_ALTERNATIVES, {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify({
        coordinates: [
          [from.lon, from.lat],
          [to.lon, to.lat],
        ],
        alternative_routes: { target_count: MAX_ALTERNATIVES, share_factor: 0.6, weight_factor: 1.6 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`ORS ${res.status}`);
    const parsed = responseSchema.parse(await res.json());
    const routes = dedupeRoutes(parsed.features.map((f) => ({
      distanceM: Math.round(f.properties.summary.distance),
      durationS: Math.round(f.properties.summary.duration),
      geometry: f.geometry.coordinates,
      road: mainRoad(f.properties.segments.flatMap((s) => s.steps)),
    })));
    const labels = labelRoutes(routes.map((r) => r.road));
    return routes.map((r, i) => ({ distanceM: r.distanceM, durationS: r.durationS, geometry: r.geometry, label: labels[i] }));
  } catch {
    const route = await getRoute("driving", from, to);
    return [{ ...route, label: "Itinéraire 1" }];
  }
}
