"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShoppingBag,
  CreditCard,
  Banknote,
  Smartphone,
  AlertCircle,
  Filter,
  ChevronDown,
  User,
  Store,
  Eye,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  ACCEPTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  PREPARING: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  DELIVERED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
};

const PAYMENT_COLORS: Record<string, string> = {
  COD: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  GCASH: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  CARD: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  PAYMAYA: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
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
  notes: string | null;
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
  const [selectedOrder, setSelectedOrder] = useState<RecentOrder | null>(null);

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

  const summaryData = {
    total: pagination.total,
    delivered: orders.filter((o) => o.status === "DELIVERED").length,
    pending: orders.filter((o) => o.status === "PENDING" || o.status === "ACCEPTED" || o.status === "PREPARING" || o.status === "OUT_FOR_DELIVERY").length,
    cancelled: orders.filter((o) => o.status === "CANCELLED").length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Transactions
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            View and manage all orders across the platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => fetchOrders(pagination.page)}
            disabled={loading}
          >
            <Loader2 className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white dark:bg-gray-800/50 border-none shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{summaryData.total}</p>
            <p className="text-xs text-slate-500 mt-1">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{summaryData.delivered}</p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">Delivered</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{summaryData.pending}</p>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">In Progress</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{summaryData.cancelled}</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by order ID or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10 rounded-xl bg-white dark:bg-gray-800/50"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-xl min-w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              {statusFilter || "All Statuses"}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => { setStatusFilter(""); }}>All Statuses</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setStatusFilter("PENDING")}>Pending</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("ACCEPTED")}>Accepted</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("PREPARING")}>Preparing</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("OUT_FOR_DELIVERY")}>Out for Delivery</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("DELIVERED")}>Delivered</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("CANCELLED")}>Cancelled</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={handleSearch} disabled={loading} className="rounded-xl">
          Search
        </Button>
      </div>

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
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-sm text-slate-500">Loading transactions...</p>
          </div>
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
        <Card className="border-none shadow-sm bg-white dark:bg-gray-800/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Order ID</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Customer</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider hidden md:table-cell">Station</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Items</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Amount</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Payment</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Date</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const PaymentIcon = PAYMENT_ICONS[order.paymentMethod] || CreditCard;
                  return (
                    <TableRow
                      key={order.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <TableCell>
                        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                          {order.id.slice(0, 8)}...
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                          {order.customer.name || "Unknown"}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {order.customer.email || order.customer.phone || ""}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                          {order.station.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {order.station.city}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-sm text-slate-700 dark:text-slate-300">
                          {order.items.slice(0, 2).map((i) => i.name).join(", ")}
                          {order.items.length > 2 && (
                            <span className="text-slate-400"> +{order.items.length - 2} more</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {formatCurrency(order.total)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${PAYMENT_COLORS[order.paymentMethod] || "bg-slate-100 text-slate-800"} font-medium`}
                        >
                          <PaymentIcon className="h-3 w-3 mr-1 inline" />
                          {order.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${STATUS_COLORS[order.status] || "bg-slate-100 text-slate-800"} font-medium`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-[36px] min-w-[36px]"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
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
              className="rounded-xl"
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
              className="rounded-xl"
              onClick={() => fetchOrders(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg">Order Details</DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                      <span className="font-mono text-xs">{selectedOrder.id.slice(0, 8)}...</span>
                      <span>•</span>
                      <Badge
                        variant="outline"
                        className={`${STATUS_COLORS[selectedOrder.status] || "bg-slate-100 text-slate-800"} font-medium`}
                      >
                        {selectedOrder.status.replace(/_/g, " ")}
                      </Badge>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700">
                    <p className="text-xs text-slate-500">Customer</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {selectedOrder.customer.name || "Unknown"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700">
                    <p className="text-xs text-slate-500">Station</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5 text-slate-400" />
                      {selectedOrder.station.name}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700">
                    <p className="text-xs text-slate-500">Payment Method</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      {(() => {
                        const PIcon = PAYMENT_ICONS[selectedOrder.paymentMethod] || CreditCard;
                        return <span className="flex items-center gap-1.5"><PIcon className="h-3.5 w-3.5" />{selectedOrder.paymentMethod}</span>;
                      })()}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700">
                    <p className="text-xs text-slate-500">Total Amount</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                      {formatCurrency(selectedOrder.total)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Order Items</p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.type} • x{item.quantity}</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700">
                  <p className="text-xs text-slate-500">Order Date</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{formatDate(selectedOrder.createdAt)}</p>
                </div>

                {selectedOrder.notes && (
                  <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider mb-1">Delivery Notes</p>
                    <p className="text-sm text-slate-900 dark:text-slate-200">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
