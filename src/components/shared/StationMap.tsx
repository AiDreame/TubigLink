"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { formatDistance, isOpenNow, type FinderStation } from "@/lib/station-utils";

// Fix default marker icon path issue in bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src,
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
});

export interface UserGeo {
  lat: number;
  lng: number;
}

export type LocationStatus =
  | { state: "loading" }
  | { state: "found" }
  | { state: "fallback"; message: string };

interface StationMapProps {
  stations: FinderStation[];
  selectedCity: string;
  /** Controlled user location (from StationFinder). When omitted, the map
   *  requests geolocation itself (legacy standalone behavior). */
  userLocation?: UserGeo | null;
  locationStatus?: LocationStatus;
  onUserLocation?: (loc: UserGeo, status: LocationStatus) => void;
  /** Per-station distance in km, keyed by station id (for popups). */
  distances?: Record<string, number>;
  /** Request to center the map on a station + open its popup (list tap). */
  focusRequest?: { id: string; nonce: number } | null;
  onMarkerSelect?: (id: string) => void;
  /** Compact height for embedding in the finder split view. */
  className?: string;
}

// City center coordinates for fallback when geolocation fails
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  // Metro Manila
  "Manila": { lat: 14.5995, lng: 120.9842 },
  "Quezon City": { lat: 14.6760, lng: 121.0437 },
  "Makati": { lat: 14.5547, lng: 121.0244 },
  "Taguig": { lat: 14.5176, lng: 121.0509 },
  "Pasig": { lat: 14.5608, lng: 121.0775 },
  "Mandaluyong": { lat: 14.5773, lng: 121.0380 },
  "Pasay": { lat: 14.5378, lng: 121.0014 },
  "Paranaque": { lat: 14.4793, lng: 120.9917 },
  "Caloocan": { lat: 14.6558, lng: 120.9838 },
  "Muntinlupa": { lat: 14.4238, lng: 121.0410 },
  "Marikina": { lat: 14.6346, lng: 121.0970 },
  "Las Pinas": { lat: 14.4495, lng: 120.9841 },
  "Valenzuela": { lat: 14.7012, lng: 120.9790 },
  "Malabon": { lat: 14.6631, lng: 120.9632 },
  "Navotas": { lat: 14.6555, lng: 120.9466 },
  "San Juan": { lat: 14.6032, lng: 121.0324 },
  // Cebu
  "Cebu City": { lat: 10.3157, lng: 123.8854 },
  "Mandaue": { lat: 10.3311, lng: 123.9227 },
  "Lapu-Lapu": { lat: 10.3127, lng: 123.9492 },
  // Mindanao
  "Davao City": { lat: 7.1907, lng: 125.4553 },
  "Cagayan de Oro": { lat: 8.4542, lng: 124.6319 },
  "General Santos": { lat: 6.1109, lng: 125.1746 },
};

function getCityCenter(city: string): { lat: number; lng: number } {
  return CITY_COORDS[city] || { lat: 14.5995, lng: 120.9842 };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c] as string));
}

export function getUserGeoWithFallback(
  selectedCity: string
): Promise<{ loc: UserGeo; status: LocationStatus }> {
  const fallback = getCityCenter(selectedCity);
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({
        loc: fallback,
        status: {
          state: "fallback",
          message: "Geolocation is not supported by your browser. Showing stations instead.",
        },
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          loc: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          status: { state: "found" },
        });
      },
      () => {
        resolve({
          loc: fallback,
          status: {
            state: "fallback",
            message: `Unable to get your location. Showing stations near ${selectedCity || "you"} instead.`,
          },
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export default function StationMap({
  stations,
  selectedCity,
  userLocation: controlledLoc,
  locationStatus: controlledStatus,
  onUserLocation,
  distances = {},
  focusRequest,
  onMarkerSelect,
  className,
}: StationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const fittedCityRef = useRef<string | null>(null);
  const [internalLoc, setInternalLoc] = useState<UserGeo | null>(null);
  const [internalStatus, setInternalStatus] = useState<LocationStatus>({ state: "loading" });

  const controlled = controlledLoc !== undefined;
  const userLocation = controlled ? controlledLoc : internalLoc;
  const locationStatus: LocationStatus = controlled
    ? controlledStatus ?? { state: "loading" }
    : internalStatus;

  // Standalone mode: request geolocation ourselves (keeps legacy behavior
  // for any consumer that doesn't pass a controlled location).
  useEffect(() => {
    if (controlled) return;
    let cancelled = false;
    getUserGeoWithFallback(selectedCity).then(({ loc, status }) => {
      if (cancelled) return;
      setInternalLoc(loc);
      setInternalStatus(status);
      onUserLocation?.(loc, status);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity, controlled]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !userLocation) return;

    const map = L.map(mapRef.current, {
      center: [userLocation.lat, userLocation.lng],
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current.clear();
      fittedCityRef.current = null;
    };
  }, [userLocation]);

  // Re-center when the city fallback changes (geolocation denied path)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;
    if (locationStatus.state === "fallback" && fittedCityRef.current !== selectedCity) {
      fittedCityRef.current = selectedCity;
      map.setView([userLocation.lat, userLocation.lng], 12);
    }
  }, [userLocation, locationStatus, selectedCity]);

  // Add markers when stations, location, or distances change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;

    // Clear existing station markers (keep tile layer + zoom control)
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current.clear();
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker && (layer as any)._isUserDot) {
        map.removeLayer(layer);
      }
    });

    const bounds = L.latLngBounds([]);

    // User location marker (blue dot)
    const userIcon = L.divIcon({
      className: "",
      html: `<div style="width:20px;height:20px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    const userMarker = L.marker([userLocation.lat, userLocation.lng], {
      icon: userIcon,
      interactive: false,
      keyboard: false,
      title: "Your location",
    }).addTo(map);
    (userMarker as any)._isUserDot = true;
    userMarker.bindPopup("<strong>You are here</strong>");
    bounds.extend(userMarker.getLatLng());

    // Sort: regular stations first so featured (blue) markers render on top
    const sortedStations = [...stations].sort((a, b) => (a.isFeatured ? 1 : 0) - (b.isFeatured ? 1 : 0));

    sortedStations.forEach((station) => {
      if (!station.latitude || !station.longitude) return;

      const isFeatured = !!station.isFeatured;
      const open = isOpenNow(station.openingTime, station.closingTime);
      const markerColor = isFeatured ? "#2563eb" : "#6b7280";
      // Open/closed affordance: closed stations get a dashed gray ring.
      const ring = open === false ? "border-style:dashed;border-color:#d1d5db;" : "border-color:white;";
      const iconHtml = `
        <div style="
          width:32px;height:32px;
          background:${markerColor};
          border:3px solid;${ring}
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:14px;font-weight:bold;color:white;
          box-shadow:0 2px 6px rgba(0,0,0,0.3);
          cursor:pointer;
          ${open === false ? "opacity:0.75;" : ""}
        ">💧</div>
      `;
      const stationIcon = L.divIcon({
        className: "",
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const dist = distances[station.id];
      const rating = typeof station.rating === "number" ? station.rating.toFixed(1) : "New";
      const fee = station.deliveryFee === 0 || station.deliveryFee == null
        ? '<span style="color:#16a34a;">Free delivery</span>'
        : "₱" + station.deliveryFee + " delivery";
      const openBadge = open === true
        ? '<span style="color:#16a34a;font-weight:bold;">● Open now</span>'
        : open === false
          ? '<span style="color:#dc2626;font-weight:bold;">● Closed</span>'
          : "";
      const popupContent = `
        <div style="font-family:sans-serif;min-width:190px;max-width:230px;">
          <strong style="color:#2563eb;">${escapeHtml(station.name)}</strong>
          ${isFeatured ? ' <span style="background:#facc15;font-size:10px;font-weight:bold;padding:1px 6px;border-radius:999px;">FEATURED</span>' : ""}
          <p style="margin:4px 0;font-size:12px;color:#666;">
            ${escapeHtml([station.barangay, station.city].filter(Boolean).join(", ") || "Philippines")}
            ${dist != null ? ` · ${escapeHtml(formatDistance(dist))} away` : ""}
          </p>
          <p style="margin:4px 0;font-size:12px;">
            ⭐ ${rating} · ${fee}${openBadge ? ` · ${openBadge}` : ""}
          </p>
          <a href="/stations/${station.slug || station.id}"
             style="display:inline-block;margin-top:6px;background:#2563eb;color:white;
                    padding:6px 14px;border-radius:8px;font-size:12px;font-weight:bold;text-decoration:none;">
            Order now →
          </a>
        </div>
      `;
      const marker = L.marker([station.latitude, station.longitude], {
        icon: stationIcon,
        title: station.name,
        alt: `${station.name} water station marker`,
      })
        .addTo(map)
        .bindPopup(popupContent);
      marker.on("click", () => onMarkerSelect?.(station.id));
      markersRef.current.set(station.id, marker);
      bounds.extend(marker.getLatLng());
    });

    // Fit map to show all markers on first load (later pans are user-driven)
    if (bounds.isValid() && fittedCityRef.current !== `fit:${selectedCity}`) {
      fittedCityRef.current = `fit:${selectedCity}`;
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [stations, userLocation, distances, selectedCity, onMarkerSelect]);

  // List → map: center on the tapped station and open its popup
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !focusRequest) return;
    const marker = markersRef.current.get(focusRequest.id);
    if (!marker) return;
    const ll = marker.getLatLng();
    map.setView(ll, Math.max(map.getZoom(), 14), { animate: true });
    // Open after the pan so the popup anchors correctly
    setTimeout(() => marker.openPopup(), 250);
  }, [focusRequest]);

  const loading = locationStatus.state === "loading";

  return (
    <div>
      <div className="relative">
        <div
          ref={mapRef}
          role="application"
          aria-label="Map of nearby water stations"
          className={className ?? "w-full h-[400px] md:h-[500px] rounded-2xl border shadow-md z-0"}
          style={{ background: "#f0f4f8" }}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-2xl z-[1000]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-muted-foreground">Getting your location...</p>
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {loading ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Locating you...
            </span>
          ) : locationStatus.state === "fallback" ? (
            <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
              <MapPin className="h-3 w-3" aria-hidden /> Location unavailable — city center shown
            </span>
          ) : (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <Navigation className="h-3 w-3" aria-hidden /> Location found
            </span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-600 border border-white shadow-sm inline-block" aria-hidden /> You
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-sm inline-flex items-center justify-center text-[8px] text-white font-bold" aria-hidden>💧</span> Featured
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-gray-500 border-2 border-white shadow-sm inline-flex items-center justify-center text-[8px] text-white font-bold" aria-hidden>💧</span> Station
        </span>
      </div>
    </div>
  );
}
