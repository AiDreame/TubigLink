"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import Link from "next/link";

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

interface Station {
  id: string;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  city: string;
  barangay: string;
  rating: number;
  isFeatured: boolean;
  deliveryFee: number;
  minOrder: number;
}

interface StationMapProps {
  stations: Station[];
  selectedCity: string;
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

export default function StationMap({ stations, selectedCity }: StationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        const fallback = getCityCenter(selectedCity);
        setUserLocation(fallback);
        setLocationError(
          `Unable to get your location. Showing stations near ${selectedCity} instead.`
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [selectedCity]);

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

    mapInstanceRef.current = map;
  }, [userLocation]);

  // Add markers when stations or location change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
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
    const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup("<strong>You are here</strong>");
    bounds.extend(userMarker.getLatLng());

    // Sort: regular stations first so featured (blue) markers render on top
    const sortedStations = [...stations].sort((a, b) => (a.isFeatured ? 1 : 0) - (b.isFeatured ? 1 : 0));

    sortedStations.forEach((station) => {
      if (!station.latitude || !station.longitude) return;

      const isFeatured = station.isFeatured;
      const markerColor = isFeatured ? "#2563eb" : "#6b7280";
      const iconHtml = `
        <div style="
          width:32px;height:32px;
          background:${markerColor};
          border:3px solid white;
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:14px;font-weight:bold;color:white;
          box-shadow:0 2px 6px rgba(0,0,0,0.3);
          cursor:pointer;
        ">💧</div>
      `;
      const stationIcon = L.divIcon({
        className: "",
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const popupContent = `
        <div style="font-family:sans-serif;min-width:180px;">
          <strong style="color:#2563eb;">${station.name}</strong>
          <p style="margin:4px 0;font-size:12px;color:#666;">
            ${station.barangay}, ${station.city}
          </p>
          <p style="margin:4px 0;font-size:12px;">
            ⭐ ${station.rating.toFixed(1)} · 
            ${station.deliveryFee === 0 ? '<span style="color:#16a34a;">Free delivery</span>' : '₱' + station.deliveryFee + ' delivery'}
          </p>
          <a href="/stations/${station.slug || station.id}" 
             style="display:inline-block;margin-top:6px;background:#2563eb;color:white;
                    padding:4px 12px;border-radius:8px;font-size:12px;text-decoration:none;">
            View Station
          </a>
        </div>
      `;
      const marker = L.marker([station.latitude, station.longitude], { icon: stationIcon })
        .addTo(map)
        .bindPopup(popupContent);
      bounds.extend(marker.getLatLng());
    });

    // Fit map to show all markers
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [stations, userLocation]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground">Nearby Water Stations</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {locationLoading ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-4 w-4 animate-spin" /> Locating you...
            </span>
          ) : locationError ? (
            <span className="flex items-center gap-1 text-yellow-600">
              <MapPin className="h-4 w-4" /> {locationError}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-green-600">
              <Navigation className="h-4 w-4" /> Location found
            </span>
          )}
        </div>
      </div>
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-[400px] md:h-[500px] rounded-2xl border shadow-md z-0"
          style={{ background: "#f0f4f8" }}
        />
        {locationLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-2xl z-[1000]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-muted-foreground">Getting your location...</p>
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-600 border border-white shadow-sm inline-block" /> You
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-sm inline-flex items-center justify-center text-[8px] text-white font-bold">💧</span> Featured Station
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-gray-500 border-2 border-white shadow-sm inline-flex items-center justify-center text-[8px] text-white font-bold">💧</span> Station
        </span>
        <Link
          href={`/stations?city=${encodeURIComponent(selectedCity)}`}
          className="ml-auto text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          View all stations →
        </Link>
      </div>
    </section>
  );
}