"use client";

import { useState, useEffect } from "react";

interface GeoPosition {
  lat: number;
  lng: number;
}

interface GeoState {
  position: GeoPosition | null;
  error: string | null;
  isLoading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    position: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState({
        position: null,
        error: "Geolocation is not available",
        isLoading: false,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          position: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          error: null,
          isLoading: false,
        });
      },
      (error) => {
        let errorMessage = "Failed to get location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
        }
        setState({ position: null, error: errorMessage, isLoading: false });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  return state;
}