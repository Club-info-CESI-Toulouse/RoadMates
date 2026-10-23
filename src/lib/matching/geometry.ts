import type { LatLon } from "@/lib/geo/types";

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

export function haversineM(a: LatLon, b: LatLon): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type Projection = {
  point: LatLon;
  /** Straight-line distance from the query point to the route (m). */
  distanceM: number;
  /** Distance travelled along the route up to the projected point (m). */
  alongM: number;
  /** Total route length (m), same metric as alongM. */
  totalM: number;
};

/** Closest point of a polyline ([lon, lat] pairs) to `p`, using a local flat projection. */
export function projectOnPolyline(p: LatLon, line: [number, number][]): Projection {
  const kx = Math.cos(rad(p.lat)) * 111_320;
  const ky = 110_574;
  let best: Projection = { point: { lat: line[0][1], lon: line[0][0] }, distanceM: Infinity, alongM: 0, totalM: 0 };
  let along = 0;

  for (let i = 0; i < line.length; i++) {
    const [lon1, lat1] = line[i];
    const [lon2, lat2] = line[i + 1] ?? line[i];
    const ax = (lon1 - p.lon) * kx;
    const ay = (lat1 - p.lat) * ky;
    const dx = (lon2 - lon1) * kx;
    const dy = (lat2 - lat1) * ky;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    const distanceM = Math.hypot(ax + t * dx, ay + t * dy);
    if (distanceM < best.distanceM) {
      best = {
        point: { lon: lon1 + t * (lon2 - lon1), lat: lat1 + t * (lat2 - lat1) },
        distanceM,
        alongM: along + t * Math.sqrt(len2),
        totalM: 0,
      };
    }
    along += Math.sqrt(len2);
  }
  return { ...best, totalM: along };
}

/** Point at `meters` from `from` in the direction of `to` (clamped to `to`). */
export function pointToward(from: LatLon, to: LatLon, meters: number): LatLon {
  const total = haversineM(from, to);
  if (total === 0 || meters >= total) return to;
  const t = meters / total;
  return { lat: from.lat + t * (to.lat - from.lat), lon: from.lon + t * (to.lon - from.lon) };
}
