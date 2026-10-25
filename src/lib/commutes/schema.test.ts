import { describe, expect, it } from "vitest";
import { commuteSchema, daysSchema, slotValuesSchema } from "./schema";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("commuteSchema", () => {
  it("accepts a driver commute and defaults the walk", () => {
    expect(commuteSchema.parse({ role: "driver", seats: 3, originAddressId: A, destinationAddressId: B })).toMatchObject({ maxWalkMin: 9 });
  });
  it("rejects same addresses and seat mismatches", () => {
    expect(commuteSchema.safeParse({ role: "passenger", seats: null, originAddressId: A, destinationAddressId: A }).success).toBe(false);
    expect(commuteSchema.safeParse({ role: "driver", seats: null, originAddressId: A, destinationAddressId: B }).success).toBe(false);
    expect(commuteSchema.safeParse({ role: "passenger", seats: 2, originAddressId: A, destinationAddressId: B }).success).toBe(false);
  });
});

describe("slotValuesSchema", () => {
  const base = { anchor: "departure", time: "07:45", flexBeforeMin: 10, flexAfterMin: 5, validFrom: null, validUntil: null } as const;
  it("validates time, flexibility and period", () => {
    expect(slotValuesSchema.safeParse(base).success).toBe(true);
    expect(slotValuesSchema.safeParse({ ...base, time: "25:00" }).success).toBe(false);
    expect(slotValuesSchema.safeParse({ ...base, flexAfterMin: 61 }).success).toBe(false);
    expect(slotValuesSchema.safeParse({ ...base, validFrom: "2026-11-10", validUntil: "2026-11-01" }).success).toBe(false);
  });
  it("needs distinct days", () => {
    expect(daysSchema.safeParse([]).success).toBe(false);
    expect(daysSchema.safeParse([1, 1]).success).toBe(false);
    expect(daysSchema.safeParse([1, 2, 3, 4, 5]).success).toBe(true);
  });
});
