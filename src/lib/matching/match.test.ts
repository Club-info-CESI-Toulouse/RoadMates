import { describe, expect, it } from "vitest";
import type { LatLon } from "@/lib/geo/types";
import { haversineM, projectOnPolyline } from "./geometry";
import { computeMatch, estimateWalkMin, scoreFromPenalty, solveDeparture, type MatchDeps, type MatchTrip } from "./match";

// Straight west→east road at lat 43.5; 0.01° lon ≈ 807 m. Driving 10 m/s.
const LAT = 43.5;
const at = (lon: number, lat = LAT): LatLon => ({ lat, lon });

const deps = (calls: LatLon[][] = []): MatchDeps => ({
  async driving(points) {
    calls.push(points);
    const geometry: [number, number][] = points.map((p) => [p.lon, p.lat]);
    const legs = points.slice(1).map((p, i) => {
      const distanceM = haversineM(points[i], p);
      return { distanceM, durationS: distanceM / 10 };
    });
    const distanceM = legs.reduce((s, l) => s + l.distanceM, 0);
    return { distanceM, durationS: distanceM / 10, geometry, legs };
  },
  async walkingMin(from, to) {
    return estimateWalkMin(from, to);
  },
});

const trip = (over: Partial<MatchTrip>): MatchTrip => ({
  id: "t",
  ownerId: "u",
  origin: at(1.4),
  destination: at(1.6),
  departureMin: null,
  arrivalMin: null,
  flexBeforeMin: 10,
  flexAfterMin: 5,
  maxWalkMin: 9,
  ...over,
});

describe("projectOnPolyline", () => {
  it("projects onto a segment and measures along the route", () => {
    const p = projectOnPolyline(at(1.5, LAT + 0.001), [
      [1.4, LAT],
      [1.6, LAT],
    ]);
    expect(p.point.lon).toBeCloseTo(1.5, 6);
    expect(p.distanceM).toBeCloseTo(110.6, 0);
    expect(p.alongM / p.totalM).toBeCloseTo(0.5, 3);
  });
});

describe("solveDeparture", () => {
  const base = {
    driverDurationMin: 30,
    pickupOffsetMin: 10,
    dropoffOffsetMin: 30,
    walkToPickupMin: 0,
    walkFromDropoffMin: 0,
  };

  it("keeps the driver's time when the passenger fits", () => {
    const r = solveDeparture({
      ...base,
      driver: trip({ departureMin: 480 }),
      passenger: trip({ arrivalMin: 510 }),
    });
    expect(r).toEqual({ departure: 480, ideal: 480 });
  });

  it("shifts within both flexibilities", () => {
    const r = solveDeparture({
      ...base,
      driver: trip({ departureMin: 480 }),
      passenger: trip({ arrivalMin: 520 }),
    });
    expect(r?.departure).toBe(480);
    const later = solveDeparture({
      ...base,
      driver: trip({ departureMin: 480 }),
      passenger: trip({ arrivalMin: 518, flexBeforeMin: 3 }),
    });
    expect(later?.departure).toBe(485);
  });

  it("rejects non-overlapping windows", () => {
    const r = solveDeparture({
      ...base,
      driver: trip({ departureMin: 480, flexBeforeMin: 0, flexAfterMin: 0 }),
      passenger: trip({ arrivalMin: 560, flexBeforeMin: 0, flexAfterMin: 0 }),
    });
    expect(r).toBeNull();
  });

  it("honours a departure fixed by an accepted ride", () => {
    const r = solveDeparture({
      ...base,
      driver: trip({ departureMin: 480 }),
      passenger: trip({ arrivalMin: 515 }),
      fixedDepartureMin: 484,
    });
    expect(r?.departure).toBe(484);
  });
});

describe("computeMatch", () => {
  const driver = trip({ id: "d", ownerId: "a", departureMin: 480 });

  it("meets on the route when the passenger lives next to it", async () => {
    const passenger = trip({ id: "p", ownerId: "b", origin: at(1.5, LAT + 0.002), arrivalMin: 515 });
    const m = await computeMatch(driver, passenger, deps());
    expect(m).not.toBeNull();
    expect(m!.detourMin).toBe(0);
    expect(m!.pickup.lon).toBeCloseTo(1.5, 5);
    expect(m!.walkMin).toBeLessThanOrEqual(9);
    expect(m!.pickupMin).toBeGreaterThan(m!.driverDepartureMin);
  });

  it("asks the driver for a detour instead of exceeding the walk limit", async () => {
    const calls: LatLon[][] = [];
    const passenger = trip({ id: "p", ownerId: "b", origin: at(1.5, LAT + 0.02), arrivalMin: 520 });
    const m = await computeMatch(driver, passenger, deps(calls), {});
    expect(m).not.toBeNull();
    expect(m!.walkMin).toBeLessThanOrEqual(9);
    expect(m!.detourMin).toBeGreaterThan(0);
    expect(calls.at(-1)).toHaveLength(3);
  });

  it("rejects a passenger going the other way", async () => {
    const passenger = trip({ id: "p", ownerId: "b", origin: at(1.6), destination: at(1.4), arrivalMin: 510 });
    expect(await computeMatch(driver, passenger, deps())).toBeNull();
  });

  it("never matches a user with themself", async () => {
    expect(await computeMatch(driver, trip({ ownerId: "a", arrivalMin: 510 }), deps())).toBeNull();
  });

  it("rejects incompatible times", async () => {
    const passenger = trip({ id: "p", ownerId: "b", arrivalMin: 600 });
    expect(await computeMatch(driver, passenger, deps())).toBeNull();
  });
});

describe("scoreFromPenalty", () => {
  it("decreases with the penalty", () => {
    expect(scoreFromPenalty(0)).toBe(100);
    expect(scoreFromPenalty(10)).toBeGreaterThan(scoreFromPenalty(30));
  });
});
