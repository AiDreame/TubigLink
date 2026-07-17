"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, ChevronDown, Search } from "lucide-react";
import { useCityStore } from "@/hooks/use-city";
import { ALL_SUPPORTED_CITIES, CITIES_BY_REGION } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface CitySelectorProps {
  variant?: "hero" | "compact";
  onChange?: (city: string) => void;
}

export function CitySelector({ variant = "compact", onChange }: CitySelectorProps) {
  const { selectedCity, setCity } = useCityStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Group cities by region
  const groupedCities = Object.entries(CITIES_BY_REGION).map(([regionId, region]) => ({
    regionId,
    ...region,
    cities: ALL_SUPPORTED_CITIES.filter(
      (c) => c.region === regionId && (searchQuery === "" || c.label.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
  })).filter((g) => g.cities.length > 0);

  const handleSelect = (city: string) => {
    setCity(city);
    setIsOpen(false);
    setSearchQuery("");
    onChange?.(city);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 transition-colors",
          variant === "hero"
            ? "text-white bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2 text-sm"
            : "text-xs text-muted-foreground hover:text-foreground"
        )}
      >
        <MapPin className={cn(variant === "hero" ? "h-4 w-4" : "h-3 w-3")} />
        <span className="font-medium">
          {variant === "hero" ? `Service area: ${selectedCity}` : selectedCity}
        </span>
        <ChevronDown className={cn(variant === "hero" ? "h-3.5 w-3.5" : "h-3 w-3", "opacity-60")} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-card rounded-2xl shadow-2xl border border-border z-50 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-muted rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* City List by Region */}
          <div className="max-h-72 overflow-y-auto p-2 space-y-1">
            {/* Nationwide option */}
            <button
              type="button"
              onClick={() => handleSelect("")}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 border-b border-border mb-1"
            >
              <span className="text-lg">🇵🇭</span>
              <span>Nationwide — All Cities</span>
              {selectedCity === "" && (
                <span className="ml-auto text-[10px] text-blue-500 font-bold">✓</span>
              )}
            </button>
            {groupedCities.map((group) => (
              <div key={group.regionId}>
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </div>
                {group.cities.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleSelect(city.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center gap-2",
                      selectedCity === city.id
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                        : "text-card-foreground hover:bg-muted"
                    )}
                  >
                    <MapPin className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      selectedCity === city.id ? "text-blue-500" : "text-muted-foreground"
                    )} />
                    <span>{city.label}</span>
                    {selectedCity === city.id && (
                      <span className="ml-auto text-[10px] text-blue-500 font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}