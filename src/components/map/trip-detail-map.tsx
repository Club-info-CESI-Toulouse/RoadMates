"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { loadMapLibre } from "@/lib/geo/maplibre";
import { MAP_STYLES } from "@/lib/geo/map-styles";
import type { LatLon } from "@/lib/geo/types";

type Kind = "departure" | "pickup" | "dropoff" | "arrival";
type Line = [number, number][];

export const MARKER_STYLE: Record<Kind, { color: string; label: string }> = {
  departure: { color: "#57534e", label: "Départ" },
  pickup: { color: "#fee131", label: "Rendez-vous" },
  dropoff: { color: "#fee131", label: "Dépose" },
  arrival: { color: "#000000", label: "Arrivée" },
};

const currentTheme = () =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

const lines = (coords: Line[]) => ({
  type: "FeatureCollection" as const,
  features: coords.map((c) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: c } })),
});

/** Dashed = driver alone, solid = stretch shared with the passenger. */
export function TripDetailMap({
  shared,
  driverOnly,
  markers,
  className,
}: {
  shared: Line | null;
  driverOnly: Line[];
  markers: (LatLon & { kind: Kind })[];
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const data = useRef({ shared, driverOnly, markers });

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    let observer: MutationObserver | undefined;

    loadMapLibre().then(({ Map, Marker, Popup, LngLatBounds }) => {
      if (cancelled || !container.current) return;
      const { shared, driverOnly, markers } = data.current;
      const points: [number, number][] = [...markers.map((m) => [m.lon, m.lat] as [number, number]), ...(shared ?? []), ...driverOnly.flat()];
      const bounds = points.reduce((b, p) => b.extend(p), new LngLatBounds(points[0], points[0]));
      const instance = new Map({
        container: container.current,
        style: MAP_STYLES[currentTheme()],
        bounds,
        fitBoundsOptions: { padding: 48, maxZoom: 16 },
        attributionControl: { compact: true },
      });
      map = instance;

      instance.on("style.load", () => {
        instance.addSource("alone", { type: "geojson", data: lines(driverOnly) });
        instance.addSource("shared", { type: "geojson", data: lines(shared ? [shared] : []) });
        instance.addLayer({
          id: "alone",
          type: "line",
          source: "alone",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#57534e", "line-width": 4, "line-dasharray": [1.5, 1.5] },
        });
        instance.addLayer({
          id: "shared-casing",
          type: "line",
          source: "shared",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#000000", "line-width": 9 },
        });
        instance.addLayer({
          id: "shared",
          type: "line",
          source: "shared",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#fee131", "line-width": 5 },
        });
      });

      for (const m of markers)
        new Marker({ color: MARKER_STYLE[m.kind].color })
          .setLngLat([m.lon, m.lat])
          .setPopup(new Popup({ closeButton: false }).setText(MARKER_STYLE[m.kind].label))
          .addTo(instance);

      observer = new MutationObserver(() => instance.setStyle(MAP_STYLES[currentTheme()]));
      observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      map?.remove();
    };
  }, []);

  return <div ref={container} className={className ?? "h-64 w-full overflow-hidden rounded-3xl"} />;
}
