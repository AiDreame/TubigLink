"use client";

import { useCallback, useEffect, useState } from "react";
import {
  TrendingUp,
  Users,
  ShoppingBag,
  DollarSign,
  Clock,
  AlertCircle,
  Loader2,
  BarChart3,
  ArrowUpRight,
  RefreshCw,
  CalendarX2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ─── Types ────────────────────────────────────
interface AnalyticsData {
  ordersByDay: { date: string; count: number; revenue: number }[];
  popularProducts: { name: string; quantityOrdered: number; revenue: number }[];
  statusDistribution: Record<string, number>;
  busiestHours: { hour: number; count: number }[];
  busiestDays: { day: string; count: number }[];
  repeatCustomers: { total: number; repeat: number; percentage: number };
  avgOrderValue: number;
  avgDeliveryMinutes: number;
  totalOrders: number;
  monthlyComparison: {
    thisMonth: { orders: number; revenue: number };
    lastMonth: { orders: number; revenue: number };
  };
  range: { from: string; to: string; days: number } | null;
  comparison: {
    custom: boolean;
    thisLabel: string;
    lastLabel: string;
    title: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#EF4444",
  ACCEPTED: "#F59E0B",
  PREPARING: "#F97316",
  OUT_FOR_DELIVERY: "#3B82F6",
  DELIVERED: "#22C55E",
  CANCELLED: "#6B7280",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

function formatCurrency(amount: number | null | undefined): string {
  const safeAmount = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return `₱${safeAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Local-timezone YYYY-MM-DD for <input type="date"> values. */
function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Inclusive number of days between two YYYY-MM-DD strings. */
function daysInRange(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return (
    Math.round(
      (new Date(ty, tm - 1, td).getTime() - new Date(fy, fm - 1, fd).getTime()) / 86400000
    ) + 1
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-none shadow-sm lg:col-span-1">
            <CardContent className="p-6">
              <Skeleton className="h-[250px] w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────
export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [appliedRange, setAppliedRange] = useState<{ from: string; to: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fetchAnalytics = useCallback((range: { from: string; to: string } | null) => {
    setLoading(true);
    setError(null);
    const qs = range ? `?from=${range.from}&to=${range.to}` : "";
    fetch(`/api/dashboard/analytics${qs}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || "Failed to load analytics");
        }
      })
      .catch(() => setError("Failed to connect to server"))
      .finally(() => setLoading(false));
  }, []);

  // Default on load: last 30 days (custom range → comparison vs the previous 30 days)
  useEffect(() => {
    if (!session?.user) return;
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
    const range = { from: toDateInputValue(from), to: toDateInputValue(today) };
    setFromInput(range.from);
    setToInput(range.to);
    setAppliedRange(range);
    fetchAnalytics(range);
  }, [session, fetchAnalytics]);

  const applyPreset = (numDays: number) => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (numDays - 1));
    const range = { from: toDateInputValue(from), to: toDateInputValue(today) };
    setFromInput(range.from);
    setToInput(range.to);
    setAppliedRange(range);
    setValidationError(null);
    fetchAnalytics(range);
  };

  const applyThisMonth = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const range = { from: toDateInputValue(from), to: toDateInputValue(now) };
    setFromInput(range.from);
    setToInput(range.to);
    setAppliedRange(range);
    setValidationError(null);
    fetchAnalytics(range);
  };

  const applyCustom = () => {
    if (!fromInput || !toInput) {
      setValidationError("Please select both From and To dates.");
      return;
    }
    if (fromInput > toInput) {
      setValidationError("The From date must be on or before the To date.");
      return;
    }
    if (daysInRange(fromInput, toInput) > 366) {
      setValidationError("Date range must be at most 366 days.");
      return;
    }
    setValidationError(null);
    const range = { from: fromInput, to: toInput };
    setAppliedRange(range);
    fetchAnalytics(range);
  };

  const resetToDefault = () => {
    setFromInput("");
    setToInput("");
    setAppliedRange(null);
    setValidationError(null);
    fetchAnalytics(null);
  };

  // ── render helpers ──────────────────────────
  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <BarChart3 className="h-16 w-16 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">Sign in to view analytics</p>
      </div>
    );
  }

  if (loading) return <AnalyticsSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-600 font-medium mb-4">{error}</p>
        <Button onClick={() => fetchAnalytics(appliedRange)} className="min-h-[44px] min-w-[120px]">
          <RefreshCw className="h-4 w-4 mr-2" />
          Subukan Muli
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const { ordersByDay, popularProducts, statusDistribution, busiestHours, busiestDays, repeatCustomers, avgDeliveryMinutes, totalOrders } = data;
  const avgOrderValue = data.avgOrderValue ?? 0;
  const monthlyComparison = data.monthlyComparison ?? {};
  const thisMonthOrders = monthlyComparison.thisMonth?.orders ?? 0;
  const lastMonthOrders = monthlyComparison.lastMonth?.orders ?? 0;
  const thisMonthRevenue = monthlyComparison.thisMonth?.revenue ?? 0;
  const lastMonthRevenue = monthlyComparison.lastMonth?.revenue ?? 0;

  const isCustom = !!data.range && !!data.comparison?.custom;
  const comparisonTitle = data.comparison?.title ?? "Monthly Comparison";
  const thisLabel = isCustom ? data.comparison?.thisLabel ?? "" : "This Month";
  const lastLabel = isCustom ? data.comparison?.lastLabel ?? "" : "Last Month";

  // Compute summary stats
  const totalRevenue = ordersByDay.reduce((sum, d) => sum + d.revenue, 0);
  const revenueChange = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : 0;
  const ordersChange = lastMonthOrders > 0
    ? Math.round(((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100)
    : 0;
  const hasOrdersInWindow = ordersByDay.reduce((sum, d) => sum + d.count, 0) > 0;
  const vsText = isCustom ? "vs previous period" : "vs last month";
  const fromLastText = isCustom ? "vs previous period" : "from last month";

  // Status distribution for pie chart
  const statusPieData = Object.entries(statusDistribution)
    .filter(([, count]) => count > 0)
    .map(([name, value]) => ({ name: STATUS_LABELS[name] || name, value, color: STATUS_COLORS[name] || "#999" }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg border dark:border-gray-700 text-sm">
        <p className="font-bold mb-1 dark:text-white">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} style={{ color: entry.color }} className="font-medium">
            {entry.name}: {entry.name === "Revenue" ? formatCurrency(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  };

  const summaryCards = [
    {
      label: isCustom ? `Total Revenue (${thisLabel})` : "Total Revenue (30d)",
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      trend: `${revenueChange >= 0 ? "+" : ""}${revenueChange}% ${vsText}`,
      isUp: revenueChange >= 0,
      color: "text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400",
    },
    {
      label: isCustom ? `Orders (${thisLabel})` : "Total Orders",
      value: String(totalOrders),
      icon: ShoppingBag,
      trend: `${ordersChange >= 0 ? "+" : ""}${ordersChange}% ${vsText}`,
      isUp: ordersChange >= 0,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
    },
    {
      label: "Avg. Order Value",
      value: formatCurrency(avgOrderValue),
      icon: TrendingUp,
      trend: `${repeatCustomers.percentage}% repeat customers`,
      isUp: true,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400",
    },
    {
      label: "Avg. Delivery Time",
      value: `${avgDeliveryMinutes}m`,
      icon: Clock,
      trend: `${thisMonthOrders} orders ${isCustom ? "in period" : "this month"}`,
      isUp: avgDeliveryMinutes <= 30,
      color: "text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400",
    },
  ];

  const dateFilterCard = (
    <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-4">
          <div className="grid grid-cols-2 gap-3 lg:flex lg:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="analytics-from" className="text-xs font-medium text-muted-foreground">
                From
              </Label>
              <Input
                id="analytics-from"
                type="date"
                value={fromInput}
                max={toInput || undefined}
                onChange={(e) => setFromInput(e.target.value)}
                className="w-full lg:w-40"
                aria-label="Analytics start date"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="analytics-to" className="text-xs font-medium text-muted-foreground">
                To
              </Label>
              <Input
                id="analytics-to"
                type="date"
                value={toInput}
                min={fromInput || undefined}
                onChange={(e) => setToInput(e.target.value)}
                className="w-full lg:w-40"
                aria-label="Analytics end date"
              />
            </div>
            <Button
              onClick={applyCustom}
              disabled={loading}
              className="min-h-[44px] lg:min-w-[100px]"
            >
              Apply
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1 hidden xl:inline">Quick:</span>
            <Button variant="outline" size="sm" onClick={() => applyPreset(7)} disabled={loading} className="min-h-[36px] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
              Last 7 days
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset(30)} disabled={loading} className="min-h-[36px] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
              Last 30 days
            </Button>
            <Button variant="outline" size="sm" onClick={applyThisMonth} disabled={loading} className="min-h-[36px] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
              This month
            </Button>
            <Button variant="ghost" size="sm" onClick={resetToDefault} disabled={loading} className="min-h-[36px] dark:text-gray-400 dark:hover:bg-gray-800">
              Reset to default
            </Button>
          </div>
        </div>
        {validationError && <p className="mt-3 text-sm font-medium text-red-500">{validationError}</p>}
      </CardContent>
    </Card>
  );

  // ── Render ──────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight dark:text-white">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights and performance metrics for your water station
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchAnalytics(appliedRange)} className="min-h-[44px] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Date range filter */}
      {dateFilterCard}

      {hasOrdersInWindow ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" role="region" aria-label="Analytics summary">
            {summaryCards.map((stat) => (
              <Card key={stat.label} className="border-none shadow-sm bg-white dark:bg-gray-800/50 dark:bg-gray-800/50 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-xl ${stat.color}`}>
                      <stat.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className={`flex items-center text-xs font-bold ${stat.isUp ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}>
                      <ArrowUpRight className="h-3 w-3 mr-0.5" />
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

          {/* Charts */}
          <Tabs defaultValue="revenue" className="space-y-6">
            <TabsList className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-1">
              <TabsTrigger value="revenue" className="rounded-lg min-h-[44px] min-w-[100px] dark:text-gray-400 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">Revenue</TabsTrigger>
              <TabsTrigger value="orders" className="rounded-lg min-h-[44px] min-w-[100px] dark:text-gray-400 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">Orders</TabsTrigger>
              <TabsTrigger value="status" className="rounded-lg min-h-[44px] min-w-[100px] dark:text-gray-400 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">Status</TabsTrigger>
              <TabsTrigger value="hours" className="rounded-lg min-h-[44px] min-w-[100px] dark:text-gray-400 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">Peak Hours</TabsTrigger>
            </TabsList>

            {/* Revenue Tab */}
            <TabsContent value="revenue" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2 border-none shadow-sm bg-white dark:bg-gray-800/50 dark:bg-gray-800/50">
                  <CardHeader>
                    <CardTitle className="text-lg dark:text-white">Revenue Trend</CardTitle>
                    <CardDescription>{isCustom ? `Daily revenue for ${thisLabel}` : "Daily revenue over the last 30 days"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full" role="img" aria-label="Revenue trend line chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={ordersByDay} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10 }}
                            tickFormatter={(val: string) => val.slice(5)}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            tickFormatter={(val: number) => `₱${val}`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6, fill: "#3B82F6" }}
                            name="Revenue"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Comparison */}
                <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50 dark:bg-gray-800/50">
                  <CardHeader>
                    <CardTitle className="text-lg dark:text-white">{comparisonTitle}</CardTitle>
                    <CardDescription>{isCustom ? `${thisLabel} vs ${lastLabel}` : "This month vs last month"}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Revenue</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">{thisLabel}</p>
                          <p className="text-lg font-bold text-blue-600">{formatCurrency(thisMonthRevenue)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{lastLabel}</p>
                          <p className="text-lg font-bold">{formatCurrency(lastMonthRevenue)}</p>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{
                            width: `${lastMonthRevenue > 0
                              ? Math.min((thisMonthRevenue / lastMonthRevenue) * 100, 100)
                              : 0}%`,
                          }}
                        />
                      </div>
                      <p className={`text-xs font-bold ${revenueChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {revenueChange >= 0 ? "+" : ""}{revenueChange}% {fromLastText}
                      </p>
                    </div>
                    <div className="pt-4 border-t space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Orders</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">{thisLabel}</p>
                          <p className="text-lg font-bold text-blue-600">{thisMonthOrders}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{lastLabel}</p>
                          <p className="text-lg font-bold">{lastMonthOrders}</p>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{
                            width: `${lastMonthOrders > 0
                              ? Math.min((thisMonthOrders / lastMonthOrders) * 100, 100)
                              : 0}%`,
                          }}
                        />
                      </div>
                      <p className={`text-xs font-bold ${ordersChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {ordersChange >= 0 ? "+" : ""}{ordersChange}% {fromLastText}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Orders Over Time</CardTitle>
                    <CardDescription>{isCustom ? `Daily order count for ${thisLabel}` : "Daily order count for the last 30 days"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full" role="img" aria-label="Orders over time bar chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ordersByDay} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10 }}
                            tickFormatter={(val: string) => val.slice(5)}
                            interval="preserveStartEnd"
                          />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Orders" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Busiest Days */}
                <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Busiest Days</CardTitle>
                    <CardDescription>Orders by day of the week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full" role="img" aria-label="Busiest days bar chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={busiestDays} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Orders" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Status Tab */}
            <TabsContent value="status">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Order Status Distribution</CardTitle>
                    <CardDescription>Breakdown of all orders by current status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full" role="img" aria-label="Order status distribution pie chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                            labelLine={true}
                          >
                            {statusPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Status Summary */}
                <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Status Breakdown</CardTitle>
                    <CardDescription>Quick overview of order statuses</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(statusDistribution).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: STATUS_COLORS[status] || "#999" }}
                          />
                          <span className="text-sm font-medium">{STATUS_LABELS[status] || status}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold">{count}</span>
                          <span className="text-xs text-muted-foreground w-12 text-right">
                            {totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Peak Hours Tab */}
            <TabsContent value="hours">
              <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-lg">Peak Order Hours</CardTitle>
                  <CardDescription>Order volume by hour of day — plan your staffing accordingly</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px] w-full" role="img" aria-label="Peak hours bar chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={busiestHours} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="hour"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(val: number) => `${val}:00`}
                          interval={2}
                        />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length || label == null) return null;
                            return (
                              <div className="bg-white p-3 rounded-xl shadow-lg border text-sm">
                                <p className="font-bold mb-1">{`${label}:00 – ${Number(label) + 1}:00`}</p>
                                <p className="font-medium text-blue-600">{payload[0].value} orders</p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="count" fill="#F97316" radius={[4, 4, 0, 0]} name="Orders" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Bottom Grid: Popular Products + Repeat Customers */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Popular Products */}
            <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
              <CardHeader>
                <CardTitle className="text-lg">Popular Products</CardTitle>
                <CardDescription>Top 10 most ordered products</CardDescription>
              </CardHeader>
              <CardContent>
                {popularProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No product data yet. Products will appear once orders start coming in.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {popularProducts.map((product, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-bold text-gray-400 w-5">#{idx + 1}</span>
                          <span className="text-sm font-medium truncate">{product.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-right shrink-0">
                          <span className="text-xs text-muted-foreground">{product.quantityOrdered}x ordered</span>
                          <span className="text-sm font-bold w-20">{formatCurrency(product.revenue ?? 0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Repeat Customers & Customer Metrics */}
            <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
              <CardHeader>
                <CardTitle className="text-lg">Customer Insights</CardTitle>
                <CardDescription>Understanding your customer base</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{repeatCustomers.total}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Customers</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{repeatCustomers.repeat}</p>
                    <p className="text-xs text-muted-foreground mt-1">Repeat Customers</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Repeat Customer Rate</span>
                    <span className="text-sm font-bold">{repeatCustomers.percentage}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all"
                      style={{ width: `${repeatCustomers.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {repeatCustomers.percentage >= 40
                      ? "Great retention rate! Your customers keep coming back."
                      : repeatCustomers.percentage >= 20
                      ? "Good retention. Try referral programs to boost repeat orders."
                      : "Focus on customer satisfaction to improve repeat orders."}
                  </p>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Order Value</span>
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(avgOrderValue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        /* Empty state — no orders in the selected period */
        <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <CalendarX2 className="h-14 w-14 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-300 font-medium text-lg">No orders in this period</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Try widening the date range, or reset to the default view to see your latest analytics.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
