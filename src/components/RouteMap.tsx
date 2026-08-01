"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

const TRANSPARENT =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

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
      map.setView([49.8, 15.5], 7);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      new L.GPX(gpxUrl, {
        async: true,
        marker_options: {
          startIconUrl: TRANSPARENT,
          endIconUrl: TRANSPARENT,
          shadowUrl: TRANSPARENT,
        },
        polyline_options: { color: "#ff7a1a", weight: 5, opacity: 0.9 },
      })
        .on("loaded", (e: any) => {
          if (cancelled) return;
          const gpx = e.target;
          map.fitBounds(gpx.getBounds(), { padding: [24, 24] });

          let coords: any[] = [];
          gpx.getLayers().forEach((layer: any) => {
            if (typeof layer.getLatLngs === "function") {
              const lls = layer.getLatLngs();
              coords = coords.concat(Array.isArray(lls) ? lls.flat(Infinity) : []);
            }
          });
          if (coords.length >= 2) {
            const start = coords[0];
            const finish = coords[coords.length - 1];
            L.circleMarker(start, {
              radius: 7,
              color: "#12161c",
              weight: 2,
              fillColor: "#4fd18b",
              fillOpacity: 1,
            })
              .bindTooltip("Start", { permanent: true, direction: "top" })
              .addTo(map);
            L.circleMarker(finish, {
              radius: 7,
              color: "#12161c",
              weight: 2,
              fillColor: "#ef6a6a",
              fillOpacity: 1,
            })
              .bindTooltip("Cíl", { permanent: true, direction: "top" })
              .addTo(map);
          }
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
