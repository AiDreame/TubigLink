"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_CITY, ALL_SUPPORTED_CITIES } from "@/lib/constants";

interface CityState {
  selectedCity: string;
  selectedProvince: string;
  setCity: (city: string) => void;
  getProvinceTagline: () => string;
  getProvinceForCity: (city: string) => string;
}

export const useCityStore = create<CityState>()(
  persist(
    (set, get) => ({
      selectedCity: DEFAULT_CITY,
      selectedProvince: "Metro Manila",

      setCity: (city: string) => {
        if (!city) {
          set({ selectedCity: "", selectedProvince: "nationwide" });
          return;
        }
        const cityInfo = ALL_SUPPORTED_CITIES.find((c) => c.id === city);
        const province = cityInfo?.province || "Metro Manila";
        set({ selectedCity: city, selectedProvince: province });
      },

      getProvinceTagline: () => {
        const { selectedProvince } = get();
        if (selectedProvince === "nationwide") return "The Philippines' trusted water delivery service";
        return `${selectedProvince}'s trusted water delivery service`;
      },

      getProvinceForCity: (city: string) => {
        const cityInfo = ALL_SUPPORTED_CITIES.find((c) => c.id === city);
        return cityInfo?.province || "Metro Manila";
      },
    }),
    {
      name: "aqualink-city",
    }
  )
);