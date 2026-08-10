"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  MapPin, Phone, Package, CheckCircle2, Truck,
  Loader2, RefreshCw, Navigation, ClipboardList,
  ChevronDown, ChevronUp, Clock, Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import toast from "react-hot-toast";
import { normalizePhoneForDialing } from "@/lib/phone";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  product: { name: string; price: number };
}

interface OrderAddress {
  street: string;
  barangay: string;
  city: string;
  province: string;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface DriverOrder {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  paymentMethod: string;
  notes: string | null;
  deliveryOrder: number | null;
  deliveryPhoto: string | null;
  deliveryConfirmedAt: string | null;
  items: OrderItem[];
  user: { name: string; phone: string };
  address: OrderAddress;
  createdAt: string;
}

interface BarangayGroup {
  barangay: string;
  count: number;
  orders: DriverOrder[];
}

interface DriverData {
  date: string;
  summary: { total: number; completed: number; remaining: number };
  grouped: BarangayGroup[];
}

export default function DriverDashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DriverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // Optional delivery evidence photo (station staff/driver only, before confirmation)
  const [photoFiles, setPhotoFiles] = useState<Record<string, File | null>>({});
  const [photoTargetOrder, setPhotoTargetOrder] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/driver/orders");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        // Auto-expand all groups with non-delivered orders
        const toExpand = new Set<string>();
        for (const g of json.data.grouped) {
          const hasActive = g.orders.some(
            (o: DriverOrder) => o.status !== "DELIVERED"
          );
          if (hasActive) toExpand.add(g.barangay);
        }
        setExpandedGroups(toExpand);
      } else {
        toast.error(json.error || "Failed to load deliveries");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) {
      router.push("/auth/login");
      return;
    }
    const staffRole = (session.user as any)?.staffRole;
    if (!staffRole) {
      router.push("/dashboard");
      return;
    }
    fetchOrders();
  }, [session, sessionStatus, router, fetchOrders]);

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
        toast.success(`Order ${status.toLowerCase().replace(/_/g, " ")}!`);
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
  const uploadDeliveryPhoto = async (orderId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/orders/${orderId}/delivery-photo`, {
      method: "POST",
      body: fd,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Upload failed");
    return json.data;
  };
  const triggerPhotoPick = (orderId: string) => {
    setPhotoTargetOrder(orderId);
    photoInputRef.current?.click();
  };
  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && photoTargetOrder) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please choose an image file (JPG, PNG, WebP).");
      } else if (file.size > 2 * 1024 * 1024) {
        toast.error("Photo is too large. Maximum size is 2MB.");
      } else {
        setPhotoFiles((prev) => ({ ...prev, [photoTargetOrder]: file }));
        toast.success("Photo attached — will upload when you mark delivered");
      }
    }
    e.target.value = "";
  };
  const handleMarkDelivered = async (order: DriverOrder) => {
    setUpdatingId(order.id);
    try {
      const res = await fetch(`/api/dashboard/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DELIVERED" }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Failed to update");
        return;
      }
      toast.success("Order delivered!");
      const photo = photoFiles[order.id];
      if (photo) {
        try {
          await uploadDeliveryPhoto(order.id, photo);
          setPhotoFiles((prev) => ({ ...prev, [order.id]: null }));
          toast.success("Delivery photo attached");
        } catch (err: any) {
          toast.error(err.message || "Order delivered, but photo upload failed");
        }
      }
      fetchOrders();
    } catch {
      toast.error("Network error");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleGroup = (barangay: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(barangay)) next.delete(barangay);
      else next.add(barangay);
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
      case "ACCEPTED":
      case "PREPARING":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-500 text-xs">
            Pending
          </Badge>
        );
      case "OUT_FOR_DELIVERY":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-500 text-xs">
            Delivering
          </Badge>
        );
      case "DELIVERED":
        return (
          <Badge className="bg-green-500 hover:bg-green-500 text-xs">
            Delivered
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getItemSummary = (order: DriverOrder) => {
    if (!order.items?.length) return "—";
    return order.items
      .map((i) => `${i.quantity}x ${i.product?.name || "Water"}`)
      .join(", ");
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Hidden file input for optional delivery evidence photo */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handlePhotoSelected}
        aria-hidden="true"
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Deliveries</h1>
          <p className="text-sm text-muted-foreground">
            {data?.summary.total || 0} deliveries today
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl min-h-[44px]"
          onClick={fetchOrders}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {data?.summary.total || 0}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Total
            </p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {data?.summary.completed || 0}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
              Done
            </p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {data?.summary.remaining || 0}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
              Left
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {(!data?.grouped || data.grouped.length === 0) && (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <ClipboardList className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg font-medium dark:text-gray-300">
            No deliveries assigned yet
          </p>
          <p className="text-sm mt-1 dark:text-gray-400">
            Your assigned deliveries will appear here.
          </p>
        </div>
      )}

      {/* Barangay Groups */}
      {data?.grouped.map((group) => {
        const isExpanded = expandedGroups.has(group.barangay);
        const activeCount = group.orders.filter(
          (o) => o.status !== "DELIVERED"
        ).length;

        return (
          <div
            key={group.barangay}
            className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm overflow-hidden"
          >
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.barangay)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 dark:text-white">
                    {group.barangay}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {group.count} order{group.count !== 1 ? "s" : ""}
                    {activeCount > 0 && (
                      <span className="text-orange-500 font-medium">
                        {" "}
                        • {activeCount} remaining
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {activeCount > 0 && (
                  <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs">
                    {activeCount}
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </button>

            {/* Orders in group */}
            {isExpanded && (
              <div className="divide-y divide-gray-100 dark:divide-gray-700 border-t dark:border-gray-700">
                {group.orders.map((order) => (
                  <div key={order.id} className="p-4 space-y-3">
                    {/* Order Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
                            {order.user?.name || "Customer"}
                          </span>
                          {order.deliveryOrder != null && (
                            <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                              #{order.deliveryOrder}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {getItemSummary(order)}
                        </p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {order.address.street}, {order.address.barangay}
                        </p>
                        {order.address.landmark && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Near: {order.address.landmark}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="flex items-start gap-2">
                        <ClipboardList className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-2 py-1">
                          {order.notes}
                        </p>
                      </div>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                          ₱{order.total.toFixed(2)}
                        </span>
                        <span>{order.paymentMethod === "GCASH" ? "GCash" : "COD"}</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {order.user?.phone && (
                          <Button
                            asChild
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 rounded-full text-blue-600"
                            aria-label="Call customer"
                          >
                            <a href={`tel:${normalizePhoneForDialing(order.user.phone)}`}>
                              <Phone className="h-4 w-4" />
                            </a>
                          </Button>
                        )}

                        {order.status === "PENDING" ||
                        order.status === "ACCEPTED" ||
                        order.status === "PREPARING" ? (
                          <Button
                            size="sm"
                            className="rounded-xl min-h-[40px] bg-blue-600 hover:bg-blue-700 text-xs"
                            onClick={() =>
                              updateStatus(order.id, "OUT_FOR_DELIVERY")
                            }
                            disabled={updatingId === order.id}
                          >
                            {updatingId === order.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Truck className="h-3 w-3 mr-1" />
                            )}
                            Start Delivery
                          </Button>
                        ) : order.status === "OUT_FOR_DELIVERY" ? (
                          <>
                            {photoFiles[order.id] ? (
                              <span
                                className="text-[10px] text-blue-600 dark:text-blue-400 max-w-[90px] truncate font-medium"
                                title={photoFiles[order.id]?.name || "Photo attached"}
                              >
                                Photo ready
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl min-h-[40px] text-xs"
                                onClick={() => triggerPhotoPick(order.id)}
                                disabled={updatingId === order.id}
                                aria-label="Attach delivery photo"
                              >
                                <Camera className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="rounded-xl min-h-[40px] bg-green-600 hover:bg-green-700 text-xs"
                              onClick={() => handleMarkDelivered(order)}
                              disabled={updatingId === order.id}
                            >
                              {updatingId === order.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              )}
                              Delivered
                            </Button>
                          </>
                        ) : order.status === "DELIVERED" ? (
                          order.deliveryPhoto ? (
                            <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
                              <Camera className="h-3.5 w-3.5" />
                              Photo attached
                            </span>
                          ) : !order.deliveryConfirmedAt ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl min-h-[40px] text-xs"
                              onClick={() => triggerPhotoPick(order.id)}
                              disabled={updatingId === order.id}
                              aria-label="Add delivery photo"
                            >
                              <Camera className="h-3.5 w-3.5 mr-1" />
                              Add Photo
                            </Button>
                          ) : null
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
