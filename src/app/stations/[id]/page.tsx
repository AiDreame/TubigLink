"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Phone, 
  Info, 
  Clock, 
  ShoppingBag,
  MessageSquare,
  ChevronRight,
  Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCard } from "@/components/customer/ProductCard";
import { StationWithProducts, Review } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { useCart } from "@/hooks/use-cart";
import { MESSAGES } from "@/lib/constants";
import { format } from "date-fns";
import Link from "next/link";

export default function StationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { itemCount } = useCart();
  const [station, setStation] = useState<StationWithProducts | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStation = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stations/${id}`);
      if (!res.ok) throw new Error("Failed to fetch station");
      const data = await res.json();
      if (data.success) {
        setStation(data.data);

        // Fetch real reviews
        const reviewsRes = await fetch(`/api/reviews?stationId=${id}`);
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          if (reviewsData.success) {
            setReviews(reviewsData.data);
          }
        }
      } else {
        throw new Error(data.error || "Station not found");
      }
    } catch (err) {
      console.error("Failed to fetch station", err);
      setError("Hindi makuha ang detalye ng water station.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = params.id as string;
    fetchStation(id);
  }, [params.id, fetchStation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" role="status" aria-label="Loading station details">
        <div className="h-48 w-full bg-muted animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-10">
          <div className="bg-card rounded-3xl p-6 shadow-xl border border-border space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <span className="sr-only">Loading station details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title={MESSAGES.errorTitle}
        message={error}
        onRetry={() => fetchStation(params.id as string)}
        fullPage
      />
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-background">
        <h2 className="text-xl font-bold text-foreground">{MESSAGES.stationNotFound}</h2>
        <Button onClick={() => router.back()} className="mt-4 rounded-xl min-h-[44px]">
          {MESSAGES.goBack}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-blue-600 overflow-hidden">
        {station.banner ? (
          <img src={station.banner} alt="" className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-500 opacity-80" />
        )}
        
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
          <Button 
            variant="secondary" 
            size="icon" 
            className="rounded-full bg-background/90 backdrop-blur-md min-h-[44px] min-w-[44px]"
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="icon" className="rounded-full bg-background/90 backdrop-blur-md min-h-[44px] min-w-[44px]" aria-label="Share station">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Station Info Card */}
      <div className="max-w-3xl mx-auto px-4 -mt-12 relative z-10">
        <div className="bg-card rounded-3xl p-6 shadow-xl border border-border">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-card-foreground">{station.name}</h1>
                {station.isFeatured && (
                  <Badge className="bg-yellow-400 text-yellow-900">Featured</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {station.address}, {station.barangay}
              </p>
            </div>
            <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/50">
              {station.name[0]}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-border">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-yellow-600 dark:text-yellow-400 font-bold">
                <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                <span>{station.rating.toFixed(2)} ★</span>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Rating</p>
            </div>
            <div className="text-center border-x border-border">
              <div className="font-bold text-card-foreground">
                {station.deliveryFee === 0 ? "Free" : `₱${station.deliveryFee}`}
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Delivery</p>
            </div>
            <div className="text-center">
              <div className="font-bold text-card-foreground">
                {station.minOrder === 0 ? "None" : `₱${station.minOrder}`}
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Min. Order</p>
            </div>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="mt-6">
          <Tabs defaultValue="products" className="w-full">
            <TabsList className="w-full bg-card rounded-2xl p-1 h-14 shadow-sm border border-border" role="tablist">
              <TabsTrigger 
                value="products" 
                className="flex-1 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white h-full"
                role="tab"
              >
                {MESSAGES.menu}
              </TabsTrigger>
              <TabsTrigger 
                value="info" 
                className="flex-1 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white h-full"
                role="tab"
              >
                Info
              </TabsTrigger>
              <TabsTrigger 
                value="reviews" 
                className="flex-1 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white h-full"
                role="tab"
              >
                {MESSAGES.customerReviews}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="mt-6 space-y-4" role="tabpanel">
              <h2 className="font-bold text-lg text-card-foreground px-2">{MESSAGES.menu}</h2>
              {station.products.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {station.products.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      station={{
                        id: station.id,
                        name: station.name,
                        slug: station.slug,
                        logo: station.logo
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-card rounded-3xl border border-dashed border-border">
                  <p className="text-muted-foreground">{MESSAGES.noProducts}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="info" className="mt-6 space-y-4" role="tabpanel">
              <div className="bg-card rounded-3xl p-6 shadow-sm border border-border space-y-6">
                <div>
                  <h3 className="font-bold mb-2 text-card-foreground flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                    {MESSAGES.aboutStation}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {station.description || "No description provided."}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                      <Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{MESSAGES.openingHours}</p>
                      <p className="text-sm font-semibold text-card-foreground">{station.openingTime} - {station.closingTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                      <Phone className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{MESSAGES.contact}</p>
                      <p className="text-sm font-semibold text-card-foreground">{station.phone || "Not provided"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-6 space-y-4" role="tabpanel">
              <div className="flex items-center justify-between px-2">
              <h2 className="font-bold text-lg text-card-foreground">{MESSAGES.customerReviews}</h2>
              <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-bold">
                <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                <span>{station.rating.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground font-normal">({station.totalReviews} reviews)</span>
              </div>
              </div>

              {reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-card rounded-2xl p-4 shadow-sm border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                            {review.user?.name?.[0] || "U"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-card-foreground">{review.user?.name || "Anonymous User"}</p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(review.createdAt), "MMM d, yyyy")}</p>
                          </div>
                        </div>
                        <div className="flex" aria-label={`${review.rating} out of 5 stars`}>
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-3 w-3 ${i < review.rating ? "text-yellow-500 fill-current" : "text-muted-foreground/30"}`} 
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-card rounded-3xl border border-dashed border-border">
                  <p className="text-muted-foreground">{MESSAGES.noReviews}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Floating Cart Button (All Screens) */}
      {itemCount > 0 && (
        <>
          {/* Mobile floating button */}
          <div className="fixed bottom-6 left-4 right-4 z-40 md:hidden">
            <Link href="/cart">
              <Button className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 dark:shadow-blue-900/50 flex items-center justify-between px-6" aria-label={`View cart with ${itemCount} items`}>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                    {itemCount}
                  </div>
                  <span className="font-bold">{MESSAGES.viewCart}</span>
                </div>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
          </div>
          {/* Desktop sticky bar */}
          <div className="hidden md:block sticky bottom-0 bg-card/95 backdrop-blur-md border-t border-border px-4 py-3 z-40">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                  {itemCount}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{itemCount} item{itemCount !== 1 ? 's' : ''} in cart</p>
                  <p className="text-sm font-bold text-card-foreground">Tap to review your order</p>
                </div>
              </div>
              <Link href="/cart">
                <Button className="rounded-xl h-12 bg-blue-600 hover:bg-blue-700 px-8 text-base font-bold shadow-lg">
                  View Cart →
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}