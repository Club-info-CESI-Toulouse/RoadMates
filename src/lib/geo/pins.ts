import type { Map as MapLibreMap, Marker, Popup } from "maplibre-gl";
import { haversineM } from "@/lib/matching/geometry";
import type { LatLon } from "./types";

export type Pin = LatLon & { label: string; color: string };
export type PinGroup = LatLon & { labels: string[]; colors: string[] };

/** Points closer than this are drawn as one pin, split between their colors. */
const SAME_POINT_M = 50;

export function groupPins(pins: Pin[], thresholdM = SAME_POINT_M): PinGroup[] {
  const groups: PinGroup[] = [];
  for (const pin of pins) {
    const group = groups.find((g) => haversineM(g, pin) < thresholdM);
    if (group) {
      group.labels.push(pin.label);
      if (!group.colors.includes(pin.color)) group.colors.push(pin.color);
    } else {
      groups.push({ lat: pin.lat, lon: pin.lon, labels: [pin.label], colors: [pin.color] });
    }
  }
  return groups;
}

let gradientCount = 0;

/** Map pin split vertically between several colors. */
function splitPin(colors: string[]) {
  const id = `split-pin-${++gradientCount}`;
  const stops = colors
    .map((c, i) => `<stop offset="${i / colors.length}" stop-color="${c}"/><stop offset="${(i + 1) / colors.length}" stop-color="${c}"/>`)
    .join("");
  const element = document.createElement("div");
  element.innerHTML = `<svg width="27" height="41" viewBox="0 0 24 36" style="display:block"><defs><linearGradient id="${id}">${stops}</linearGradient></defs><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0Z" fill="url(#${id})" stroke="#ffffff" stroke-width="1"/><circle cx="12" cy="12" r="4" fill="#ffffff"/></svg>`;
  return element;
}

export function addPins(
  maplibre: { Marker: typeof Marker; Popup: typeof Popup },
  map: MapLibreMap,
  pins: Pin[],
) {
  for (const group of groupPins(pins)) {
    const marker =
      group.colors.length > 1
        ? new maplibre.Marker({ element: splitPin(group.colors), anchor: "bottom" })
        : new maplibre.Marker({ color: group.colors[0] });
    marker
      .setLngLat([group.lon, group.lat])
      .setPopup(new maplibre.Popup({ closeButton: false }).setText(group.labels.join(" et ")))
      .addTo(map);
  }
}
