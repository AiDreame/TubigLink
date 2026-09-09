"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { useCityStore } from "@/hooks/use-city";
import { CityPickerPanel, type CitySelection } from "@/components/shared/CityCombobox";
import { cn } from "@/lib/utils";

interface CitySelectorProps {
  variant?: "hero" | "compact";
  onChange?: (city: string) => void;
}

export function CitySelector({ variant = "compact", onChange }: CitySelectorProps) {
  const { selectedCity, selectedProvince, setCity, setProvince } = useCityStore();
  const [isOpen, setIsOpen] = useState(false);
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

  const handleSelect = (city: CitySelection) => {
    // Province pick ("All of {province}") clears the city and selects the province.
    if (city.provinceSelect) {
      setProvince(city.provinceSelect, city.region);
      setIsOpen(false);
      onChange?.(city.name);
      return;
    }
    // Pass the picked region explicitly so ambiguous names (e.g. "Buenavista",
    // "San Juan") resolve to the region the user actually selected.
    setCity(city.name, city.region);
    setIsOpen(false);
    onChange?.(city.name);
  };

  const handleNationwide = () => {
    setCity("");
    setIsOpen(false);
    onChange?.("");
  };

  // Displayed service-area label: province selection wins over city.
  const areaLabel = selectedProvince
    ? `All of ${selectedProvince}`
    : selectedCity || "Nationwide";

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
          {variant === "hero" ? `Service area: ${areaLabel}` : areaLabel}
        </span>
        <ChevronDown className={cn(variant === "hero" ? "h-3.5 w-3.5" : "h-3 w-3", "opacity-60")} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50">
          <div className="w-80 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
            {/* Nationwide option */}
            <button
              type="button"
              onClick={handleNationwide}
              className="w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 border-b border-border"
            >
              <span className="text-lg">🇵🇭</span>
              <span>Nationwide — All Cities</span>
              {selectedCity === "" && !selectedProvince && (
                <span className="ml-auto text-[10px] text-blue-500 font-bold">✓</span>
              )}
            </button>
            <CityPickerPanel
              selectedName={selectedCity || undefined}
              selectedProvince={selectedProvince || undefined}
              onSelect={handleSelect}
              className="w-full border-0 rounded-none shadow-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
