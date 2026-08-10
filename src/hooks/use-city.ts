"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_CITY,
  getCityByName,
  getRegionForCity,
  regionTagline,
} from "@/lib/ph-locations";

interface CityState {
  selectedCity: string;
  selectedRegion: string;
  /** @param region Optional explicit region id — use when the picked city name is ambiguous. */
  setCity: (city: string, region?: string) => void;
  getRegionTagline: () => string;
  getRegionForCity: (city: string) => string;
}

export const useCityStore = create<CityState>()(
  persist(
    (set, get) => ({
      selectedCity: DEFAULT_CITY,
      selectedRegion: getRegionForCity(DEFAULT_CITY),

      setCity: (city: string, region?: string) => {
        if (!city) {
          set({ selectedCity: "", selectedRegion: "nationwide" });
          return;
        }
        const resolved = region || getRegionForCity(city);
        set({ selectedCity: city, selectedRegion: resolved });
      },

      getRegionTagline: () => {
        const { selectedRegion } = get();
        if (selectedRegion === "nationwide") return "The Philippines' trusted water delivery service";
        return regionTagline(selectedRegion) || "The Philippines' trusted water delivery service";
      },

      getRegionForCity: (city: string) => {
        // Prefer live lookup; keep legacy ids working through the fallback.
        const info = getCityByName(city);
        return info?.region || "ncr";
      },
    }),
    {
      name: "aqualink-city",
    }
  )
);
