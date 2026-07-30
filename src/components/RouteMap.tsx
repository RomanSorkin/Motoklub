"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

// Vykreslí GPX trasu do interaktivní mapy pomocí Leaflet + leaflet-gpx.
export default function RouteMap({ gpxUrl }: { gpxUrl: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default as any;
      await import("leaflet-gpx");
      if (cancelled || !ref.current || mapRef.current) return;

      const map = L.map(ref.current, { scrollWheelZoom: false });
      mapRef.current = map;
      map.setView([49.8, 15.5], 7); // střed ČR jako výchozí

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      new L.GPX(gpxUrl, {
        async: true,
        marker_options: {
          startIconUrl: "https://unpkg.com/leaflet-gpx@2.1.2/pin-icon-start.png",
          endIconUrl: "https://unpkg.com/leaflet-gpx@2.1.2/pin-icon-end.png",
          shadowUrl: "https://unpkg.com/leaflet-gpx@2.1.2/pin-shadow.png",
        },
        polyline_options: { color: "#ff7a1a", weight: 5, opacity: 0.9 },
      })
        .on("loaded", (e: any) => {
          if (!cancelled) map.fitBounds(e.target.getBounds(), { padding: [20, 20] });
        })
        .on("error", (e: any) => {
          console.error("Chyba načtení GPX:", e);
        })
        .addTo(map);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [gpxUrl]);

  return <div ref={ref} className="map" />;
}
