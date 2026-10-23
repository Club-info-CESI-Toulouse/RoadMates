// OpenFreeMap vector styles (no key). Swap here to change the map provider.
export const MAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

// Fallback view when nothing is known yet (France).
export const DEFAULT_VIEW = { center: { lat: 46.6, lon: 2.4 }, zoom: 5 } as const;
export const PLACE_ZOOM = 16;
