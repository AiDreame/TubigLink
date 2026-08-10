"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { 
  Search, 
  MoreVertical, 
  Phone, 
  CheckCircle2,
  Truck,
  XCircle,
  Loader2,
  RefreshCw,
  Smartphone,
  Wallet,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  Package,
  MapPin,
  Clock,
  CreditCard,
  FileText,
  AlertCircle,
  Calendar,
  Filter,
  ShoppingBag,
  Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { normalizePhoneForDialing } from "@/lib/phone";

interface Order {
  id: string;
  userId: string;
  status: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  paymentMethod: string;
  paymentStatus: string;
  notes: string | null;
  deliveryPhoto: string | null;
  deliveryConfirmedAt: string | null;
  items: { product: { name: string; price: number }; quantity: number; unitPrice: number }[];
  user: { name: string; phone: string };
  address: { street: string; barangay: string; city: string; province: string; landmark: string | null };
  addressId: string;
  driverId: string | null;
  driver: { id: string; name: string; email: string; role: string } | null;
  createdAt: string;
  updatedAt: string;
  orderType: string;
}

interface StaffOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

type StatusTab = "ALL" | "PENDING" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
const STATUS_TABS: { label: string; value: StatusTab }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Preparing", value: "PREPARING" },
  { label: "Out for Delivery", value: "OUT_FOR_DELIVERY" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
];

type PeriodFilter = "7d" | "30d" | "all";
const PERIOD_OPTIONS: { label: string; value: PeriodFilter }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "All time", value: "all" },
];

const ITEMS_PER_PAGE = 10;

export default function ProviderOrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("ALL");
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffOption[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  // Delivery evidence photo (optional, station-only, before customer confirmation)
  const [dialogPhotoFile, setDialogPhotoFile] = useState<File | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadingFor, setPhotoUploadingFor] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const uploadDeliveryPhoto = async (order: Order, file: File) => {
    setPhotoUploading(true);
    setPhotoUploadingFor(order.id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/orders/${order.id}/delivery-photo`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Upload failed");
      toast.success("Delivery photo attached");
      setDetailOrder({ ...order, deliveryPhoto: json.data.deliveryPhoto });
      setDialogPhotoFile(null);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || "Photo upload failed");
    } finally {
      setPhotoUploading(false);
      setPhotoUploadingFor(null);
    }
  };

  const fetchOrders = useCallback(() => {
    setLoading(true);
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setOrders(json.data.recentOrders || []);
        }
      })
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

  const fetchStaff = useCallback(() => {
    fetch("/api/station/staff")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const drivers = (json.data || [])
            .filter((s: any) => s.status === "ACTIVE" && (s.role === "DRIVER" || s.role === "STAFF"))
            .map((s: any) => ({
              id: s.id,
              name: s.name || s.user?.name || s.email,
              email: s.email,
              role: s.role,
            }));
          setStaffMembers(drivers);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchOrders();
      fetchStaff();
    }
  }, [session, fetchOrders, fetchStaff]);

  const assignDriver = async (orderId: string, driverId: string | null) => {
    setAssigningId(orderId);
    try {
      const res = await fetch(`/api/dashboard/orders/${orderId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(driverId ? "Driver assigned!" : "Driver unassigned");
        fetchOrders();
      } else {
        toast.error(json.error || "Failed to assign driver");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setAssigningId(null);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusTab, searchTerm, period]);

  const updateStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/dashboard/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Order ${status.toLowerCase().replace(/_/g, " ")}`);
        fetchOrders();
      } else {
        toast.error(json.error || "Failed to update");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING": return <Badge variant="destructive" className="bg-red-500 hover:bg-red-500">Pending</Badge>;
      case "ACCEPTED": return <Badge className="bg-yellow-500 hover:bg-yellow-500">Preparing</Badge>;
      case "PREPARING": return <Badge className="bg-yellow-500 hover:bg-yellow-500">Preparing</Badge>;
      case "OUT_FOR_DELIVERY": return <Badge className="bg-blue-500 hover:bg-blue-500">Out for Delivery</Badge>;
      case "DELIVERED": return <Badge className="bg-green-500 hover:bg-green-500">Delivered</Badge>;
      case "CANCELLED": return <Badge variant="outline">Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Period filter
  const periodFilteredOrders = orders.filter((o) => {
    if (period === "all") return true;
    const days = period === "7d" ? 7 : 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return new Date(o.createdAt).getTime() >= cutoff;
  });

  // Status filter
  const tabFilteredOrders = statusTab === "ALL"
    ? periodFilteredOrders
    : periodFilteredOrders.filter((o) => {
        if (statusTab === "PREPARING") return o.status === "ACCEPTED" || o.status === "PREPARING";
        return o.status === statusTab;
      });

  // Search filter
  const searchedOrders = tabFilteredOrders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.user?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.max(1, Math.ceil(searchedOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = searchedOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const nextStatuses = (current: string): { label: string; value: string }[] => {
    switch (current) {
      case "PENDING":
        return [{ label: "Mark as Accepted", value: "ACCEPTED" }, { label: "Cancel Order", value: "CANCELLED" }];
      case "ACCEPTED":
      case "PREPARING":
        return [{ label: "Out for Delivery", value: "OUT_FOR_DELIVERY" }, { label: "Cancel Order", value: "CANCELLED" }];
      case "OUT_FOR_DELIVERY":
        return [{ label: "Mark Delivered", value: "DELIVERED" }];
      default:
        return [];
    }
  };

  const getItemSummary = (order: Order) => {
    if (!order.items?.length) return "—";
    return order.items.map((i) => `${i.quantity}x ${i.product?.name || "Water"}`).join(", ");
  };

  const getPaymentIcon = (method: string) => {
    return method === "GCASH" ? <Smartphone className="h-3.5 w-3.5 text-blue-500" /> : <Wallet className="h-3.5 w-3.5 text-green-500" />;
  };

  const getPaymentLabel = (method: string) => method === "GCASH" ? "GCash" : "COD";

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orders Management</h1>
          <p className="text-sm text-muted-foreground">
            {searchedOrders.length} of {periodFilteredOrders.length} order{periodFilteredOrders.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[140px] rounded-xl bg-white dark:bg-gray-800 min-h-[44px] dark:border-gray-700 dark:text-gray-300">
              <Calendar className="h-4 w-4 mr-1 text-gray-400 dark:text-gray-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl dark:bg-gray-800 dark:border-gray-700">
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="min-h-[44px] dark:text-gray-300 dark:focus:bg-gray-700">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-xl min-h-[44px] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800/50 rounded-2xl border dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input 
              placeholder="Search by customer or order ID..." 
              className="pl-10 rounded-xl bg-gray-50 dark:bg-gray-800 border-none dark:border dark:border-gray-700 min-h-[44px] dark:text-gray-300 dark:placeholder:text-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search orders"
            />
          </div>
        </div>

        {/* Status Tabs — sticky on mobile */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-2">
          <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)}>
            <TabsList className="bg-gray-50 dark:bg-gray-900 p-1 rounded-xl overflow-x-auto flex-nowrap w-full justify-start">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-lg min-h-[36px] text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm whitespace-nowrap dark:text-gray-400 dark:data-[state=active]:text-white"
                >
                  {tab.label}
                  <span className="ml-1 text-[10px] opacity-60">
                    ({periodFilteredOrders.filter((o) => tab.value === "PREPARING" ? (o.status === "ACCEPTED" || o.status === "PREPARING") : o.status === tab.value).length})
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Empty state */}
        {searchedOrders.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium dark:text-gray-300">No orders found</p>
            <p className="text-sm mt-1 dark:text-gray-400">
              {searchTerm
                ? "Try a different search term or adjust filters."
                : "Orders will appear here when customers place them."}
            </p>
          </div>
        ) : (
          <>
            {/* ─── MOBILE: Order Cards ─── */}
            <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800">
              {paginatedOrders.map((order) => {
                const isExpanded = expandedOrder === order.id;
                return (
                  <div key={order.id} className="p-4">
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm truncate dark:text-white">{order.user?.name || "Unknown"}</span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">#{order.id.slice(0, 6)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{getItemSummary(order)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {getStatusBadge(order.status)}
                      </div>
                    </div>

                    {/* Card Meta */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold">₱{order.total.toFixed(2)}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {getPaymentIcon(order.paymentMethod)}
                          <span>{getPaymentLabel(order.paymentMethod)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.user?.phone && (
                          <Button
                            asChild
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full text-blue-600"
                            aria-label="Call customer"
                          >
                            <a href={`tel:${normalizePhoneForDialing(order.user.phone)}`}>
                              <Phone className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full"
                          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                          aria-label={isExpanded ? "Collapse details" : "Expand details"}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Expandable Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Time</span>
                          <span className="font-medium">{formatTime(order.createdAt)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Items</span>
                          <span className="font-medium text-right">{getItemSummary(order)}</span>
                        </div>
                        {order.address && (
                          <div className="flex items-start justify-between text-xs">
                            <span className="text-muted-foreground">Address</span>
                            <span className="font-medium text-right max-w-[200px]">
                              {order.address.street}, {order.address.barangay}
                            </span>
                          </div>
                        )}
                        {order.notes && (
                          <div className="flex items-start justify-between text-xs">
                            <span className="text-muted-foreground">Notes</span>
                            <span className="font-medium text-right max-w-[200px]">{order.notes}</span>
                          </div>
                        )}
                        {order.items && order.items.length > 0 && (
                          <div className="border-t pt-2">
                            <p className="text-xs font-bold text-muted-foreground mb-2">Items</p>
                            {order.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-xs py-1">
                                <span>{item.quantity}x {item.product?.name || "Water"}</span>
                                <span className="font-medium">₱{(item.unitPrice * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between text-sm font-bold pt-2 border-t mt-2">
                              <span>Total</span>
                              <span className="text-blue-600">₱{order.total.toFixed(2)}</span>
                            </div>
                          </div>
                        )}

                        {/* Mobile Status Actions */}
                        {nextStatuses(order.status).length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {nextStatuses(order.status).map((action) => (
                              <Button
                                key={action.value}
                                size="sm"
                                variant={action.value === "CANCELLED" ? "destructive" : "default"}
                                className="rounded-xl text-xs min-h-[44px] flex-1"
                                onClick={() => {
                                  updateStatus(order.id, action.value);
                                  setExpandedOrder(null);
                                }}
                                disabled={updatingId === order.id}
                              >
                                {updatingId === order.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : null}
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        )}

                        {/* Mobile Driver Assignment */}
                        <div className="pt-2 border-t dark:border-gray-700">
                          <p className="text-xs font-bold text-muted-foreground mb-2">Driver</p>
                          {order.driver ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium dark:text-gray-200">
                                  {order.driver.name}
                                </span>
                                <Badge variant="outline" className="text-[10px]">
                                  {order.driver.role}
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-red-500 h-8"
                                onClick={() => assignDriver(order.id, null)}
                                disabled={assigningId === order.id}
                              >
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not assigned</span>
                          )}
                          {staffMembers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {staffMembers
                                .filter((s) => s.id !== order.driverId)
                                .map((staff) => (
                                  <Button
                                    key={staff.id}
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl text-xs h-8"
                                    onClick={() => assignDriver(order.id, staff.id)}
                                    disabled={assigningId === order.id}
                                  >
                                    <Truck className="h-3 w-3 mr-1" />
                                    {staff.name}
                                  </Button>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ─── DESKTOP: Table ─── */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="hidden lg:table-cell">Driver</TableHead>
                    <TableHead className="hidden lg:table-cell">Payment</TableHead>
                    <TableHead className="hidden lg:table-cell">Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 cursor-pointer"
                      onClick={() => setDetailOrder(order)}
                    >
                      <TableCell className="font-mono text-xs dark:text-gray-300">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm dark:text-white">{order.user?.name || "Unknown"}</span>
                          <span className="text-[10px] text-muted-foreground">{order.user?.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px]">
                        <span className="truncate block dark:text-gray-300">{getItemSummary(order)}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {order.driver ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium dark:text-gray-300">
                              {order.driver.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 dark:border-gray-600 dark:text-gray-400">
                              {order.driver.role}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          {getPaymentIcon(order.paymentMethod)}
                          <span className="text-xs font-medium">{getPaymentLabel(order.paymentMethod)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                        {formatTime(order.createdAt)}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full"
                            onClick={() => setDetailOrder(order)}
                            aria-label="View order details"
                          >
                            <Info className="h-4 w-4 text-gray-500" />
                          </Button>
                          {order.user?.phone && (
                            <Button
                              asChild
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full text-blue-600"
                              aria-label="Call customer"
                            >
                              <a href={`tel:${normalizePhoneForDialing(order.user.phone)}`}>
                                <Phone className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl w-52">
                              <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {nextStatuses(order.status).map((action) => (
                                <DropdownMenuItem
                                  key={action.value}
                                  className="flex items-center gap-2 cursor-pointer min-h-[44px]"
                                  onClick={() => updateStatus(order.id, action.value)}
                                  disabled={updatingId === order.id}
                                >
                                  {action.value === "CANCELLED" ? (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  ) : action.value === "DELIVERED" ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Truck className="h-4 w-4 text-blue-500" />
                                  )}
                                  <span>{action.label}</span>
                                </DropdownMenuItem>
                              ))}
                              {nextStatuses(order.status).length === 0 && (
                                <p className="text-xs text-gray-400 px-2 py-1">No further actions</p>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Assign Driver</DropdownMenuLabel>
                              {staffMembers.length === 0 && (
                                <p className="text-xs text-gray-400 px-2 py-1">No drivers available</p>
                              )}
                              <DropdownMenuItem
                                className="flex items-center gap-2 cursor-pointer min-h-[44px]"
                                onClick={() => assignDriver(order.id, null)}
                                disabled={assigningId === order.id || !order.driverId}
                              >
                                <XCircle className="h-4 w-4 text-gray-400" />
                                <span>Unassign</span>
                              </DropdownMenuItem>
                              {staffMembers.map((staff) => (
                                <DropdownMenuItem
                                  key={staff.id}
                                  className="flex items-center gap-2 cursor-pointer min-h-[44px]"
                                  onClick={() => assignDriver(order.id, staff.id)}
                                  disabled={assigningId === order.id || order.driverId === staff.id}
                                >
                                  <Truck className={`h-4 w-4 ${order.driverId === staff.id ? "text-green-500" : "text-blue-400"}`} />
                                  <span>{staff.name}</span>
                                  <Badge variant="outline" className="text-[10px] ml-auto">{staff.role}</Badge>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-4 border-t dark:border-gray-700 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                  <span className="hidden sm:inline"> ({searchedOrders.length} total)</span>
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-lg"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="icon"
                        className={`h-9 w-9 rounded-lg text-xs ${currentPage === pageNum ? "bg-blue-600" : ""}`}
                        onClick={() => setCurrentPage(pageNum)}
                        aria-label={`Page ${pageNum}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-lg"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl max-h-[90vh] overflow-y-auto">
          {detailOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  Order Details
                  {getStatusBadge(detailOrder.status)}
                </DialogTitle>
                <DialogDescription>
                  ID: <span className="font-mono text-xs">{detailOrder.id}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Customer Info */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Customer</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold dark:text-white">{detailOrder.user?.name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">{detailOrder.user?.phone}</p>
                    </div>
                    {detailOrder.user?.phone && (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="rounded-full min-h-[44px] dark:border-gray-600 dark:text-gray-300"
                      >
                        <a href={`tel:${normalizePhoneForDialing(detailOrder.user.phone)}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Order Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Clock className="h-3 w-3" />
                      Ordered
                    </div>
                    <p className="text-sm font-bold dark:text-white">{formatDate(detailOrder.createdAt)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <CreditCard className="h-3 w-3" />
                      Payment
                    </div>
                    <p className="text-sm font-bold dark:text-white">{detailOrder.paymentMethod === "GCASH" ? "GCash" : "Cash on Delivery"}</p>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Items ({detailOrder.items?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {detailOrder.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{item.quantity}x</span>
                          <span className="text-sm dark:text-gray-300">{item.product?.name || "Water"}</span>
                        </div>
                        <span className="text-sm font-bold dark:text-white">₱{(item.unitPrice * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t dark:border-gray-700 pt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="dark:text-gray-300">₱{(detailOrder.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span className="dark:text-gray-300">{detailOrder.deliveryFee === 0 ? "FREE" : `₱${detailOrder.deliveryFee.toFixed(2)}`}</span>
                  </div>
                  <div className="flex items-center justify-between text-lg font-bold pt-2 border-t dark:border-gray-700">
                    <span className="dark:text-white">Total</span>
                    <span className="text-blue-600">₱{(detailOrder.total || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Delivery Address */}
                {detailOrder.address && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Delivery Address
                    </h4>
                    <p className="text-sm dark:text-gray-200">
                      {detailOrder.address.street}, {detailOrder.address.barangay},{" "}
                      {detailOrder.address.city}, {detailOrder.address.province}
                    </p>
                    {detailOrder.address.landmark && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Landmark: {detailOrder.address.landmark}
                      </p>
                    )}
                  </div>
                )}

                {/* Notes */}
                {detailOrder.notes && (
                  <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Notes
                    </h4>
                    <p className="text-sm dark:text-gray-200">{detailOrder.notes}</p>
                  </div>
                )}

                {/* Delivery Evidence (optional photo — before customer confirmation) */}
                {detailOrder.status === "DELIVERED" &&
                  (detailOrder.deliveryPhoto || !detailOrder.deliveryConfirmedAt) && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      Delivery Evidence
                    </h4>
                    {detailOrder.deliveryPhoto ? (
                      <a
                        href={detailOrder.deliveryPhoto}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 underline font-medium"
                      >
                        View delivery photo
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="text-xs max-w-[180px] dark:text-gray-300"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            if (f) {
                              if (!f.type.startsWith("image/")) {
                                toast.error("Please choose an image file (JPG, PNG, WebP).");
                              } else if (f.size > 2 * 1024 * 1024) {
                                toast.error("Photo is too large. Maximum size is 2MB.");
                              } else {
                                setDialogPhotoFile(f);
                              }
                            }
                            e.target.value = "";
                          }}
                        />
                        <Button
                          size="sm"
                          className="rounded-xl min-h-[40px]"
                          onClick={() => dialogPhotoFile && uploadDeliveryPhoto(detailOrder, dialogPhotoFile)}
                          disabled={!dialogPhotoFile || (photoUploading && photoUploadingFor === detailOrder.id)}
                        >
                          {photoUploading && photoUploadingFor === detailOrder.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : null}
                          {photoUploading && photoUploadingFor === detailOrder.id ? "Uploading..." : "Upload"}
                        </Button>
                      </div>
                    )}
                    {dialogPhotoFile && !detailOrder.deliveryPhoto && (
                      <p className="text-xs text-muted-foreground truncate">
                        Selected: {dialogPhotoFile.name}
                      </p>
                    )}
                    {detailOrder.deliveryConfirmedAt && (
                      <p className="text-xs text-muted-foreground">
                        Customer confirmed this delivery — photo window closed.
                      </p>
                    )}
                  </div>
                )}

                {/* Update Status */}
                {nextStatuses(detailOrder.status).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Update Status
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {nextStatuses(detailOrder.status).map((action) => (
                        <Button
                          key={action.value}
                          size="sm"
                          variant={action.value === "CANCELLED" ? "destructive" : "default"}
                          className="rounded-xl min-h-[44px]"
                          onClick={() => {
                            updateStatus(detailOrder.id, action.value);
                            setDetailOrder(null);
                          }}
                          disabled={updatingId === detailOrder.id}
                        >
                          {updatingId === detailOrder.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          {action.label}
                        </Button>
                      ))}
                    </div>
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