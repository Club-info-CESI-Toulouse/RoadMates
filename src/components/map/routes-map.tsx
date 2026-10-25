"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { loadMapLibre } from "@/lib/geo/maplibre";
import { MAP_STYLES } from "@/lib/geo/map-styles";

type Line = { idx: number; geometry: [number, number][] };

const currentTheme = () =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

const toGeoJSON = (lines: Line[], selected: number | null) => ({
  type: "FeatureCollection" as const,
  // Selected routes last so they draw on top.
  features: lines
    .map((l) => ({
      type: "Feature" as const,
      properties: { selected: selected === null || selected === l.idx ? 1 : 0 },
      geometry: { type: "LineString" as const, coordinates: l.geometry },
    }))
    .sort((a, b) => a.properties.selected - b.properties.selected),
});

// The owner's route alternatives, overlaid; the selection is highlighted.
export function RoutesMap({ lines, selected, className }: { lines: Line[]; selected: number | null; className?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const state = useRef({ lines, selected });

  useEffect(() => {
    state.current = { lines, selected };
    const source = map.current?.getSource("routes") as GeoJSONSource | undefined;
    source?.setData(toGeoJSON(lines, selected));
  }, [lines, selected]);

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | undefined;

    loadMapLibre().then(({ Map, Marker, LngLatBounds }) => {
      if (cancelled || !container.current || state.current.lines.length === 0) return;
      const all = state.current.lines.flatMap((l) => l.geometry);
      const bounds = all.reduce((b, p) => b.extend(p), new LngLatBounds(all[0], all[0]));
      const instance = new Map({
        container: container.current,
        style: MAP_STYLES[currentTheme()],
        bounds,
        fitBoundsOptions: { padding: 40 },
        attributionControl: { compact: true },
      });
      map.current = instance;

      const addLayers = () => {
        if (instance.getSource("routes")) return;
        instance.addSource("routes", { type: "geojson", data: toGeoJSON(state.current.lines, state.current.selected) });
        instance.addLayer({
          id: "routes-casing",
          type: "line",
          source: "routes",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#000000", "line-width": ["case", ["==", ["get", "selected"], 1], 9, 5], "line-opacity": ["case", ["==", ["get", "selected"], 1], 1, 0.25] },
          filter: ["==", ["get", "selected"], 1],
        });
        instance.addLayer({
          id: "routes",
          type: "line",
          source: "routes",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": ["case", ["==", ["get", "selected"], 1], "#fee131", "#a8a29e"],
            "line-width": ["case", ["==", ["get", "selected"], 1], 5, 4],
          },
        });
      };
      instance.on("style.load", addLayers);

      const first = state.current.lines[0].geometry;
      new Marker({ color: "#fee131" }).setLngLat(first[0]).addTo(instance);
      new Marker({ color: "#000000" }).setLngLat(first[first.length - 1]).addTo(instance);

      observer = new MutationObserver(() => instance.setStyle(MAP_STYLES[currentTheme()]));
      observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return <div ref={container} className={className ?? "h-72 w-full overflow-hidden rounded-3xl"} />;
}
