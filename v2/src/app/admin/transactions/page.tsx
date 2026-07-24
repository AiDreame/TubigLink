"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Banknote,
  Smartphone,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  ACCEPTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  PREPARING: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  DELIVERED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
};

const PAYMENT_ICONS: Record<string, React.ElementType> = {
  COD: Banknote,
  GCASH: Smartphone,
  CARD: CreditCard,
  PAYMAYA: Smartphone,
};

type OrderItem = {
  name: string;
  type: string;
  quantity: number;
  unitPrice: number;
};

type RecentOrder = {
  id: string;
  status: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  customer: { name: string | null; email: string | null; phone: string | null };
  station: { name: string; slug: string; city: string };
  items: OrderItem[];
};

type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function AdminTransactionsPage() {
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      params.set("limit", "50");
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/stats?${params}`);
      const json = await res.json();
      if (json.success) {
        setOrders(json.data.recentOrders);
        setPagination(json.data.pagination);
      } else {
        setError(json.error || "Failed to fetch transactions");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const handleSearch = () => fetchOrders(1);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) =>
    `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Transactions
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            View and manage all orders across the platform
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchOrders(pagination.page)}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by order ID or customer name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="PREPARING">Preparing</SelectItem>
                <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} disabled={loading}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && orders.length === 0 && (
        <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <ShoppingBag className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
              No transactions found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              {search || statusFilter
                ? "Try adjusting your search or filter criteria."
                : "No orders have been placed yet."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      {!loading && !error && orders.length > 0 && (
        <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-400">Order ID</th>
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-400">Customer</th>
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-400">Station</th>
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-400">Items</th>
                  <th className="text-right p-4 font-semibold text-slate-600 dark:text-slate-400">Amount</th>
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-400">Payment</th>
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const PaymentIcon = PAYMENT_ICONS[order.paymentMethod] || CreditCard;
                  return (
                    <tr
                      key={order.id}
                      className="border-b dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {order.id.slice(0, 8)}...
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {order.customer.name || "Unknown"}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {order.customer.email || order.customer.phone || ""}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {order.station.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {order.station.city}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-700 dark:text-slate-300">
                          {order.items.slice(0, 2).map((i) => i.name).join(", ")}
                          {order.items.length > 2 && (
                            <span className="text-slate-400"> +{order.items.length - 2} more</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <PaymentIcon className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-700 dark:text-slate-300">
                            {order.paymentMethod}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={`${STATUS_COLORS[order.status] || "bg-slate-100 text-slate-800"} border`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} transactions
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchOrders(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-400 px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchOrders(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}