import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./routing", () => ({ getRoute: vi.fn(), RoutingUnavailableError: class extends Error {} }));

const { dedupeRoutes, labelRoutes, mainRoad } = await import("./alternatives");

describe("dedupeRoutes", () => {
  it("drops alternatives that are the same road in practice", () => {
    const routes = [
      { distanceM: 11300, durationS: 1320 },
      { distanceM: 9600, durationS: 1380 },
      { distanceM: 9640, durationS: 1395 },
    ];
    expect(dedupeRoutes(routes)).toEqual(routes.slice(0, 2));
  });
});

describe("route labels", () => {
  it("keeps the road number of the longest named stretch", () => {
    expect(
      mainRoad([
        { name: "Rue X", distance: 300 },
        { name: "Avenue Y, D916", distance: 2000 },
        { name: "-", distance: 5000 },
      ]),
    ).toBe("D 916");
  });
  it("falls back to numbers when roads don't tell routes apart", () => {
    expect(labelRoutes(["D 79", "D 79", null])).toEqual(["Itinéraire 1", "Itinéraire 2", "Itinéraire 3"]);
    expect(labelRoutes(["D 57", "D 79"])).toEqual(["Via D 57", "Via D 79"]);
  });
});
