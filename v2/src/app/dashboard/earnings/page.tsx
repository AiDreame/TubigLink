"use client";

import { useEffect, useState } from "react";
import { 
  DollarSign, 
  ArrowUpRight, 
  Calendar, 
  Download,
  Wallet,
  ArrowRightLeft,
  TrendingUp,
  Loader2
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";

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

export default function ProviderEarningsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stats = data?.stats;
  const revenue = stats?.revenue || 0;
  const pendingPayout = stats?.pendingOrders
    ? (stats.pendingOrders * (stats.revenue / Math.max(stats.completedOrders, 1))).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Earnings & Payouts</h1>
          <p className="text-sm text-muted-foreground">
            {stats?.completedOrders || 0} completed order{stats?.completedOrders !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="rounded-xl flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-2" />
            Report
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl flex-1 sm:flex-none">
            Withdraw Funds
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-100 flex items-center justify-between">
              Available Balance
              <Wallet className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-3xl font-bold">₱{revenue.toLocaleString()}.00</h3>
            <p className="text-xs text-blue-200 mt-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {stats?.completedOrders || 0} completed orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Pending Payouts
              <DollarSign className="h-4 w-4 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-3xl font-bold dark:text-white">₱{pendingPayout}</h3>
            <p className="text-xs text-muted-foreground mt-2">
              {stats?.pendingOrders || 0} pending order{stats?.pendingOrders !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Total Revenue
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-3xl font-bold dark:text-white">₱{revenue.toLocaleString()}.00</h3>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1 font-medium">
              <ArrowUpRight className="h-3 w-3" />
              {stats?.totalOrders || 0} total orders
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest order payments</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="text-blue-600">View All</Button>
        </CardHeader>
        <CardContent>
          {(!data?.recentOrders || data.recentOrders.length === 0) ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              No transactions yet. Earnings appear here when orders are completed.
            </div>
          ) : (
            <div className="space-y-6">
              {data.recentOrders.filter((o: any) => o.status === "DELIVERED" || o.status === "PENDING").slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      order.status === "DELIVERED" ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                    }`}>
                      <ArrowRightLeft className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold dark:text-white">
                        {order.status === "DELIVERED" ? "Order Payment" : "Pending Payment"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.user?.name || "Customer"} • 
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      order.status === "DELIVERED" ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"
                    }`}>+₱{order.total}</p>
                    <Badge variant="outline" className={`text-[10px] mt-1 ${
                      order.status === "DELIVERED" 
                        ? "text-green-600 dark:text-green-400 border-green-100 dark:border-green-800 bg-green-50 dark:bg-green-900/30" 
                        : "text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30"
                    }`}>
                      {order.status === "DELIVERED" ? "Completed" : "Pending"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Clock(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}