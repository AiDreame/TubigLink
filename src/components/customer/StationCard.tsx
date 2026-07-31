import Link from "next/link";
import { MapPin, Star, Clock, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StationWithProducts } from "@/types";

interface StationCardProps {
  station: Partial<StationWithProducts>;
}

export function StationCard({ station }: StationCardProps) {
  return (
    <Link
      href={`/stations/${station.slug || station.id}`}
      className="group flex flex-col bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300"
      aria-label={`View ${station.name} station details`}
    >
      {/* Banner / Image Placeholder */}
      <div className="relative h-32 w-full bg-gradient-to-br from-blue-500 to-cyan-400">
        {station.logo ? (
          <img
            src={station.logo}
            alt={station.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white/20" aria-hidden="true">
            <Info size={48} />
          </div>
        )}
        
        {station.isFeatured && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-400 border-none font-bold">
              FEATURED
            </Badge>
          </div>
        )}

        <div className="absolute -bottom-6 left-4 h-12 w-12 rounded-xl bg-card p-1 shadow-md border border-border">
          <div className="h-full w-full rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
            {station.name?.[0] || "W"}
          </div>
        </div>
      </div>

      <div className="p-4 pt-8 flex flex-col flex-1">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-card-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {station.name}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {station.barangay}, {station.city}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-lg text-xs font-bold">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" aria-hidden="true" />
            {station.rating?.toFixed(2) || "0.00"}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-none text-[10px]">
            Purified
          </Badge>
          <Badge variant="secondary" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 border-none text-[10px]">
            Mineral
          </Badge>
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>{station.openingTime || "8 AM"} - {station.closingTime || "6 PM"}</span>
          </div>
          <div className="font-medium text-green-600 dark:text-green-400">
            {station.deliveryFee === 0 ? "FREE Delivery" : `₱${station.deliveryFee} Fee`}
          </div>
        </div>
      </div>
    </Link>
  );
}