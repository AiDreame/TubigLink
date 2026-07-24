"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Search, MapPin, Crosshair, Droplets, Star, ChevronRight, User, LogOut, Package, Settings, Store, ShoppingBag, MapPinned, TrendingUp, ArrowRight, Clock, DollarSign, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CitySelector } from "@/components/shared/CitySelector";
import { AddressSearch } from "@/components/shared/AddressSearch";
import { BarangayAutocomplete } from "@/components/shared/BarangayAutocomplete";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import dynamic from "next/dynamic";
const StationMap = dynamic(() => import("@/components/shared/StationMap"), { ssr: false });
import { useCityStore } from "@/hooks/use-city";
import { ALL_SUPPORTED_CITIES } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CustomerDashboard } from "@/components/customer/Dashboard";

// Home page component — landing screen for AquaLink PH
export default function HomePage() {
  const { data: session, status } = useSession();
  const { selectedCity, selectedProvince, getProvinceTagline } = useCityStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");
  const [userAddress, setUserAddress] = useState<{ city: string; barangay: string } | null>(null);
  const [nearbyStations, setNearbyStations] = useState<any[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [featuredStations, setFeaturedStations] = useState<any[]>([]);
  const [allMapStations, setAllMapStations] = useState<any[]>([]);
  const [platformStats, setPlatformStats] = useState<{ stations: number; orders: number; cities: number; customers: number } | null>(null);
  const [providerDashboard, setProviderDashboard] = useState<any>(null);
  const [isLoadingStations, setIsLoadingStations] = useState(true);
  const isLoggedIn = status === "authenticated";
  const user = session?.user;
  const userRole = (user as any)?.role;

  // Handle address search — redirects to stations page with barangay and city params
  const handleAddressSearch = useCallback((city: string, barangay: string) => {
    const params = new URLSearchParams();
    params.append("city", city);
    if (barangay) params.append("barangay", barangay);
    window.location.href = `/stations?${params.toString()}`;
  }, []);

  // Set user address and fetch nearby stations
  const handleSetAddress = useCallback((city: string, barangay: string) => {
    setUserAddress({ city, barangay });
    setSelectedBarangay(barangay);
    // Also set the city in the store
    const { setCity } = useCityStore.getState();
    setCity(city);
    // Fetch nearby stations
    setIsLoadingNearby(true);
    const params = new URLSearchParams({ city, limit: "6" });
    if (barangay) params.append("barangay", barangay);
    fetch(`/api/stations?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setNearbyStations(data.data || []);
        setIsLoadingNearby(false);
      })
      .catch(() => {
        setIsLoadingNearby(false);
      });
  }, []);

  // Fetch featured stations, all stations (for map), and provider data
  useEffect(() => {
    setIsLoadingStations(true);
    
    const featuredParams = new URLSearchParams({ featured: "true", limit: "6" });
    if (selectedCity) featuredParams.append("city", selectedCity);
    
    const allParams = new URLSearchParams({ limit: "500" });

    const fetches: Promise<any>[] = [
      fetch(`/api/stations?${featuredParams.toString()}`).then((r) => r.json()),
      fetch(`/api/stations?${allParams.toString()}`).then((r) => r.json()),
      fetch("/api/stats").then((r) => r.json()).catch(() => ({ success: false })),
    ];

    // If provider, also fetch their dashboard data
    if (userRole === "PROVIDER") {
      fetches.push(
        fetch("/api/dashboard").then((r) => r.json()).catch(() => ({ success: false }))
      );
    }

    Promise.all(fetches)
      .then(([featuredData, allData, statsData, dashData]) => {
        setFeaturedStations(featuredData.data || []);
        setAllMapStations(allData.data || []);
        if (statsData.success) setPlatformStats(statsData.data);
        if (dashData?.success) setProviderDashboard(dashData.data);
        setIsLoadingStations(false);
      })
      .catch(() => {
        setIsLoadingStations(false);
      });
  }, [selectedCity, userRole]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.append("city", selectedCity);
    if (searchQuery.trim()) {
      // If the query looks like a barangay name, pass it as barangay
      params.append("query", searchQuery.trim());
    }
    if (selectedBarangay) {
      params.append("barangay", selectedBarangay);
    }
    window.location.href = `/stations?${params.toString()}`;
  };

  const provinceInfo = selectedProvince && selectedProvince !== "nationwide"
  ? { tagline: `${selectedProvince}'s trusted water delivery service` }
  : null;
  const isNationwide = !selectedCity;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* ─── Header ─────────────────────────────── */}
      <header className="bg-background/80 backdrop-blur-md sticky top-0 z-40 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center">
              <Droplets className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
              AquaLink <span className="text-blue-600 dark:text-blue-400">PH</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <CitySelector />
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-900/30 p-1.5 pr-3 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-600 text-white text-xs">
                        {user?.name?.charAt(0) || user?.phone?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100 hidden sm:block">
                      {user?.name || user?.phone || "Account"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>
                    {user?.name || "User"}
                    <p className="text-xs text-muted-foreground font-normal">{user?.email || user?.phone}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/orders" className="cursor-pointer">
                      <Package className="h-4 w-4 mr-2" /> My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile/settings" className="cursor-pointer">
                      <Settings className="h-4 w-4 mr-2" /> Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/auth/login" })} className="cursor-pointer text-red-600 focus:text-red-600">
                    <LogOut className="h-4 w-4 mr-2" /> Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  Log In
                </Link>
                <Button asChild size="sm" className="rounded-full">
                  <Link href="/auth/register">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {userRole === "CUSTOMER" ? (
          /* ─── Customer Dashboard ─────────── */
          <>
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 text-white">
              <div className="mx-auto max-w-7xl px-4 py-6">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                      Tubig, <span className="text-yellow-300">delivered!</span>
                    </h1>
                    <p className="text-blue-100 text-sm max-w-xl">
                      Order purified, mineral, and alkaline drinking water from local refilling stations.
                    </p>
                    <div className="relative max-w-xl mt-3">
                      <AddressSearch
                        variant="compact"
                        onSearch={handleAddressSearch}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
              <CustomerDashboard />
            </div>
          </>
        ) : userRole === "PROVIDER" && providerDashboard ? (
          /* ─── Provider Dashboard ─────────── */
          <section className="mx-auto max-w-7xl px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Your Station Overview</h2>
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="rounded-full text-xs">
                  Full Dashboard <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-card-foreground">{providerDashboard.stats?.totalOrders || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-card-foreground">₱{(providerDashboard.stats?.revenue || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-card-foreground">{providerDashboard.stats?.pendingOrders || 0}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-card-foreground">{providerDashboard.stats?.activeOrders || 0}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent orders for the provider */}
            {providerDashboard.recentOrders?.length > 0 && (
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-bold text-card-foreground">Recent Orders</h3>
                </div>
                <div className="divide-y divide-border">
                  {providerDashboard.recentOrders.slice(0, 5).map((order: any) => (
                    <div key={order.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-card-foreground">{order.user?.name || "Customer"}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.items?.map((i: any) => `${i.quantity}x ${i.product?.name || "Water"}`).join(", ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-card-foreground">₱{order.total}</p>
                        <Badge variant={order.status === "PENDING" ? "destructive" : "secondary"} className="text-[10px]">
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          <>
            {/* ─── Hero Section ──────────────────────────── */}
            <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 text-white">
              <div className="mx-auto max-w-7xl px-4 py-12 md:py-20">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-1 space-y-6">
                    <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                      Tubig,{" "}
                      <span className="text-yellow-300">delivered!</span>
                    </h1>
                    <p className="text-lg md:text-xl text-blue-100 max-w-xl">
                      {provinceInfo?.tagline || "Order purified, mineral, and alkaline drinking water from local refilling stations. Delivered to your door in minutes."}
                    </p>

                    {/* Search Bar with Address Autocomplete */}
                    <div className="relative max-w-xl">
                      <AddressSearch
                        variant="hero"
                        onSearch={handleAddressSearch}
                        className="mb-2"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-blue-200 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Service area: {isNationwide ? "Nationwide" : selectedCity}
                        </p>
                        {selectedBarangay && (
                          <>
                            <span className="text-blue-300 text-xs">•</span>
                            <p className="text-xs text-blue-200">
                              Brgy. {selectedBarangay}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hero Image / Graphic */}
                  <div className="hidden md:flex flex-1 justify-center">
                    <div className="relative">
                      <div className="h-56 w-56 rounded-full bg-blue-400/20 flex items-center justify-center animate-pulse-soft">
                        <div className="h-40 w-40 rounded-full bg-white/20 flex items-center justify-center">
                          <Droplets className="h-20 w-20 text-white/80" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ─── Map for visitors ──────────── */}
            <StationMap stations={allMapStations} selectedCity={selectedCity} />

            {/* ─── Platform Stats ──────────────────────── */}
            <section className="mx-auto max-w-7xl px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card rounded-2xl p-5 shadow-lg border border-border text-center">
                  <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2">
                    <Store className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-card-foreground">{platformStats?.stations || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Water Stations</p>
                </div>
                <div className="bg-card rounded-2xl p-5 shadow-lg border border-border text-center">
                  <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto mb-2">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-card-foreground">{platformStats?.orders || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Orders Delivered</p>
                </div>
                <div className="bg-card rounded-2xl p-5 shadow-lg border border-border text-center">
                  <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-2">
                    <MapPinned className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-card-foreground">{platformStats?.cities || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Cities Covered</p>
                </div>
                <div className="bg-card rounded-2xl p-5 shadow-lg border border-border text-center">
                  <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-card-foreground">{platformStats?.customers || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Happy Customers</p>
                </div>
              </div>
            </section>

            {/* ─── Set Your Address Prompt ────────────────── */}
            {!userAddress && (
              <section className="mx-auto max-w-7xl px-4 py-8">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/30 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/30 text-center">
                  <Navigation className="h-10 w-10 mx-auto text-blue-500 mb-3" />
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    Find stations near you
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                    Enter your barangay or use your current location to see water stations that deliver to your area.
                  </p>
                  <div className="max-w-md mx-auto">
                    <AddressSearch
                      variant="compact"
                      onSearch={handleAddressSearch}
                    />
                  </div>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => {
                        // Use the AddressSearch's geolocation
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            () => {
                              // Trigger the setup with a click on the "use my location" button
                              // The AddressSearch component handles this internally
                            },
                            () => {}
                          );
                        }
                      }}
                    >
                      <Crosshair className="h-3 w-3 mr-1" />
                      Use my location
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {/* ─── Stations Near You ──────────────────────── */}
            {userAddress && (
              <section className="mx-auto max-w-7xl px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-500" />
                      Stations serving your area
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {userAddress.barangay
                        ? `Brgy. ${userAddress.barangay}, ${userAddress.city}`
                        : userAddress.city}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => setUserAddress(null)}
                    >
                      Change address
                    </Button>
                    <Link
                      href={`/stations?city=${encodeURIComponent(userAddress.city)}${userAddress.barangay ? `&barangay=${encodeURIComponent(userAddress.barangay)}` : ""}`}
                    >
                      <Button variant="link" size="sm" className="text-blue-600 dark:text-blue-400 text-xs">
                        See All <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {isLoadingNearby ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-2xl border border-border p-4 space-y-3 bg-card">
                        <Skeleton className="h-32 w-full rounded-xl" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : nearbyStations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nearbyStations.map((station: any) => (
                      <Link
                        key={station.id}
                        href={`/stations/${station.slug || station.id}`}
                        className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all"
                      >
                        <div className="h-36 bg-gradient-to-br from-blue-100 dark:from-blue-900/50 to-cyan-50 dark:to-cyan-900/30 relative">
                          {station.logo && (
                            <img
                              src={station.logo}
                              alt={station.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                          {station.isFeatured && (
                            <span className="absolute top-2 right-2 bg-yellow-400 text-xs font-bold px-2 py-1 rounded-full">
                              Featured
                            </span>
                          )}
                          <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                            {station.deliveryFee === 0 ? "🚚 Free delivery" : `🚚 ₱${station.deliveryFee}`}
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-card-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {station.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {station.barangay && `${station.barangay}, `}{station.city}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-sm">
                            <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                              <Star className="h-3 w-3 fill-current" />
                              {station.rating?.toFixed(1) || "5.0"}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {station.products?.length || 0} products
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-muted rounded-2xl">
                    <Droplets className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      No stations found in {userAddress.barangay ? `${userAddress.barangay}, ` : ""}{userAddress.city}.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Try a different address or be the first to list your station!
                    </p>
                    <Button className="mt-4 rounded-full" variant="outline" asChild>
                      <Link href="/onboarding/station">
                        Register as a Water Station
                      </Link>
                    </Button>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* ─── Featured Stations (visible for non-CUSTOMER) ────────── */}
        {userRole !== "CUSTOMER" && (
          <section className="mx-auto max-w-7xl px-4 py-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                {isNationwide ? "Mga Station Nationwide" : `Mga Station sa ${selectedCity}`}
              </h2>
              <Link
                href={`/stations?city=${encodeURIComponent(selectedCity)}`}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                See All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {isLoadingStations ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl border border-border p-4 space-y-3 bg-card">
                    <Skeleton className="h-40 w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : featuredStations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredStations.map((station: any) => (
                  <Link
                    key={station.id}
                    href={`/stations/${station.slug || station.id}`}
                    className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all"
                  >
                    <div className="h-40 bg-gradient-to-br from-blue-100 dark:from-blue-900/50 to-cyan-50 dark:to-cyan-900/30 relative">
                      {station.logo && (
                        <img
                          src={station.logo}
                          alt={station.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {station.isFeatured && (
                        <span className="absolute top-2 right-2 bg-yellow-400 text-xs font-bold px-2 py-1 rounded-full">
                          Featured
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-card-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {station.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {station.barangay}, {station.city}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                          <Star className="h-3 w-3 fill-current" />
                          {station.rating.toFixed(1)}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          Free delivery
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted rounded-2xl">
                <Droplets className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  No stations found in {selectedCity}. Try selecting a different city above.
                </p>
                <Button className="mt-4 rounded-full" variant="outline" asChild>
                  <Link href="/onboarding/station">
                    Register as a Water Station
                  </Link>
                </Button>
              </div>
            )}
          </section>
        )}

        {/* ─── Nationwide Coverage Section ────────────── */}
        {userRole !== "CUSTOMER" && (
          <section className="mx-auto max-w-7xl px-4 py-8">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">
              Available nationwide
            </h2>
            <div className="max-w-2xl mx-auto">
              <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-50 via-cyan-50 to-white dark:from-blue-950/30 dark:via-cyan-950/20 dark:to-gray-950 border border-blue-100 dark:border-blue-900/30 text-center">
                <div className="text-5xl mb-4">🇵🇭</div>
                <h3 className="font-bold text-xl text-blue-800 dark:text-blue-300 mb-2">
                  All 17 Regions of the Philippines
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
                  From Batanes to Tawi-Tawi, water stations across the entire archipelago can list and deliver on AquaLink PH.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-blue-600 dark:text-blue-400">
                  <span>NCR</span>
                  <span>CAR</span>
                  <span>Ilocos</span>
                  <span>Cagayan</span>
                  <span>Central Luzon</span>
                  <span>CALABARZON</span>
                  <span>MIMAROPA</span>
                  <span>Bicol</span>
                  <span>Western Visayas</span>
                  <span>Central Visayas</span>
                  <span>Eastern Visayas</span>
                  <span>Zamboanga</span>
                  <span>Northern Mindanao</span>
                  <span>Davao</span>
                  <span>SOCCSKSARGEN</span>
                  <span>Caraga</span>
                  <span>BARMM</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── CTA for Station Owners ────────────────────── */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white mx-4 max-w-7xl rounded-3xl mb-12 lg:mx-auto">
          <div className="px-8 py-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              May water station ka ba?
            </h2>
            <p className="text-blue-100 mb-6 max-w-lg mx-auto">
              Join AquaLink PH and reach more customers. Free onboarding — no
              fees, no commitments.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-yellow-400 text-blue-900 hover:bg-yellow-300 rounded-full font-bold px-8"
            >
              <Link href="/onboarding/station">
                List Your Station Free
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* ─── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2026 AquaLink PH. Tubig, delivered! 🇵🇭</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Nationwide delivery across all 17 regions of the Philippines 🇵🇭
          </p>
        </div>
      </footer>
    </div>
  );
}