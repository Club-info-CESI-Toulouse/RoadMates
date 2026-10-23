import type { LatLon } from "@/lib/geo/types";
import { haversineM, pointToward, projectOnPolyline } from "./geometry";

// Driver/passenger compatibility. Pure: routing is injected so it can be tested and cached.
// All clock values are minutes since local midnight on the occurrence date.

export type MatchTrip = {
  id: string;
  ownerId: string;
  origin: LatLon;
  destination: LatLon;
  departureMin: number | null;
  arrivalMin: number | null;
  flexBeforeMin: number;
  flexAfterMin: number;
  maxWalkMin: number;
};

export type DrivingRoute = {
  distanceM: number;
  durationS: number;
  geometry: [number, number][];
  legs?: { distanceM: number; durationS: number }[];
};

export type MatchDeps = {
  /** Driving route through `points` (2 or more). */
  driving: (points: LatLon[]) => Promise<DrivingRoute>;
  /** Walking duration in minutes. */
  walkingMin: (from: LatLon, to: LatLon) => Promise<number>;
};

export type Match = {
  driverTripId: string;
  passengerTripId: string;
  pickup: LatLon;
  dropoff: LatLon;
  driverDepartureMin: number;
  driverArrivalMin: number;
  pickupMin: number;
  dropoffMin: number;
  passengerLeaveMin: number;
  passengerArriveMin: number;
  walkMin: number;
  detourMin: number;
  detourM: number;
  /** Distance driven together, pickup to dropoff (m). */
  rideM: number;
  /** 0–100, higher is better. */
  score: number;
};

/** Walking speed (m/min) and street-vs-crow-flies factor, for estimates only. */
export const WALK_M_PER_MIN = 75;
export const WALK_DETOUR_FACTOR = 1.3;
/** Below this distance a point counts as reached without walking or a stop. */
const SAME_POINT_M = 30;
/** Detour waypoints aim a bit inside the walk budget since walking is only estimated there. */
const WALK_TARGET_RATIO = 0.85;
/** Slack of the cheap timing pre-check run before any routing call. */
const PRECHECK_SLACK_MIN = 30;

export const estimateWalkMin = (from: LatLon, to: LatLon) =>
  (haversineM(from, to) * WALK_DETOUR_FACTOR) / WALK_M_PER_MIN;

type Interval = [number, number];

export type ScheduleInput = {
  driver: MatchTrip;
  passenger: MatchTrip;
  driverDurationMin: number;
  pickupOffsetMin: number;
  dropoffOffsetMin: number;
  walkToPickupMin: number;
  walkFromDropoffMin: number;
  fixedDepartureMin?: number | null;
  slackMin?: number;
};

/**
 * Driver departure time satisfying every given time ± its flexibility (driver and
 * passenger), closest to the driver's own wish. Null when the windows don't overlap.
 */
export function solveDeparture(s: ScheduleInput): { departure: number; ideal: number } | null {
  const { driver: d, passenger: p, driverDurationMin: dur } = s;
  const slack = s.slackMin ?? 0;
  const windows: Interval[] = [];
  const around = (t: number, before: number, after: number, shift: number): Interval => [
    t - before - shift - slack,
    t + after - shift + slack,
  ];

  if (d.departureMin !== null) windows.push(around(d.departureMin, d.flexBeforeMin, d.flexAfterMin, 0));
  if (d.arrivalMin !== null) windows.push(around(d.arrivalMin, d.flexBeforeMin, d.flexAfterMin, dur));
  if (p.departureMin !== null)
    windows.push(around(p.departureMin, p.flexBeforeMin, p.flexAfterMin, s.pickupOffsetMin - s.walkToPickupMin));
  if (p.arrivalMin !== null)
    windows.push(around(p.arrivalMin, p.flexBeforeMin, p.flexAfterMin, s.dropoffOffsetMin + s.walkFromDropoffMin));
  if (s.fixedDepartureMin != null) windows.push([s.fixedDepartureMin - slack, s.fixedDepartureMin + slack]);

  const lo = Math.ceil(Math.max(...windows.map((w) => w[0])) - 1e-9);
  const hi = Math.floor(Math.min(...windows.map((w) => w[1])) + 1e-9);
  if (lo > hi) return null;

  const ideal = Math.round(d.departureMin ?? d.arrivalMin! - dur);
  return { departure: Math.min(hi, Math.max(lo, ideal)), ideal };
}

/** Penalty in minutes → score. 0 → 100, 10 → 80, 30 → 51, 60 → 26. */
export function scoreFromPenalty(penaltyMin: number): number {
  return Math.round(100 * Math.exp(-Math.max(0, penaltyMin) / 45));
}

/** Splits the walking budget between both ends (estimates), keeping a cheap end as is. */
function walkAllowance(estOrigin: number, estDestination: number, budget: number): [number, number] {
  if (estOrigin <= budget / 2) return [estOrigin, budget - estOrigin];
  if (estDestination <= budget / 2) return [budget - estDestination, estDestination];
  return [budget / 2, budget / 2];
}

export async function computeMatch(
  driver: MatchTrip,
  passenger: MatchTrip,
  deps: MatchDeps,
  options: { fixedDepartureMin?: number | null } = {},
): Promise<Match | null> {
  if (driver.ownerId === passenger.ownerId) return null;
  const base = await deps.driving([driver.origin, driver.destination]);
  if (base.geometry.length < 2) return null;

  const onOrigin = projectOnPolyline(passenger.origin, base.geometry);
  const onDestination = projectOnPolyline(passenger.destination, base.geometry);
  // Passenger travelling the other way along the driver's route.
  if (onOrigin.alongM > onDestination.alongM + SAME_POINT_M) return null;

  const fraction = (along: number) => (onOrigin.totalM > 0 ? along / onOrigin.totalM : 0);
  const baseMin = base.durationS / 60;

  // Cheap check on base timings before any extra routing call.
  const estOrigin = estimateWalkMin(passenger.origin, onOrigin.point);
  const estDestination = estimateWalkMin(onDestination.point, passenger.destination);
  const precheck = solveDeparture({
    driver,
    passenger,
    driverDurationMin: baseMin,
    pickupOffsetMin: baseMin * fraction(onOrigin.alongM),
    dropoffOffsetMin: baseMin * fraction(onDestination.alongM),
    walkToPickupMin: Math.min(estOrigin, passenger.maxWalkMin),
    walkFromDropoffMin: Math.min(estDestination, passenger.maxWalkMin),
    fixedDepartureMin: options.fixedDepartureMin,
    slackMin: PRECHECK_SLACK_MIN,
  });
  if (!precheck) return null;

  let pickup = onOrigin.point;
  let dropoff = onDestination.point;
  let route = base;
  let pickupOffsetMin = baseMin * fraction(onOrigin.alongM);
  let dropoffOffsetMin = baseMin * fraction(onDestination.alongM);
  let rideM = base.distanceM * Math.max(0, fraction(onDestination.alongM) - fraction(onOrigin.alongM));

  if (estOrigin + estDestination > passenger.maxWalkMin) {
    // Driver detours to points within walking reach of the passenger.
    const [allowOrigin, allowDestination] = walkAllowance(estOrigin, estDestination, passenger.maxWalkMin);
    const reach = (allowMin: number) => (allowMin * WALK_TARGET_RATIO * WALK_M_PER_MIN) / WALK_DETOUR_FACTOR;
    if (estOrigin > allowOrigin) pickup = pointToward(passenger.origin, onOrigin.point, reach(allowOrigin));
    if (estDestination > allowDestination)
      dropoff = pointToward(passenger.destination, onDestination.point, reach(allowDestination));

    const pickupIsStart = haversineM(pickup, driver.origin) < SAME_POINT_M;
    const dropoffIsEnd = haversineM(dropoff, driver.destination) < SAME_POINT_M;
    const points = [driver.origin, ...(pickupIsStart ? [] : [pickup]), ...(dropoffIsEnd ? [] : [dropoff]), driver.destination];
    route = await deps.driving(points);

    const totalMin = route.durationS / 60;
    // Index of the leg ending at the pickup / dropoff (−1 = driver origin).
    const pickupLeg = pickupIsStart ? -1 : 0;
    const dropoffLeg = dropoffIsEnd ? points.length - 2 : pickupLeg + 1;
    const sumTo = (values: number[], leg: number) => values.slice(0, leg + 1).reduce((a, b) => a + b, 0);
    if (route.legs && route.legs.length === points.length - 1) {
      const minutes = route.legs.map((l) => l.durationS / 60);
      const meters = route.legs.map((l) => l.distanceM);
      pickupOffsetMin = sumTo(minutes, pickupLeg);
      dropoffOffsetMin = sumTo(minutes, dropoffLeg);
      rideM = sumTo(meters, dropoffLeg) - sumTo(meters, pickupLeg);
    } else {
      const p = projectOnPolyline(pickup, route.geometry);
      const q = projectOnPolyline(dropoff, route.geometry);
      const fp = p.totalM ? p.alongM / p.totalM : 0;
      const fq = q.totalM ? q.alongM / q.totalM : 1;
      pickupOffsetMin = totalMin * fp;
      dropoffOffsetMin = totalMin * fq;
      rideM = route.distanceM * Math.max(0, fq - fp);
    }
  }

  const walk = (from: LatLon, to: LatLon) =>
    haversineM(from, to) < SAME_POINT_M ? Promise.resolve(0) : deps.walkingMin(from, to);
  const [walkToPickup, walkFromDropoff] = await Promise.all([
    walk(passenger.origin, pickup),
    walk(dropoff, passenger.destination),
  ]);
  if (walkToPickup + walkFromDropoff > passenger.maxWalkMin) return null;

  const driverDurationMin = route.durationS / 60;
  const solved = solveDeparture({
    driver,
    passenger,
    driverDurationMin,
    pickupOffsetMin,
    dropoffOffsetMin,
    walkToPickupMin: walkToPickup,
    walkFromDropoffMin: walkFromDropoff,
    fixedDepartureMin: options.fixedDepartureMin,
  });
  if (!solved) return null;

  const t0 = solved.departure;
  const pickupMin = Math.round(t0 + pickupOffsetMin);
  const dropoffMin = Math.round(t0 + dropoffOffsetMin);
  const passengerLeaveMin = pickupMin - Math.round(walkToPickup);
  const passengerArriveMin = dropoffMin + Math.round(walkFromDropoff);

  const passengerDeviation = Math.max(
    passenger.departureMin === null ? 0 : Math.abs(passengerLeaveMin - passenger.departureMin),
    passenger.arrivalMin === null ? 0 : Math.abs(passengerArriveMin - passenger.arrivalMin),
  );
  const detourMin = Math.max(0, Math.round((route.durationS - base.durationS) / 60));
  const detourM = Math.max(0, Math.round(route.distanceM - base.distanceM));
  const walkMin = Math.ceil(walkToPickup + walkFromDropoff);

  return {
    driverTripId: driver.id,
    passengerTripId: passenger.id,
    pickup,
    dropoff,
    driverDepartureMin: t0,
    driverArrivalMin: Math.round(t0 + driverDurationMin),
    pickupMin,
    dropoffMin,
    passengerLeaveMin,
    passengerArriveMin,
    walkMin,
    detourMin,
    detourM,
    rideM: Math.round(rideM),
    score: scoreFromPenalty(Math.abs(t0 - solved.ideal) + passengerDeviation + 2 * detourMin + walkMin),
  };
}
