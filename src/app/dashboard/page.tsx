"use client";

import { useEffect, useState } from "react";
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Settings,
  Loader2,
  ShieldAlert
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MESSAGES, UNLIMITED_STOCK_SIZES, UNLIMITED_STOCK_SENTINEL } from "@/lib/constants";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface DashboardData {
  station: any;
  stats: {
    totalOrders: number;
    pendingOrders: number;
    activeOrders: number;
    completedOrders: number;
    totalCustomers: number;
    revenue: number;
    avgDeliveryMinutes: number;
  };
  recentOrders: any[];
  products: any[];
}

export default function DashboardHome() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docAlertCount, setDocAlertCount] = useState(0);

  useEffect(() => {
    if (!session?.user) return;

    Promise.all([
      fetch("/api/dashboard").then((res) => res.json()),
      fetch("/api/station/documents").then((res) => res.json()),
    ])
      .then(([dashJson, docsJson]) => {
        if (dashJson.success) {
          setData(dashJson.data);
        } else {
          setError(dashJson.error || "Failed to load");
        }

        // Check documents for expiry issues
        if (docsJson.success && Array.isArray(docsJson.data)) {
          const docs = docsJson.data;
          const now = new Date();
          let alertCount = 0;
          for (const doc of docs) {
            // Count expired docs
            if (doc.verificationStatus === "EXPIRED") {
              alertCount++;
              continue;
            }
            // Count expiring within 30 days
            if (doc.verificationStatus === "VERIFIED" && doc.expiryDate) {
              const expiry = new Date(doc.expiryDate);
              const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (daysLeft <= 30) {
                alertCount++;
              }
            }
            // Count rejected
            if (doc.verificationStatus === "REJECTED") {
              alertCount++;
            }
          }
          setDocAlertCount(alertCount);
        }
      })
      .catch(() => setError("Failed to connect"))
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-32">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const { stats, recentOrders } = data;
  const formattedRevenue = `₱${stats.revenue.toLocaleString()}`;

  const statCards = [
    { 
      label: MESSAGES.totalRevenue, 
      value: formattedRevenue, 
      icon: DollarSign, 
      trend: `${stats.pendingOrders} pending`, 
      isUp: true, 
      color: "text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400" 
    },
    { 
      label: MESSAGES.totalOrders, 
      value: String(stats.totalOrders), 
      icon: ShoppingBag, 
      trend: `${stats.activeOrders} active`, 
      isUp: true, 
      color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400" 
    },
    { 
      label: MESSAGES.customers, 
      value: String(stats.totalCustomers), 
      icon: Users, 
      trend: `${stats.completedOrders} completed`, 
      isUp: true, 
      color: "text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400" 
    },
    { 
      label: MESSAGES.avgDelivery, 
      value: `${stats.avgDeliveryMinutes}m`, 
      icon: TrendingUp, 
      trend: `${stats.pendingOrders} pending`, 
      isUp: false, 
      color: "text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400" 
    },
  ];

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDING": return <Badge variant="destructive" className="bg-red-500">Pending</Badge>;
      case "ACCEPTED":
      case "PREPARING": return <Badge className="bg-yellow-500">Preparing</Badge>;
      case "OUT_FOR_DELIVERY": return <Badge className="bg-blue-500">Out for Delivery</Badge>;
      case "DELIVERED": return <Badge className="bg-green-500">Delivered</Badge>;
      case "CANCELLED": return <Badge variant="outline">Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Document Alert Banner */}
      {docAlertCount > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">Document attention needed</p>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {docAlertCount} document(s) need attention — expired, expiring soon, or rejected.{" "}
              <Link href="/dashboard/documents" className="font-medium underline">
                Review documents
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* TIN Warning Banner */}
      {data.station && !data.station.tin && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">Complete your registration</p>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              TIN is required before you can start selling.{" "}
              <Link href="/onboarding/station" className="font-medium underline">
                Add your TIN now
              </Link>
            </p>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-3xl font-bold tracking-tight">{MESSAGES.goodDay}</h2>
        <p className="text-muted-foreground">{data.station?.name || MESSAGES.dashboardSubtitle}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" role="region" aria-label="Dashboard statistics">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm bg-white dark:bg-gray-800/50 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl ${stat.color}`}>
                  <stat.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className={`flex items-center text-xs font-bold ${stat.isUp ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}>
                  {stat.trend}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <h3 className="text-2xl font-bold">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Orders */}
        <Card className="col-span-4 border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardHeader>
            <CardTitle>{MESSAGES.recentOrders}</CardTitle>
            <CardDescription>
              {stats.pendingOrders > 0 
                ? `You have ${stats.pendingOrders} pending order${stats.pendingOrders > 1 ? 's' : ''} today.`
                : "No pending orders."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                No orders yet. Orders will appear here once customers start ordering.
              </div>
            ) : (
              <div className="space-y-6">
                {recentOrders.slice(0, 5).map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-bold dark:text-white">{order.user?.name || "Customer"}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm font-bold dark:text-white">₱{order.total}</p>
                      {statusBadge(order.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/dashboard/orders">
              <Button variant="ghost" className="w-full mt-6 text-blue-600 min-h-[44px]">
                {MESSAGES.viewAllOrders}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Station Status */}
        <Card className="col-span-3 border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardHeader>
            <CardTitle>{MESSAGES.stationStatus}</CardTitle>
            <CardDescription>{MESSAGES.realTimePerformance}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                  <span className="text-sm dark:text-gray-300">{MESSAGES.operatingHours}</span>
                </div>
                <span className="text-sm font-bold dark:text-white">
                  {data.station?.openingTime || "06:00"} – {data.station?.closingTime || "21:00"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
                  <span className="text-sm dark:text-gray-300">{MESSAGES.stationOnline}</span>
                </div>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none dark:bg-green-900/30 dark:text-green-400">
                  {data.station?.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <span className="text-sm">{MESSAGES.lowStockAlert}</span>
                </div>
                <span className="text-sm font-bold dark:text-white">
                  {data.products.filter((p: any) => !UNLIMITED_STOCK_SIZES.includes(p.size) && p.stock !== UNLIMITED_STOCK_SENTINEL && p.stock < 10).length} products low
                </span>
              </div>
            </div>
            
            <div className="pt-6 border-t dark:border-gray-700">
              <h4 className="text-sm font-bold mb-4 dark:text-white">{MESSAGES.quickActions}</h4>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/dashboard/products">
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2 rounded-2xl min-h-[80px] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
                    <Plus className="h-5 w-5" aria-hidden="true" />
                    <span className="text-xs">{MESSAGES.addProduct}</span>
                  </Button>
                </Link>
                <Link href="/dashboard/settings">
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2 rounded-2xl min-h-[80px] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
                    <Settings className="h-5 w-5" aria-hidden="true" />
                    <span className="text-xs">{MESSAGES.editStation}</span>
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}