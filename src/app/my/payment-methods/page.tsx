"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CreditCard, Plus, Smartphone, Trash2, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import toast from "react-hot-toast";

interface PaymentMethod {
  id: string;
  type: string;
  details: {
    number?: string;
    name?: string;
    phone?: string;
    expiry?: string;
  };
  isDefault: boolean;
  createdAt: string;
}

const METHOD_ICONS: Record<string, { icon: string; bg: string; color: string }> = {
  GCASH: { icon: "📱", bg: "bg-blue-50 dark:bg-blue-900/30", color: "text-blue-600 dark:text-blue-400" },
  CARD: { icon: "💳", bg: "bg-purple-50 dark:bg-purple-900/30", color: "text-purple-600 dark:text-purple-400" },
  PAYMAYA: { icon: "🟣", bg: "bg-violet-50 dark:bg-violet-900/30", color: "text-violet-600 dark:text-violet-400" },
  COD: { icon: "💵", bg: "bg-green-50 dark:bg-green-900/30", color: "text-green-600 dark:text-green-400" },
};

export default function PaymentMethodsPage() {
  const router = useRouter();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMethod, setNewMethod] = useState({ type: "GCASH", details: "" });
  const [isAdding, setIsAdding] = useState(false);

  const fetchMethods = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/payment-methods");
      if (!res.ok) throw new Error("Failed to fetch payment methods");
      const json = await res.json();
      if (json.success) {
        setMethods(json.data || []);
      } else {
        throw new Error(json.error || "Hindi makuha ang data");
      }
    } catch (err: any) {
      setError("Hindi makuha ang payment methods. Pakisubukan muli.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const handleDelete = async (methodId: string) => {
    if (!confirm("Remove this payment method?")) return;
    setDeletingId(methodId);
    try {
      const res = await fetch(`/api/user/payment-methods?id=${methodId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Payment method removed.");
        fetchMethods();
      } else {
        throw new Error(json.error || "Failed to remove");
      }
    } catch (err: any) {
      toast.error(err.message || "May error. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdd = async () => {
    if (!newMethod.details.trim()) {
      toast.error("Please enter payment details.");
      return;
    }
    setIsAdding(true);
    try {
      const details = newMethod.type === "GCASH" || newMethod.type === "PAYMAYA"
        ? { phone: newMethod.details }
        : { number: newMethod.details, name: "Card" };
      
      const res = await fetch("/api/user/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newMethod.type, details }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Payment method added!");
        setShowAddForm(false);
        setNewMethod({ type: "GCASH", details: "" });
        fetchMethods();
      } else {
        throw new Error(json.error || "Failed to add");
      }
    } catch (err: any) {
      toast.error(err.message || "May error. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card sticky top-0 z-30 border-b border-border px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]" onClick={() => router.push("/")} aria-label="Go back to home">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-card-foreground">Payment Methods</h1>
        </div>
        <Button
          size="sm"
          className="rounded-full min-h-[44px]"
          onClick={() => setShowAddForm(true)}
          aria-label="Add payment method"
        >
          <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
          Add
        </Button>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Add Form */}
        {showAddForm && (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-4">
            <h3 className="font-bold text-sm text-card-foreground">Add Payment Method</h3>
            <div className="flex gap-2">
              {["GCASH", "PAYMAYA", "CARD"].map((type) => (
                <button
                  key={type}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all min-h-[44px] ${
                    newMethod.type === type
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  onClick={() => setNewMethod({ ...newMethod, type })}
                  aria-label={`Select ${type}`}
                >
                  {type === "GCASH" ? "📱 GCash" : type === "PAYMAYA" ? "🟣 PayMaya" : "💳 Card"}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-bold mb-1 block">
                {newMethod.type === "CARD" ? "Card Number" : "Phone Number"}
              </label>
              <input
                type={newMethod.type === "CARD" ? "text" : "tel"}
                placeholder={newMethod.type === "CARD" ? "**** **** **** ****" : "0917 XXX XXXX"}
                value={newMethod.details}
                onChange={(e) => setNewMethod({ ...newMethod, details: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-muted text-sm outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl min-h-[44px]" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button className="flex-1 rounded-xl min-h-[44px]" onClick={handleAdd} disabled={isAdding}>
                {isAdding ? "Adding..." : "Save"}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4" role="status" aria-label="Loading payment methods">
            {[1, 2].map((i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-4 animate-pulse">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
            <span className="sr-only">Loading payment methods...</span>
          </div>
        ) : error ? (
          <ErrorState title="Hindi ma-load ang payment methods" message={error} onRetry={fetchMethods} />
        ) : methods.length > 0 ? (
          methods.map((method) => {
            const meta = METHOD_ICONS[method.type] || METHOD_ICONS.COD;
            return (
              <div key={method.id} className="bg-card rounded-2xl border border-border shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-xl ${meta.bg} flex items-center justify-center text-xl ${meta.color}`}>
                      <span aria-hidden="true">{meta.icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-card-foreground">{method.type}</p>
                        {method.isDefault && (
                          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {method.type === "CARD"
                          ? `**** ${method.details?.number?.slice(-4) || "Card"}`
                          : method.details?.phone || method.details?.number || "Saved"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full min-h-[44px]"
                        onClick={() => handleDelete(method.id)}
                        disabled={deletingId === method.id}
                        aria-label="Remove payment method"
                      >
                        {deletingId === method.id ? (
                          "..."
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-400" aria-hidden="true" />
                        )}
                      </Button>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground/50" aria-hidden="true" />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
            <div className="h-16 w-16 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-purple-200 dark:text-purple-400" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-card-foreground mb-1">No payment methods</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Add a payment method for faster checkout.
            </p>
            <Button
              className="rounded-2xl px-8 min-h-[44px]"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
              Add Payment Method
            </Button>
          </div>
        )}

        {/* COD is always available */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30 p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xl">
              <span aria-hidden="true">💵</span>
            </div>
            <div>
              <p className="font-bold text-card-foreground">Cash on Delivery</p>
              <p className="text-xs text-muted-foreground">Always available as a payment option</p>
            </div>
            <Badge className="ml-auto bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px]">
              <Check className="h-3 w-3 mr-0.5" aria-hidden="true" />
              Available
            </Badge>
          </div>
        </div>
      </main>
    </div>
  );
}