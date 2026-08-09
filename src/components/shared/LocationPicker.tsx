"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, LocateFixed } from "lucide-react";

// Fix default marker icon path issue in bundlers (same as StationMap)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src,
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
});

// Default view: Metro Manila (matches NEXT_PUBLIC_DEFAULT_LAT/LNG)
const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 };

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  /** Tailwind height class for the map container (default h-64). */
  heightClass?: string;
  /** Hint shown when no coordinates are set yet. */
  hint?: string;
}

/**
 * Free Leaflet pin-drop: a draggable marker on an OSM map. Clicking/tapping
 * the map moves the pin; dragging the pin updates it too. Coordinates are
 * reported via onChange (rounded to 6 decimals). When latitude/longitude
 * change externally (e.g. "Use my location" or manual inputs), the marker
 * and view follow.
 *
 * MUST be mounted via next/dynamic with { ssr: false } — Leaflet touches
 * `window` at import time and cannot be rendered server-side (see StationMap).
 */
export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  heightClass = "h-64",
  hint = "Click the map to set your location, or drag the pin to fine-tune.",
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const hasCoords = latitude !== null && longitude !== null;

  // Initialize map + marker once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initial =
      latitude !== null && longitude !== null
        ? { lat: latitude, lng: longitude }
        : DEFAULT_CENTER;

    const map = L.map(containerRef.current, {
      center: [initial.lat, initial.lng],
      zoom: 14,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([initial.lat, initial.lng], { draggable: true }).addTo(map);

    // Dragging the pin reports new coordinates
    marker.on("dragend", () => {
      const ll = marker.getLatLng();
      onChangeRef.current(round6(ll.lat), round6(ll.lng));
    });

    // Clicking/tapping the map moves the pin
    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onChangeRef.current(round6(e.latlng.lat), round6(e.latlng.lng));
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Ensure the map is sized correctly once layout settles (dynamic import,
    // card transitions, etc. can leave Leaflet with a stale size)
    const raf = requestAnimationFrame(() => map.invalidateSize());

    return () => {
      cancelAnimationFrame(raf);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow external coordinate changes (Use my location / manual inputs)
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || latitude === null || longitude === null) return;

    const m = marker.getLatLng();
    if (round6(m.lat) !== round6(latitude) || round6(m.lng) !== round6(longitude)) {
      const latlng = L.latLng(latitude, longitude);
      marker.setLatLng(latlng);
      map.panTo(latlng);
    }
  }, [latitude, longitude]);

  const centerOnMyLocation = () => {
    setLocateError(null);
    if (!navigator.geolocation) {
      setLocateError("Location is not supported by this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChangeRef.current(
          Number(position.coords.latitude.toFixed(6)),
          Number(position.coords.longitude.toFixed(6))
        );
        setLocating(false);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Unable to get your location — check browser permissions."
            : error.code === error.POSITION_UNAVAILABLE
              ? "Your location is currently unavailable. Please try again."
              : "Location request timed out. Please try again.";
        setLocateError(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <div
          ref={containerRef}
          className={`w-full ${heightClass} rounded-xl border shadow-sm z-0`}
          style={{ background: "#f0f4f8" }}
          aria-label="Map — click to set your location"
        />
        <button
          type="button"
          onClick={centerOnMyLocation}
          disabled={locating}
          className="absolute top-2 right-2 z-[1000] inline-flex items-center gap-1.5 rounded-lg bg-white/95 dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 shadow-sm hover:bg-blue-50 dark:hover:bg-gray-700 disabled:opacity-60 transition-colors"
        >
          {locating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LocateFixed className="h-3.5 w-3.5" />
          )}
          {locating ? "Getting location…" : "Center on my location"}
        </button>
      </div>
      {locateError && (
        <p className="text-xs text-red-500" role="alert">
          {locateError}
        </p>
      )}
      {hasCoords ? (
        <p className="text-xs text-muted-foreground">
          Location: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
