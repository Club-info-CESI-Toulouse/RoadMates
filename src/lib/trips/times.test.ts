import { describe, expect, it } from "vitest";
import { formatDuration, resolveTimes } from "./times";

const MIN = 60;

describe("resolveTimes", () => {
  it("computes arrival from departure", () => {
    expect(resolveTimes("07:30", null, 25 * MIN)).toEqual({
      ok: true,
      departure: "07:30",
      arrival: "07:55",
      durationMin: 25,
    });
  });

  it("computes departure from arrival", () => {
    expect(resolveTimes(null, "08:15", 40 * MIN)).toMatchObject({ departure: "07:35", arrival: "08:15" });
  });

  it("rounds the duration to the minute without margin", () => {
    expect(resolveTimes("07:00", null, 20 * MIN + 29)).toMatchObject({ arrival: "07:20" });
    expect(resolveTimes("07:00", null, 20 * MIN + 31)).toMatchObject({ arrival: "07:21" });
  });

  it("blocks only the too-short case when both times are given", () => {
    expect(resolveTimes("07:30", "07:45", 25 * MIN)).toEqual({
      ok: false,
      reason: "too_short",
      durationMin: 25,
    });
    expect(resolveTimes("07:30", "07:55", 25 * MIN)).toMatchObject({ ok: true });
    expect(resolveTimes("07:00", "09:00", 25 * MIN)).toMatchObject({ ok: true, arrival: "09:00" });
    expect(resolveTimes("08:00", "07:00", 25 * MIN)).toMatchObject({ reason: "arrival_before_departure" });
    expect(resolveTimes("19:32", "00:07", 29 * MIN)).toMatchObject({ reason: "arrival_before_departure" });
  });

  it("rejects missing times and times outside the day", () => {
    expect(resolveTimes(null, null, 600)).toMatchObject({ reason: "missing" });
    expect(resolveTimes("23:50", null, 20 * MIN)).toMatchObject({ reason: "out_of_day" });
    expect(resolveTimes(null, "00:10", 20 * MIN)).toMatchObject({ reason: "out_of_day" });
  });
});

describe("formatDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatDuration(25)).toBe("25 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(75)).toBe("1 h 15");
  });
});
