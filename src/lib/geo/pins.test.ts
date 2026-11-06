import { describe, expect, it } from "vitest";
import { groupPins } from "./pins";

const pin = (lat: number, label: string, color: string) => ({ lat, lon: 1.5, label, color });

describe("groupPins", () => {
  it("merges points at the same place and keeps both colors", () => {
    const groups = groupPins([pin(43.5, "Dépose", "#ea580c"), pin(43.5002, "Arrivée", "#000000"), pin(43.6, "Départ", "#57534e")]);
    expect(groups).toHaveLength(2);
    expect(groups[0].colors).toEqual(["#ea580c", "#000000"]);
    expect(groups[0].labels).toEqual(["Dépose", "Arrivée"]);
  });
  it("keeps distant points apart", () => {
    expect(groupPins([pin(43.5, "A", "#000000"), pin(43.51, "B", "#ffffff")])).toHaveLength(2);
  });
});
