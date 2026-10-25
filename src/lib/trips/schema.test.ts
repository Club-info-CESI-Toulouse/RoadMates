import { describe, expect, it } from "vitest";
import { tripSchema } from "./schema";

const base = {
  role: "driver" as const,
  seats: 3,
  slot: "morning" as const,
  originAddressId: "11111111-1111-4111-8111-111111111111",
  destinationAddressId: "22222222-2222-4222-8222-222222222222",
  weekdays: [1, 2, 3],
  departureTime: "07:30",
  arrivalTime: null,
  validFrom: null,
  validUntil: null,
};

describe("tripSchema", () => {
  it("applies defaults", () => {
    const trip = tripSchema.parse(base);
    expect(trip).toMatchObject({ flexBeforeMin: 10, flexAfterMin: 5, maxWalkMin: 9 });
  });

  it("requires a departure or arrival time", () => {
    expect(tripSchema.safeParse({ ...base, departureTime: null }).success).toBe(false);
  });

  it("requires seats for drivers only", () => {
    expect(tripSchema.safeParse({ ...base, seats: null }).success).toBe(false);
    expect(tripSchema.safeParse({ ...base, role: "passenger" }).success).toBe(false);
    expect(tripSchema.safeParse({ ...base, role: "passenger", seats: null }).success).toBe(true);
  });

  it("enforces bounds", () => {
    expect(tripSchema.safeParse({ ...base, maxWalkMin: 31 }).success).toBe(false);
    expect(tripSchema.safeParse({ ...base, flexBeforeMin: -1 }).success).toBe(false);
    expect(tripSchema.safeParse({ ...base, weekdays: [] }).success).toBe(false);
    expect(tripSchema.safeParse({ ...base, weekdays: [1, 1] }).success).toBe(false);
  });

  it("rejects identical origin and destination", () => {
    expect(tripSchema.safeParse({ ...base, destinationAddressId: base.originAddressId }).success).toBe(false);
  });

  it("rejects an inverted validity period", () => {
    expect(
      tripSchema.safeParse({ ...base, validFrom: "2026-11-02", validUntil: "2026-11-01" }).success,
    ).toBe(false);
  });
});
