"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { MAP_STYLES, PLACE_ZOOM } from "@/lib/geo/map-styles";
import type { LatLon } from "@/lib/geo/types";

export type MapPoint = LatLon & { label: string; color: string };

const currentTheme = () =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

// Read-only map framing a few labelled points (meeting points only, never addresses).
export function PointsMap({ points, className }: { points: MapPoint[]; className?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const pointsRef = useRef(points);

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    let observer: MutationObserver | undefined;

    import("maplibre-gl").then(({ Map, Marker, Popup, LngLatBounds }) => {
      if (cancelled || !container.current) return;
      const pts = pointsRef.current;
      map = new Map({
        container: container.current,
        style: MAP_STYLES[currentTheme()],
        center: [pts[0].lon, pts[0].lat],
        zoom: PLACE_ZOOM,
        attributionControl: { compact: true },
      });
      for (const p of pts)
        new Marker({ color: p.color })
          .setLngLat([p.lon, p.lat])
          .setPopup(new Popup({ closeButton: false }).setText(p.label))
          .addTo(map);
      if (pts.length > 1) {
        const bounds = new LngLatBounds();
        pts.forEach((p) => bounds.extend([p.lon, p.lat]));
        map.fitBounds(bounds, { padding: 48, maxZoom: PLACE_ZOOM, animate: false });
      }
      const instance = map;
      observer = new MutationObserver(() => instance.setStyle(MAP_STYLES[currentTheme()]));
      observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      map?.remove();
    };
  }, []);

  return <div ref={container} className={className ?? "h-56 w-full overflow-hidden rounded-xl"} />;
}
