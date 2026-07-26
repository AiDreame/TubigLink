"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Store,
  ShoppingBag,
  TrendingUp,
  Loader2,
  DollarSign,
  BarChart3,
  Activity,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MESSAGES } from "@/lib/constants";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type OverviewStats = {
  totalStations: number;
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
};

type StatusBreakdown = {
  status: string;
  count: number;
};

type PaymentBreakdown = {
  method: string;
  count: number;
  total: number;
};

type TopStation = {
  id: string;
  name: string;
  slug: string;
  city: string;
  orderCount: number;
};

type RevenueDay = {
  date: string;
  revenue: number;
  count: number;
};

type RecentOrder = {
  id: string;
  status: string;
  total: number;
  paymentMethod: string;
  customer: { name: string | null };
  station: { name: string };
  items: { name: string; quantity: number }[];
  createdAt: string;
};

type StatsData = {
  overview: OverviewStats;
  ordersByStatus: StatusBreakdown[];
  paymentMethodBreakdown: PaymentBreakdown[];
  topStations: TopStation[];
  recentOrders: RecentOrder[];
  revenueByDay: RevenueDay[];
};

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  ACCEPTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  PREPARING: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  DELIVERED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/stats?limit=5");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || "Failed to load stats");
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const formatCurrency = (amount: number) =>
    `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 0 })}`;

  const statsCards = [
    {
      label: "Total Stations",
      value: data.overview.totalStations.toLocaleString(),
      color: "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50",
      textColor: "text-blue-700 dark:text-blue-400",
      subColor: "text-blue-600 dark:text-blue-500",
      href: "/admin/stations",
    },
    {
      label: "Total Users",
      value: data.overview.totalUsers.toLocaleString(),
      color: "bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/50",
      textColor: "text-purple-700 dark:text-purple-400",
      subColor: "text-purple-600 dark:text-purple-500",
      href: "/admin/users",
    },
    {
      label: "Total Orders",
      value: data.overview.totalOrders.toLocaleString(),
      color: "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50",
      textColor: "text-green-700 dark:text-green-400",
      subColor: "text-green-600 dark:text-green-500",
      href: "/admin/transactions",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(data.overview.totalRevenue),
      color: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50",
      textColor: "text-amber-700 dark:text-amber-400",
      subColor: "text-amber-600 dark:text-amber-500",
      href: "/admin/transactions",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {MESSAGES.systemOverview}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Monitor platform performance and key metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href="/admin/compliance">
              <Activity className="h-4 w-4 mr-2" /> Compliance
            </Link>
          </Button>
          <Button className="rounded-xl bg-blue-600 hover:bg-blue-700" asChild>
            <Link href="/admin/stations">
              <Store className="h-4 w-4 mr-2" /> Manage Stations
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid — compliance-style cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className={`${stat.color} shadow-sm cursor-pointer hover:shadow-md transition-shadow`}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
                <p className={`text-xs ${stat.subColor} mt-1`}>{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="col-span-2 border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg dark:text-white">Revenue Trends</CardTitle>
              <Badge variant="outline" className="font-medium">30 Days</Badge>
            </div>
            <CardDescription>Daily revenue for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {data.revenueByDay.length > 0 ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueByDay}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `₱${val}`} />
                    <Tooltip
                      formatter={(value: any) => [formatCurrency(Number(value)), "Revenue"]}
                      labelFormatter={(label) => new Date(label).toLocaleDateString("en-PH")}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] w-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                No revenue data available yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Method Breakdown */}
        <Card className="col-span-1 border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardHeader>
            <CardTitle className="text-lg dark:text-white">Payment Methods</CardTitle>
            <CardDescription>Distribution by payment method</CardDescription>
          </CardHeader>
          <CardContent>
            {data.paymentMethodBreakdown.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.paymentMethodBreakdown.map((p) => ({
                        name: p.method,
                        value: p.count,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.paymentMethodBreakdown.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [value ?? 0, "Orders"]} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => (
                        <span className="text-xs text-slate-600 dark:text-slate-400">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400 dark:text-slate-500">
                No payment data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Orders */}
        <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg dark:text-white">Recent Orders</CardTitle>
                <CardDescription>Latest 5 orders across the platform</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="rounded-xl" asChild>
                <Link href="/admin/transactions">
                  View All <ArrowUpRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentOrders.length > 0 ? (
              <div className="space-y-3">
                {data.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">
                          {order.id.slice(0, 8)}...
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 border font-medium ${
                            STATUS_COLORS[order.status] || "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate mt-1">
                        {order.customer.name || "Unknown"} → {order.station.name}
                      </p>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(order.total)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                No orders yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Stations */}
        <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg dark:text-white">Top Stations</CardTitle>
                <CardDescription>Stations with the most orders</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="rounded-xl" asChild>
                <Link href="/admin/stations">
                  View All <ArrowUpRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.topStations.length > 0 ? (
              <div className="space-y-3">
                {data.topStations.map((station, idx) => (
                  <div
                    key={station.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {station.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{station.city}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {station.orderCount}
                      </p>
                      <p className="text-[10px] text-slate-400">orders</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                No stations with orders yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
