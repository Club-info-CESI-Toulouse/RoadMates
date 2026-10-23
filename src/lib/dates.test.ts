import { describe, expect, it } from "vitest";
import { addDays, formatClock, isoWeekday, localDate, zonedInstant } from "./dates";

describe("dates (Europe/Paris)", () => {
  it("converts local wall time to an instant across DST", () => {
    expect(zonedInstant("2026-01-15", 8 * 60).toISOString()).toBe("2026-01-15T07:00:00.000Z");
    expect(zonedInstant("2026-07-15", 8 * 60).toISOString()).toBe("2026-07-15T06:00:00.000Z");
    expect(formatClock(zonedInstant("2026-10-25", 17 * 60 + 5))).toBe("17:05");
  });

  it("computes local dates and weekdays", () => {
    expect(localDate(new Date("2026-10-22T22:30:00Z"))).toBe("2026-10-23");
    expect(isoWeekday("2026-10-23")).toBe(5);
    expect(isoWeekday("2026-10-25")).toBe(7);
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });
});
