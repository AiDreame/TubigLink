"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_CITY, ALL_SUPPORTED_CITIES, CITIES_BY_REGION } from "@/lib/constants";

interface CityState {
  selectedCity: string;
  selectedRegion: string;
  setCity: (city: string) => void;
  getRegionTagline: () => string;
  getRegionForCity: (city: string) => string;
}

export const useCityStore = create<CityState>()(
  persist(
    (set, get) => ({
      selectedCity: DEFAULT_CITY,
      selectedRegion: "metro-manila",

      setCity: (city: string) => {
        if (!city) {
          set({ selectedCity: "", selectedRegion: "nationwide" });
          return;
        }
        const cityInfo = ALL_SUPPORTED_CITIES.find((c) => c.id === city);
        const region = cityInfo?.region || "metro-manila";
        set({ selectedCity: city, selectedRegion: region });
      },

      getRegionTagline: () => {
        const { selectedRegion } = get();
        if (selectedRegion === "nationwide") return "The Philippines' trusted water delivery service";
        return CITIES_BY_REGION[selectedRegion]?.tagline || "The Philippines' trusted water delivery service";
      },

      getRegionForCity: (city: string) => {
        const cityInfo = ALL_SUPPORTED_CITIES.find((c) => c.id === city);
        return cityInfo?.region || "metro-manila";
      },
    }),
    {
      name: "aqualink-city",
    }
  )
);