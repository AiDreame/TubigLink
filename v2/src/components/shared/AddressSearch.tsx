"use client";

import { useState, useCallback } from "react";
import { Crosshair, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCityStore } from "@/hooks/use-city";
import { cn } from "@/lib/utils";
import { PROVINCES_BY_ISLAND, CITIES_BY_PROVINCE, SAMPLE_BARANGAYS } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddressSearchProps {
  variant?: "hero" | "compact";
  onSearch?: (city: string, barangay: string) => void;
  className?: string;
}

export function AddressSearch({ variant = "hero", onSearch, className }: AddressSearchProps) {
  const { selectedCity, setCity } = useCityStore();
  const [selectedIsland, setSelectedIsland] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [barangay, setBarangay] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const islandGroups = Object.keys(PROVINCES_BY_ISLAND);
  const provincesForIsland = selectedIsland ? (PROVINCES_BY_ISLAND[selectedIsland]||[]) : [];
  const citiesForProvince = selectedProvince ? (CITIES_BY_PROVINCE[selectedProvince]||[]) : [];
  const barangaysForCity = selectedCity ? SAMPLE_BARANGAYS[selectedCity]||[] : [];

  const handleUseMyLocation = useCallback(async () => {
    setIsLocating(true); setLocationError(null);
    try {
      await new Promise<GeolocationPosition>((res,rej)=>{navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:10000,maximumAge:300000});});
      setCity("Manila");
    } catch(e:any) { setLocationError("Failed to get location."); }
    finally { setIsLocating(false); }
  }, [setCity]);

  const handleSearch = useCallback(() => { onSearch?.(selectedCity, barangay); }, [selectedCity, barangay, onSearch]);
  const handleCityChange = useCallback((city:string) => { setCity(city); setBarangay(""); }, [setCity]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <div className={cn("flex items-center gap-2 rounded-2xl bg-white dark:bg-gray-800 shadow-2xl flex-1", variant==="hero"?"p-2":"p-1.5")}>
          <Select value={selectedIsland} onValueChange={(v)=>{setSelectedIsland(v);setSelectedProvince("");setCity("");setBarangay("");}}>
            <SelectTrigger className="w-[100px] border-0 bg-transparent shadow-none text-xs font-medium"><SelectValue placeholder="Island" /></SelectTrigger>
            <SelectContent>{islandGroups.map((g)=><SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
          <span className="text-muted-foreground/30 text-xs">|</span>
          <Select value={selectedProvince} onValueChange={(v)=>{setSelectedProvince(v);setCity("");setBarangay("");}}>
            <SelectTrigger className="w-[120px] border-0 bg-transparent shadow-none text-xs font-medium"><SelectValue placeholder="Province" /></SelectTrigger>
            <SelectContent>{provincesForIsland.map((p)=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <span className="text-muted-foreground/30 text-xs">|</span>
          <Select value={selectedCity} onValueChange={(v)=>{handleCityChange(v)}}>
            <SelectTrigger className="w-[120px] border-0 bg-transparent shadow-none text-xs font-medium"><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent>{citiesForProvince.map((c)=><SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
          <span className="text-muted-foreground/30 text-xs">|</span>
          <Select value={barangay} onValueChange={(v)=>{setBarangay(v)}}>
            <SelectTrigger className="w-[120px] border-0 bg-transparent shadow-none text-xs font-medium"><SelectValue placeholder="Barangay" /></SelectTrigger>
            <SelectContent>{barangaysForCity.map((b)=><SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
          <button type="button" onClick={handleUseMyLocation} disabled={isLocating}
            className="p-2 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0" aria-label="Use my location">
            <Crosshair className={cn("h-4 w-4", isLocating&&"animate-spin")} />
          </button>
        </div>
        <Button type="button" onClick={handleSearch}
          className={cn("rounded-xl bg-blue-600 hover:bg-blue-700 shrink-0", variant==="hero"?"px-6 h-12":"px-4 h-10")}>
          <Search className={cn(variant==="hero"?"h-4 w-4 mr-2":"h-3 w-3 mr-1")} />
          <span className={variant==="hero"?"text-sm":"text-xs"}>Search</span>
        </Button>
      </div>
      {locationError && <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1"><span>⚠</span>{locationError}</p>}
    </div>
  );
}
