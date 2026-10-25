// Single entry point to load MapLibre in the browser, with its worker served
// from /maplibre (see scripts/copy-maplibre-worker.mjs).
let ready: Promise<typeof import("maplibre-gl")> | null = null;

export function loadMapLibre() {
  ready ??= import("maplibre-gl").then((maplibre) => {
    maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    return maplibre;
  });
  return ready;
}
