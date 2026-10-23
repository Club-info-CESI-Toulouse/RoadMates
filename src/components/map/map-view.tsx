"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { DEFAULT_VIEW, MAP_STYLES, PLACE_ZOOM } from "@/lib/geo/map-styles";
import type { LatLon } from "@/lib/geo/types";

type Props = {
  marker: LatLon | null;
  /** Called when the user taps the map or drags the marker. */
  onPick?: (point: LatLon) => void;
  className?: string;
};

const currentTheme = () =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

export function MapView({ marker, onPick, className }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const pin = useRef<Marker | null>(null);
  const onPickRef = useRef(onPick);
  const markerRef = useRef(marker);

  useEffect(() => {
    onPickRef.current = onPick;
    markerRef.current = marker;
  });

  // Create the map once; follow theme changes on <html data-theme>.
  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | undefined;

    import("maplibre-gl").then(({ Map, Marker, NavigationControl }) => {
      if (cancelled || !container.current) return;
      const start = markerRef.current;
      const instance = new Map({
        container: container.current,
        style: MAP_STYLES[currentTheme()],
        center: start ? [start.lon, start.lat] : [DEFAULT_VIEW.center.lon, DEFAULT_VIEW.center.lat],
        zoom: start ? PLACE_ZOOM : DEFAULT_VIEW.zoom,
        attributionControl: { compact: true },
      });
      instance.addControl(new NavigationControl({ showCompass: false }), "top-right");
      instance.on("click", (e) => onPickRef.current?.({ lat: e.lngLat.lat, lon: e.lngLat.lng }));
      map.current = instance;

      pin.current = new Marker({ color: "#fee131", draggable: true });
      pin.current.on("dragend", () => {
        const p = pin.current!.getLngLat();
        onPickRef.current?.({ lat: p.lat, lon: p.lng });
      });
      if (start) pin.current.setLngLat([start.lon, start.lat]).addTo(instance);

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

  // Sync the marker with props.
  useEffect(() => {
    const instance = map.current;
    if (!instance || !pin.current) return;
    if (!marker) {
      pin.current.remove();
      return;
    }
    const lngLat: [number, number] = [marker.lon, marker.lat];
    pin.current.setLngLat(lngLat).addTo(instance);
    if (!instance.getBounds().contains(lngLat)) {
      instance.flyTo({ center: lngLat, zoom: Math.max(instance.getZoom(), PLACE_ZOOM) });
    }
  }, [marker]);

  return <div ref={container} className={className ?? "h-72 w-full overflow-hidden rounded-xl"} />;
}
